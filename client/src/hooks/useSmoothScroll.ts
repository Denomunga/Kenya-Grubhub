import { useState, useEffect, useRef, useCallback } from 'react';
import * as React from 'react';
import { useScroll, useSpring, useTransform, useAnimation } from 'framer-motion';

interface ScrollPosition {
  x: number;
  y: number;
  progress: number;
  direction: 'up' | 'down' | 'none';
  velocity: number;
}

interface ScrollOptions {
  smooth?: boolean;
  duration?: number;
  easing?: string;
  offset?: number;
}

export function useSmoothScroll(options: ScrollOptions = {}) {
  // Use options to prevent unused variable warning
  const { duration = 800, easing = 'ease-in-out', offset = 0 } = options;
  void duration;
  void easing;
  void offset;

  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    x: 0,
    y: 0,
    progress: 0,
    direction: 'none',
    velocity: 0
  });

  const lastScrollY = useRef(0);
  const scrollVelocity = useRef(0);
  const rafId = useRef<number | null>(null);
  const isScrolling = useRef(false);

  const { scrollYProgress } = useScroll();
  const smoothScrollY = useSpring(scrollYProgress, {
    stiffness: 400,
    damping: 40,
    restDelta: 0.001
  });

  // Calculate scroll velocity and direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const deltaTime = Date.now() - (rafId.current || Date.now());
      
      if (deltaTime > 0) {
        scrollVelocity.current = Math.abs(currentScrollY - lastScrollY.current) / deltaTime * 100;
      }

      setScrollPosition({
        x: window.scrollX,
        y: currentScrollY,
        progress: currentScrollY / (document.documentElement.scrollHeight - window.innerHeight),
        direction: currentScrollY > lastScrollY.current ? 'down' : 
                  currentScrollY < lastScrollY.current ? 'up' : 'none',
        velocity: scrollVelocity.current
      });

      lastScrollY.current = currentScrollY;
      isScrolling.current = true;

      if (rafId.current !== null) {
      clearTimeout(rafId.current);
    }
      rafId.current = window.setTimeout(() => {
        isScrolling.current = false;
        scrollVelocity.current = 0;
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to element
  const scrollToElement = useCallback((element: HTMLElement | string, customOptions?: ScrollOptions) => {
    const opts = { ...options, ...customOptions };
    const targetElement = typeof element === 'string' ? document.querySelector(element) : element;
    
    if (!targetElement) return;

    const targetY = (targetElement as HTMLElement).offsetTop - opts.offset!;
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / opts.duration!, 1);

      // Easing functions
      let easedProgress = progress;
      switch (opts.easing) {
        case 'ease-in':
          easedProgress = progress * progress;
          break;
        case 'ease-out':
          easedProgress = 1 - Math.pow(1 - progress, 2);
          break;
        case 'ease-in-out':
          easedProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          break;
        default:
          easedProgress = progress;
      }

      const currentY = startY + distance * easedProgress;
      window.scrollTo(0, currentY);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  }, [options]);

  // Smooth scroll to position
  const scrollToPosition = useCallback((y: number, customOptions?: ScrollOptions) => {
    const opts = { ...options, ...customOptions };
    const startY = window.scrollY;
    const distance = y - startY;
    const startTime = performance.now();

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / opts.duration!, 1);

      let easedProgress = progress;
      switch (opts.easing) {
        case 'ease-in':
          easedProgress = progress * progress;
          break;
        case 'ease-out':
          easedProgress = 1 - Math.pow(1 - progress, 2);
          break;
        case 'ease-in-out':
          easedProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          break;
        default:
          easedProgress = progress;
      }

      const currentY = startY + distance * easedProgress;
      window.scrollTo(0, currentY);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  }, [options]);

  return {
    scrollPosition,
    smoothScrollY,
    scrollToElement,
    scrollToPosition,
    isScrolling: isScrolling.current
  };
}

// Scroll-triggered animation hook
export function useScrollTrigger(options: {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
} = {}) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);
  const controls = useAnimation();

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        setIsVisible(inView);
        
        if (inView && (!triggerOnce || !hasBeenVisible)) {
          controls.start('visible');
          setHasBeenVisible(true);
        } else if (!inView && !triggerOnce) {
          controls.start('hidden');
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [threshold, rootMargin, triggerOnce, hasBeenVisible, controls]);

  return {
    ref: elementRef,
    isVisible,
    controls,
    variants: {
      hidden: { opacity: 0, y: 50 },
      visible: { opacity: 1, y: 0 }
    }
  };
}

// Parallax effect hook
export function useParallax(speed: number = 0.5) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, speed * 1000]);

  return { y };
}

// Scroll progress indicator component (to be used in React components)
export const ScrollProgressIndicator = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 40,
    restDelta: 0.001
  });

  return React.createElement(
    'div',
    {
      className: 'fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary z-50 origin-left',
      style: { scaleX }
    }
  );
};

// Smooth scroll link component (to be used in React components)
interface SmoothScrollLinkComponentProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  offset?: number;
  duration?: number;
  onClick?: () => void;
}

export const SmoothScrollLinkComponent = ({ 
  href, 
  children, 
  className, 
  offset = 0, 
  duration = 800,
  onClick 
}: SmoothScrollLinkComponentProps) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Handle external links normally
    if (href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) {
      window.open(href, '_blank');
      return;
    }

    // Handle hash links
    if (href.startsWith('#')) {
      const targetId = href.slice(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        const targetY = targetElement.offsetTop - offset;
        const startY = window.scrollY;
        const distance = targetY - startY;
        const startTime = performance.now();

        const animateScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Ease-in-out animation
          const easedProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          const currentY = startY + distance * easedProgress;
          window.scrollTo(0, currentY);

          if (progress < 1) {
            requestAnimationFrame(animateScroll);
          }
        };

        requestAnimationFrame(animateScroll);
      }
    } else {
      // Handle internal navigation
      window.location.href = href;
    }

    onClick?.();
  }, [href, offset, duration, onClick]);

  return React.createElement(
    'a',
    { href, className, onClick: handleClick },
    children
  );
};
