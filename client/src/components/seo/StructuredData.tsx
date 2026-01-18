import { useMemo } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  category: string;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  brand?: string;
  sku?: string;
}

interface BusinessInfo {
  name: string;
  description: string;
  url: string;
  logo: string;
  phone: string;
  email: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  openingHours?: string[];
  priceRange?: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function useProductStructuredData(product: Product) {
  return useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    brand: product.brand ? {
      '@type': 'Brand',
      name: product.brand
    } : undefined,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: `https://schema.org/${product.availability}`,
      seller: {
        '@type': 'Organization',
        name: 'KenyaGrubHub',
        url: 'https://kenyagrubhub.com'
      }
    },
    category: product.category
  }), [product]);
}

export function useBusinessStructuredData(business: BusinessInfo) {
  return useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.description,
    url: business.url,
    logo: business.logo,
    telephone: business.phone,
    email: business.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.streetAddress,
      addressLocality: business.address.addressLocality,
      addressRegion: business.address.addressRegion,
      postalCode: business.address.postalCode,
      addressCountry: business.address.addressCountry
    },
    geo: business.coordinates ? {
      '@type': 'GeoCoordinates',
      latitude: business.coordinates.latitude,
      longitude: business.coordinates.longitude
    } : undefined,
    openingHours: business.openingHours,
    priceRange: business.priceRange,
    sameAs: [
      'https://www.facebook.com/kenyagrubhub',
      'https://www.twitter.com/kenyagrubhub',
      'https://www.instagram.com/kenyagrubhub'
    ]
  }), [business]);
}

export function useBreadcrumbStructuredData(items: BreadcrumbItem[]) {
  return useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  }), [items]);
}

export function useWebsiteStructuredData() {
  return useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'KenyaGrubHub',
    url: 'https://kenyagrubhub.com',
    description: 'Shop premium laptops, mobiles, and stationery in Kenya. Fast delivery across Kenya with secure checkout.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://kenyagrubhub.com/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  }), []);
}

export function useArticleStructuredData(article: {
  title: string;
  description: string;
  image: string;
  author: string;
  publishDate: string;
  modifiedDate?: string;
  url: string;
}) {
  return useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.image,
    author: {
      '@type': 'Person',
      name: article.author
    },
    publisher: {
      '@type': 'Organization',
      name: 'KenyaGrubHub',
      logo: {
        '@type': 'ImageObject',
        url: 'https://kenyagrubhub.com/favicon2.png'
      }
    },
    datePublished: article.publishDate,
    dateModified: article.modifiedDate || article.publishDate,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url
    }
  }), [article]);
}
