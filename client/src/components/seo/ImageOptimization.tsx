import { useEffect, useRef } from 'react';

interface ImageOptimizationProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  fetchPriority = 'auto'
}: ImageOptimizationProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Add error handling
    const handleError = () => {
      img.src = '/placeholder-product.jpg'; // Fallback image
    };

    img.addEventListener('error', handleError);
    
    // Add loading optimization
    if (loading === 'lazy') {
      img.loading = 'lazy';
    }

    // Set fetch priority if specified
    if (fetchPriority !== 'auto') {
      img.fetchPriority = fetchPriority;
    }

    return () => {
      img.removeEventListener('error', handleError);
    };
  }, [loading, fetchPriority]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
    />
  );
}

// Hook for implementing lazy loading with Intersection Observer
export function useLazyLoading() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const observe = (element: HTMLImageElement) => {
    if (observerRef.current && element) {
      observerRef.current.observe(element);
    }
  };

  return { observe };
}

// Component for generating responsive image srcsets
export function ResponsiveImage({
  src,
  alt,
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  ...props
}: ImageOptimizationProps & { sizes?: string }) {
  // Generate srcset for different image sizes
  const generateSrcSet = (baseSrc: string) => {
    const widths = [320, 640, 768, 1024, 1280, 1536];
    return widths
      .map(width => `${baseSrc}?w=${width} ${width}w`)
      .join(', ');
  };

  return (
    <picture>
      <source
        type="image/webp"
        srcSet={generateSrcSet(src.replace(/\.(jpg|jpeg|png)$/i, '.webp'))}
        sizes={sizes}
      />
      <img
        src={src}
        alt={alt}
        className={className}
        srcSet={generateSrcSet(src)}
        sizes={sizes}
        loading="lazy"
        decoding="async"
        {...props}
      />
    </picture>
  );
}
