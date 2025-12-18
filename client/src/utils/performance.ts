// Debounce and throttle functions for performance optimization

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T {
  let timeout: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  let lastInvokeTime = 0;
  let lastArgs: any[] | undefined;
  let lastThis: any;
  let result: any;

  const { leading = false, trailing = true } = options;

  function invokeFunc(time: number) {
    const args = lastArgs!;
    const thisArg = lastThis;
    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    
    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (trailing && timeSinceLastInvoke >= wait)
    );
  }

  function trailingEdge(time: number) {
    timeout = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    const remaining = wait - (time - lastCallTime);
    timeout = setTimeout(timerExpired, remaining);
  }

  function leadingEdge(time: number) {
    lastInvokeTime = time;
    timeout = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }

  function debounced(this: any, ...args: any[]) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    
    lastArgs = args;
    lastThis = this;
    lastCallTime = time;
    
    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(lastCallTime);
      }
      if (leading) {
        timeout = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    
    if (timeout === null) {
      timeout = setTimeout(timerExpired, wait);
    }
    
    return result;
  }

  debounced.cancel = function() {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastCallTime = 0;
    lastThis = undefined;
    timeout = null;
  };

  debounced.flush = function() {
    return timeout === null ? result : trailingEdge(Date.now());
  };

  return debounced as unknown as T;
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T {
  let leading = true;
  let trailing = true;
  
  if (typeof options !== 'function') {
    if (options.leading === false) leading = false;
    if (options.trailing === false) trailing = false;
  }

  return debounce(func, wait, { leading, trailing });
}
