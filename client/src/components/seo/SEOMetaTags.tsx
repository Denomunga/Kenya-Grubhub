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
  structuredDataId?: string;
}

const SITE_NAME = 'KenyaGrubHub';
const DEFAULT_DESCRIPTION = 'Shop premium laptops, mobiles, and stationery in Kenya. HP, Dell, Lenovo, Asus, Apple MacBooks, and more. Fast delivery across Kenya with secure checkout.';
const DEFAULT_KEYWORDS = 'laptops Kenya, mobiles Kenya, stationery Kenya, HP laptops, Dell laptops, Lenovo laptops, Asus laptops, Apple MacBooks, Microsoft Surface, mobile phones Nairobi, electronics Kenya, online shopping Kenya';

export function SEOMetaTags({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  ogImage = '/favicon2.png',
  ogUrl,
  noindex = false,
  structuredData,
  canonicalUrl,
  structuredDataId = 'seo-structured-data'
}: SEOMetaTagsProps) {
  useEffect(() => {
    const siteUrl = window.location.origin;

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
    updateCanonicalUrl(canonicalUrl || `${siteUrl}${window.location.pathname}`);
    
    // Open Graph / Facebook
    const fullOgUrl = ogUrl || `${siteUrl}${window.location.pathname}`;
    const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage.startsWith('/') ? ogImage : `/${ogImage}`}`;
    updateMetaProperty('og:type', 'website');
    updateMetaProperty('og:url', fullOgUrl);
    updateMetaProperty('og:title', fullTitle);
    updateMetaProperty('og:description', description);
    updateMetaProperty('og:image', fullOgImage);
    updateMetaProperty('og:site_name', SITE_NAME);
    updateMetaProperty('og:locale', 'en_KE');
    
    // Twitter
    updateMetaProperty('twitter:card', 'summary_large_image');
    updateMetaProperty('twitter:url', fullOgUrl);
    updateMetaProperty('twitter:title', fullTitle);
    updateMetaProperty('twitter:description', description);
    updateMetaProperty('twitter:image', fullOgImage);
    
    // Additional SEO Meta
    updateMetaTag('theme-color', '#f59e0b');
    updateMetaTag('msapplication-TileColor', '#f59e0b');
    
    // Structured Data
    if (structuredData) {
      updateStructuredData(structuredDataId, structuredData);
    }

  }, [title, description, keywords, ogImage, ogUrl, noindex, structuredData, canonicalUrl, structuredDataId]);

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
function updateStructuredData(id: string, data: Record<string, any>) {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
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
