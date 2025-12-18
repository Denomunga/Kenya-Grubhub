import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import * as React from 'react';
import { debounce, throttle } from '@/utils/performance';

// Intersection Observer for lazy loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {},
  freezeOnceVisible = false
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);
  const frozen = useRef(false);

  const updateEntry = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    
    if (frozen.current && entry.isIntersecting) return;
    
    setEntry(entry);
    setIsVisible(entry.isIntersecting);
    
    if (entry.isIntersecting && !hasBeenVisible) {
      setHasBeenVisible(true);
      if (freezeOnceVisible) {
        frozen.current = true;
      }
    }
  }, [freezeOnceVisible, hasBeenVisible]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(updateEntry, options);
    observer.observe(element);

    return () => observer.disconnect();
  }, [updateEntry, options]);

  return {
    ref: elementRef,
    entry,
    isVisible,
    hasBeenVisible
  };
}

// Debounced scroll handler
export function useDebouncedScroll<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100
): T {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay, { leading: false, trailing: true }) as T & { cancel?: () => void },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      debouncedCallback?.cancel?.();
    };
  }, [debouncedCallback]);

  return debouncedCallback as T;
}

// Throttled scroll handler
export function useThrottledScroll<T extends (...args: any[]) => any>(
  callback: T,
  limit: number = 16
): T {
  const throttledCallback = useMemo(
    () => throttle(callback, limit, { leading: true, trailing: false }) as T & { cancel?: () => void },
    [callback, limit]
  );

  useEffect(() => {
    return () => {
      throttledCallback?.cancel?.();
    };
  }, [throttledCallback]);

  return throttledCallback as T;
}

// Optimized image lazy loading
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { ref, isVisible } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px'
  });

  useEffect(() => {
    if (isVisible && !imageLoaded && !imageError && src !== imageSrc) {
      const img = new Image();
      img.src = src;
      
      img.onload = () => {
        setImageSrc(src);
        setImageLoaded(true);
      };
      
      img.onerror = () => {
        setImageError(true);
      };
    }
  }, [isVisible, src, imageLoaded, imageError, imageSrc]);

  return {
    ref,
    imageSrc,
    imageLoaded,
    imageError
  };
}

// Memoized component wrapper
export function withMemo<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) {
  const MemoizedComponent = React.memo(Component, areEqual);
  MemoizedComponent.displayName = `withMemo(${Component.displayName || Component.name})`;
  return MemoizedComponent;
}

// Performance monitoring hook
export function usePerformanceMonitor(name: string) {
  const startTime = useRef<number>(0);
  const measurements = useRef<Array<{ name: string; duration: number; timestamp: number }>>([]);

  const startMeasurement = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endMeasurement = useCallback((measurementName?: string) => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      measurements.current.push({
        name: measurementName || name,
        duration,
        timestamp: Date.now()
      });
      
      // Log slow operations
      if (duration > 100) {
        console.warn(`Slow operation detected: ${measurementName || name} took ${duration.toFixed(2)}ms`);
      }
      
      startTime.current = 0;
    }
  }, [name]);

  const getMeasurements = useCallback(() => {
    return measurements.current;
  }, []);

  const clearMeasurements = useCallback(() => {
    measurements.current = [];
  }, []);

  return {
    startMeasurement,
    endMeasurement,
    getMeasurements,
    clearMeasurements
  };
}

// Virtual scrolling for large lists
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }));
  }, [items, startIndex, endIndex]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    startIndex,
    endIndex,
    scrollElementRef,
    handleScroll,
    offsetY: startIndex * itemHeight
  };
}

// Optimized animation hook with will-change
export function useOptimizedAnimation(shouldAnimate: boolean = true) {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (shouldAnimate) {
      element.style.willChange = 'transform, opacity';
    } else {
      element.style.willChange = 'auto';
    }

    return () => {
      if (element) {
        element.style.willChange = 'auto';
      }
    };
  }, [shouldAnimate]);

  return elementRef;
}

// CSS Containment hook
export function useCSSContainment(containment: string = 'layout style paint') {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.style.contain = containment;

    return () => {
      if (element) {
        element.style.contain = 'auto';
      }
    };
  }, [containment]);

  return elementRef;
}

// RequestAnimationFrame optimization
export function useRAFCallback<T extends (...args: any[]) => any>(callback: T): T {
  const rafId = useRef<number | null>(null);
  const argsRef = useRef<any[] | undefined>(undefined);

  const runCallback = useCallback((...args: any[]) => {
    argsRef.current = args;
    
    if (rafId.current) {
      return;
    }

    rafId.current = requestAnimationFrame(() => {
      callback(...(argsRef.current || []));
      rafId.current = null;
    });
  }, [callback]);

  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return runCallback as T;
}

// Memory leak prevention
export function useAsyncEffect(
  effect: () => Promise<void> | Promise<() => void>,
  deps: React.DependencyList
) {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    effect().then((result) => {
      if (!cancelled) {
        cleanup = typeof result === 'function' ? result : undefined;
      }
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, deps);
}

// Optimized resize observer
export function useResizeObserver(
  callback: (entries: ResizeObserverEntry[]) => void,
  options: ResizeObserverOptions = {}
) {
  const elementRef = useRef<HTMLElement>(null);
  const callbackRef = useRef(callback);

  // Update callback ref without causing re-renders
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      callbackRef.current(entries);
    });

    resizeObserver.observe(element, options);

    return () => {
      resizeObserver.disconnect();
    };
  }, [options]);

  return elementRef;
}

// Bundle size monitoring
export function useBundleSizeMonitor() {
  const [bundleSize, setBundleSize] = useState(0);

  useEffect(() => {
    // Monitor bundle size in development
    if (process.env.NODE_ENV === 'development') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource' && entry.name.includes('.js')) {
            setBundleSize(prev => prev + ((entry as any).transferSize || 0));
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });

      return () => observer.disconnect();
    }
  }, []);

  return bundleSize;
}

// FPS Monitor
export function useFPSMonitor() {
  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animationId: number;

    const measureFPS = (currentTime: number) => {
      frameCount.current++;

      if (currentTime >= lastTime.current + 1000) {
        setFps(Math.round((frameCount.current * 1000) / (currentTime - lastTime.current)));
        frameCount.current = 0;
        lastTime.current = currentTime;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return fps;
}

// Web Workers for heavy computations
export function useWebWorker<T, R>(
  workerFunction: (data: T) => R,
  dependencies: React.DependencyList = []
) {
  const [result, setResult] = useState<R | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const worker = useMemo(() => {
    const blob = new Blob([`self.onmessage = function(e) { 
      try {
        const result = (${workerFunction.toString()})(e.data);
        self.postMessage({ success: true, result });
      } catch (error) {
        self.postMessage({ success: false, error: error.message });
      }
    }`], { type: 'application/javascript' });
    
    return new Worker(URL.createObjectURL(blob));
  }, dependencies);

  const execute = useCallback((data: T) => {
    setLoading(true);
    setError(null);

    worker.postMessage(data);

    return new Promise<R>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent) => {
        setLoading(false);
        if (e.data.success) {
          setResult(e.data.result);
          resolve(e.data.result);
        } else {
          setError(new Error(e.data.error));
          reject(new Error(e.data.error));
        }
      };
    });
  }, [worker]);

  useEffect(() => {
    return () => {
      worker.terminate();
    };
  }, [worker]);

  return { execute, result, loading, error };
}
