import { Helmet } from 'react-helmet-async';
import { useMemo } from 'react';

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
const DEFAULT_KEYWORDS = 'laptops Kenya, mobiles Kenya, stationery Kenya, HP laptops, Dell laptops, Lenovo laptops, Asus laptops, Apple MacBooks, Microsoft Surface, mobile phones Nairobi';
const SITE_URL = 'https://kenyagrubhub.com';

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
  const fullTitle = useMemo(() => {
    return title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  }, [title]);

  const fullOgUrl = useMemo(() => {
    return ogUrl || `${SITE_URL}${window.location.pathname}`;
  }, [ogUrl]);

  const fullCanonicalUrl = useMemo(() => {
    return canonicalUrl || `${SITE_URL}${window.location.pathname}`;
  }, [canonicalUrl]);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={SITE_NAME} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonicalUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullOgUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullOgUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />
      
      {/* Additional SEO Meta */}
      <meta name="theme-color" content="#f59e0b" />
      <meta name="msapplication-TileColor" content="#f59e0b" />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
