// Global rate limiting and request throttling system
interface PendingRequest {
  url: string;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retryCount: number;
}

class RateLimiter {
  private pendingRequests = new Map<string, PendingRequest[]>();
  private requestHistory = new Map<string, number[]>();
  private readonly MAX_REQUESTS_PER_SECOND = 5;
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute

  constructor() {
    // Clean up old request history periodically
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  private cleanup() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    for (const [url, timestamps] of this.requestHistory.entries()) {
      const filtered = timestamps.filter(
        timestamp => timestamp > oneMinuteAgo
      );
      if (filtered.length === 0) {
        this.requestHistory.delete(url);
      } else {
        this.requestHistory.set(url, filtered);
      }
    }
  }

  private canMakeRequest(url: string): { canProceed: boolean; delay?: number } {
    const now = Date.now();
    const history = this.requestHistory.get(url) || [];
    
    // Check requests in last second
    const recentRequests = history.filter(timestamp => timestamp > now - 1000);
    if (recentRequests.length >= this.MAX_REQUESTS_PER_SECOND) {
      return { canProceed: false, delay: 1000 };
    }

    // Check requests in last minute
    const minuteRequests = history.filter(timestamp => timestamp > now - 60000);
    if (minuteRequests.length >= this.MAX_REQUESTS_PER_MINUTE) {
      return { canProceed: false, delay: 60000 };
    }

    return { canProceed: true };
  }

  private recordRequest(url: string) {
    const history = this.requestHistory.get(url) || [];
    history.push(Date.now());
    this.requestHistory.set(url, history);
  }

  async executeRequest(url: string, requestFn: () => Promise<Response>): Promise<Response> {
    // Check rate limits
    const rateCheck = this.canMakeRequest(url);
    if (!rateCheck.canProceed && rateCheck.delay) {
      await new Promise(resolve => setTimeout(resolve, rateCheck.delay));
    }

    // Check if there's already a pending request for the same URL
    const pending = this.pendingRequests.get(url);
    if (pending && pending.length > 0) {
      return new Promise((resolve, reject) => {
        pending.push({
          url,
          resolve,
          reject,
          timestamp: Date.now(),
          retryCount: 0
        });
      });
    }

    // Create new pending request queue
    this.pendingRequests.set(url, []);

    try {
      this.recordRequest(url);
      const response = await this.executeWithRetry(url, requestFn);
      
      // Resolve all pending requests for this URL
      const pendingRequests = this.pendingRequests.get(url) || [];
      pendingRequests.forEach(req => req.resolve(response.clone()));
      this.pendingRequests.delete(url);
      
      return response;
    } catch (error) {
      // Reject all pending requests for this URL
      const pendingRequests = this.pendingRequests.get(url) || [];
      pendingRequests.forEach(req => req.reject(error as Error));
      this.pendingRequests.delete(url);
      throw error;
    }
  }

  private async executeWithRetry(url: string, requestFn: () => Promise<Response>, maxRetries: number = 3): Promise<Response> {
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        const response = await requestFn();
        
        if (response.status === 429) {
          retryCount++;
          
          // Check for Retry-After header
          const retryAfter = response.headers.get('Retry-After');
          let delay = this.calculateBackoffDelay(retryCount);
          
          if (retryAfter) {
            // Handle Retry-After header (can be seconds or HTTP date)
            if (/^\d+$/.test(retryAfter)) {
              delay = parseInt(retryAfter) * 1000;
            } else {
              const retryDate = new Date(retryAfter);
              if (!isNaN(retryDate.getTime())) {
                delay = retryDate.getTime() - Date.now();
              }
            }
          }
          
          // Cap delay at 5 minutes
          delay = Math.min(Math.max(delay, 1000), 300000);
          
          console.log(`Rate limited for ${url}. Retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return response;
      } catch (error) {
        if (retryCount >= maxRetries) throw error;
        retryCount++;
        const delay = this.calculateBackoffDelay(retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  private calculateBackoffDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000 * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return baseDelay + jitter;
  }
}

// Global rate limiter instance
const globalRateLimiter = new RateLimiter();

// Enhanced fetch with rate limiting
export const fetchWithRateLimit = async (url: string, options?: RequestInit): Promise<Response> => {
  return globalRateLimiter.executeRequest(url, () => fetch(url, options));
};

export default globalRateLimiter;
