import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface SeoPageData {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  structuredData?: Record<string, any>;
}

// Hook for updating page-specific SEO
export function usePageSeo(pageData: SeoPageData) {
  const [location] = useLocation();

  useEffect(() => {
    // Update document title
    if (pageData.title) {
      document.title = `${pageData.title} | KenyaGrubHub`;
    }

    // Update or create meta description
    updateMetaTag('description', pageData.description);
    
    // Update keywords if provided
    if (pageData.keywords) {
      updateMetaTag('keywords', pageData.keywords);
    }

    // Update Open Graph tags
    updateMetaProperty('og:title', pageData.title);
    updateMetaProperty('og:description', pageData.description);
    updateMetaProperty('og:url', `https://kenyagrubhub.com${location}`);
    
    if (pageData.ogImage) {
      updateMetaProperty('og:image', pageData.ogImage);
    }

    // Update Twitter Card tags
    updateMetaProperty('twitter:title', pageData.title);
    updateMetaProperty('twitter:description', pageData.description);
    
    if (pageData.ogImage) {
      updateMetaProperty('twitter:image', pageData.ogImage);
    }

    // Update structured data
    if (pageData.structuredData) {
      updateStructuredData(pageData.structuredData);
    }

    // Update canonical URL
    updateCanonicalUrl(`https://kenyagrubhub.com${location}`);

  }, [pageData, location]);
}

// Helper function to update meta tags
function updateMetaTag(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

// Helper function to update Open Graph meta properties
function updateMetaProperty(property: string, content: string) {
  let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

// Helper function to update structured data
function updateStructuredData(data: Record<string, any>) {
  // Remove existing structured data scripts
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  existingScripts.forEach(script => script.remove());

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

// Helper function to update canonical URL
function updateCanonicalUrl(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

// Hook for tracking page views for analytics
export function usePageTracking() {
  const [location] = useLocation();

  useEffect(() => {
    // Track page view (you can integrate with Google Analytics, Plausible, etc.)
    // Note: Add these scripts to your index.html to enable tracking
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: location
      });
    }

    // Example: Track with Plausible
    if (typeof window !== 'undefined' && 'plausible' in window) {
      (window as any).plausible('pageview', { u: location });
    }

  }, [location]);
}

// Hook for generating product schema
export function useProductSchema(product: {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  brand?: string;
  available: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    brand: product.brand ? {
      '@type': 'Brand',
      name: product.brand
    } : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'KES',
      availability: product.available 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'KenyaGrubHub',
        url: 'https://kenyagrubhub.com'
      }
    },
    category: product.category
  };
}
