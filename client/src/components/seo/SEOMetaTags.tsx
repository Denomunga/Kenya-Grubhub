import { useEffect } from 'react';

interface SEOMetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
  noindex?: boolean;
  structuredData?: Record<string, any>;
  canonicalUrl?: string;
}

const SITE_NAME = 'KenyaGrubHub';
const DEFAULT_DESCRIPTION = 'Shop premium laptops, mobiles, and stationery in Kenya. HP, Dell, Lenovo, Asus, Apple MacBooks, and more. Fast delivery across Kenya with secure checkout.';
const DEFAULT_KEYWORDS = 'laptops Kenya, mobiles Kenya, stationery Kenya, HP laptops, Dell laptops, Lenovo laptops, Asus laptops, Apple MacBooks, Microsoft Surface, mobile phones Nairobi, electronics Kenya, online shopping Kenya';
const SITE_URL = 'https://kenya-grubhub-gx7x.vercel.app';

export function SEOMetaTags({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  ogImage = '/favicon2.png',
  ogUrl,
  noindex = false,
  structuredData,
  canonicalUrl
}: SEOMetaTagsProps) {
  useEffect(() => {
    // Update document title
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    // Update or create meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('author', SITE_NAME);
    updateMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow');
    updateMetaTag('language', 'English');
    updateMetaTag('revisit-after', '7 days');
    
    // Canonical URL
    updateCanonicalUrl(canonicalUrl || `${SITE_URL}${window.location.pathname}`);
    
    // Open Graph / Facebook
    const fullOgUrl = ogUrl || `${SITE_URL}${window.location.pathname}`;
    updateMetaProperty('og:type', 'website');
    updateMetaProperty('og:url', fullOgUrl);
    updateMetaProperty('og:title', fullTitle);
    updateMetaProperty('og:description', description);
    updateMetaProperty('og:image', ogImage);
    updateMetaProperty('og:site_name', SITE_NAME);
    
    // Twitter
    updateMetaProperty('twitter:card', 'summary_large_image');
    updateMetaProperty('twitter:url', fullOgUrl);
    updateMetaProperty('twitter:title', fullTitle);
    updateMetaProperty('twitter:description', description);
    updateMetaProperty('twitter:image', ogImage);
    
    // Additional SEO Meta
    updateMetaTag('theme-color', '#f59e0b');
    updateMetaTag('msapplication-TileColor', '#f59e0b');
    
    // Structured Data
    if (structuredData) {
      updateStructuredData(structuredData);
    }

  }, [title, description, keywords, ogImage, ogUrl, noindex, structuredData, canonicalUrl]);

  return null; // This component doesn't render anything
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
