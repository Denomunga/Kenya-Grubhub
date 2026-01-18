import { Link } from 'wouter';
import { ChevronRight, Home } from 'lucide-react';
import { useBreadcrumbStructuredData } from './StructuredData';
import { SEOMetaTags } from './SEOMetaTags';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const structuredData = useBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    ...items
  ]);

  return (
    <>
      <SEOMetaTags structuredData={structuredData} />
      <nav 
        className={`flex items-center space-x-2 text-sm text-muted-foreground ${className}`}
        aria-label="Breadcrumb"
      >
        <Link 
          href="/" 
          className="flex items-center hover:text-foreground transition-colors"
          aria-label="Home"
        >
          <Home className="h-4 w-4" />
        </Link>
        
        {items.map((item, index) => (
          <div key={item.url} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4" />
            {index === items.length - 1 ? (
              <span className="text-foreground font-medium" aria-current="page">
                {item.name}
              </span>
            ) : (
              <Link 
                href={item.url}
                className="hover:text-foreground transition-colors"
              >
                {item.name}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </>
  );
}
