import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, GitCompare, Heart, Plus, Star, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { formatPriceKSHS } from "@/lib/format";
import { useShop } from "@/lib/shop";

const AnimatedCard = motion.create(Card);

// Configuration for added fields that should be displayed
const ADDED_FIELDS_CONFIG = [
  { key: 'category', label: 'Category', type: 'badge', variant: 'outline' },
  { key: 'subcategory', label: 'Subcategory', type: 'badge', variant: 'secondary' },
  { key: 'brand', label: 'Brand', type: 'badge', variant: 'outline' },
  { key: 'condition', label: 'Condition', type: 'badge', variant: 'default', conditionVariant: true },
  { key: 'year', label: 'Year', type: 'badge', variant: 'outline' },
  { key: 'size', label: 'Size', type: 'badge', variant: 'outline' },
  { key: 'color', label: 'Color', type: 'badge', variant: 'outline' },
  { key: 'stock', label: 'Stock', type: 'conditional-badge', threshold: 5 },
  { key: 'location', label: 'Location', type: 'text', icon: MapPin },
  { key: 'material', label: 'Material', type: 'text' },
  { key: 'dimensions', label: 'Dimensions', type: 'text', formatter: (dims: any) => `${dims.length}L × ${dims.width}W × ${dims.height}H cm` },
  { key: 'weight', label: 'Weight', type: 'text', formatter: (weight: number) => `${weight} kg` },
  { key: 'tags', label: 'Tags', type: 'tags', maxDisplay: 3 },
  { key: 'specifications', label: 'Key Specs', type: 'specs', maxDisplay: 2 }
];

// Function to render added fields dynamically
const renderAddedField = (field: any, item: MenuItem) => {
  const value = item[field.key as keyof MenuItem];
  
  // Skip if value is null, undefined, or empty
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value) && value.length === 0) return null;
  if (typeof value === 'object' && Object.keys(value).length === 0) return null;

  let displayValue: any;

  switch (field.type) {
    case 'badge':
      // For badges, ensure we only pass string/number values
      displayValue = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
      if (!displayValue) return null;
      
      if (field.conditionVariant && typeof value === 'string') {
        const variant = value === 'new' ? 'default' : 'secondary';
        return (
          <Badge key={field.key} variant={variant} className="text-xs">
            {displayValue}
          </Badge>
        );
      }
      return (
        <Badge key={field.key} variant={field.variant} className="text-xs">
          {displayValue}
        </Badge>
      );

    case 'conditional-badge':
      if (typeof value === 'number' && value <= (field.threshold || 0)) {
        return (
          <Badge key={field.key} variant="destructive" className="text-xs">
            Only {value} left
          </Badge>
        );
      }
      return null;

    case 'text':
      displayValue = field.formatter ? field.formatter(value) : value;
      const Icon = field.icon;
      return (
        <div key={field.key} className="flex items-center gap-1 text-xs text-muted-foreground">
          {Icon && <Icon className="h-3 w-3" />}
          {field.label}: {displayValue}
        </div>
      );

    case 'tags':
      if (Array.isArray(value)) {
        const tags = value.slice(0, field.maxDisplay || 3);
        const remaining = value.length - tags.length;
        return (
          <div key={field.key} className="flex flex-wrap gap-1">
            {tags.map((tag: string, index: number) => (
              <span key={index} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full border border-border">
                {tag}
              </span>
            ))}
            {remaining > 0 && (
              <span className="text-xs text-muted-foreground">+{remaining} more</span>
            )}
          </div>
        );
      }
      return null;

    case 'specs':
      if (typeof value === 'object' && value !== null) {
        const specs = Object.entries(value).slice(0, field.maxDisplay || 2);
        const remaining = Object.keys(value).length - specs.length;
        return (
          <div key={field.key} className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">{field.label}:</div>
            <div className="flex flex-wrap gap-2">
              {specs.map(([key, val]) => {
                const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
                if (String(val).length > 15) return null;
                return (
                  <span key={key} className="text-xs bg-muted/30 text-foreground px-2 py-1 rounded border border-border">
                    <span className="font-medium capitalize">{formattedKey}:</span> {String(val)}
                  </span>
                );
              })}
              {remaining > 0 && (
                <span className="text-xs text-primary">+{remaining} more specs</span>
              )}
            </div>
          </div>
        );
      }
      return null;

    default:
      return null;
  }
};

// Simple slideshow component for product images
const ProductImageSlideshow = ({ images, productName }: { images: string[], productName: string }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    setCurrentImageIndex(0); // Reset to first image when images change
  }, [images]);

  useEffect(() => {
    if (!images || images.length <= 1) return;

    // console.log(`Starting slideshow for ${productName} with ${images.length} images`);

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => {
        const next = (prev + 1) % images.length;
        // console.log(`Changing image for ${productName}: ${prev} -> ${next}`);
        return next;
      });
    }, 2500); // Change every 2.5 seconds

    return () => {
      // console.log(`Stopping slideshow for ${productName}`);
      clearInterval(interval);
    };
  }, [images, productName]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-48 bg-muted flex items-center justify-center">
        <span className="text-muted-foreground">No Image</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 overflow-hidden">
      <img
        src={images[currentImageIndex]}
        alt={productName}
        className="w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
      />
      
      {/* Image indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {images.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentImageIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  images?: string[];
  image?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  condition?: "new" | "used" | "refurbished";
  year?: number;
  size?: string;
  color?: string;
  stock?: number;
  location?: string;
  material?: string;
  weight?: number;
  dimensions?: { length: number; width: number; height: number; };
  tags?: string[];
  specifications?: Record<string, any>;
  isPopular?: boolean;
}

interface FeaturedProductsProps {
  items: MenuItem[];
  isLoading: boolean;
}

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {[1, 2, 3].map((i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: i * 0.1 }}
      >
        <Card className="overflow-hidden card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow">
          <Skeleton className="h-48 w-full rounded-t-lg" />
          <CardContent className="p-6">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ))}
  </div>
);

const FeaturedProducts = ({ items, isLoading }: FeaturedProductsProps) => {
  const [, setLocation] = useLocation();
  const { wishlist, compare, toggleWishlist, toggleCompare } = useShop();

  return (
    <section className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-background via-background to-muted/40"></div>
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Badge variant="outline" className="mb-4 text-primary border-border bg-background/60 px-4 py-2 text-sm font-medium shadow-sm">
              Our Specialties
            </Badge>
          </motion.div>
          <motion.h2 
            className="text-4xl md:text-5xl font-bold font-serif mb-6 text-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Featured Products
          </motion.h2>
          <motion.p 
            className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Handpicked selection of our most popular products, from XUS,XUK Laptops, Computer Accessories, Computer Repairs and Stationeries.
          </motion.p>
        </motion.div>
        
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item, index) => (
              <AnimatedCard
                key={item.id} 
                className="overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow pointer-events-auto"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setLocation(`/menu?product=${item.id}`)}
              >
                <div className="relative overflow-hidden h-48">
                  <ProductImageSlideshow
                    images={item.images || (item.image ? [item.image] : [])}
                    productName={item.name}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Quick actions */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-9 w-9 rounded-full bg-background/90 text-foreground hover:bg-background shadow-lg focus-ring"
                      aria-label={`Quick view ${item.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/menu?product=${item.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className={`h-9 w-9 rounded-full bg-background/90 hover:bg-background shadow-lg focus-ring ${wishlist.has(item.id) ? "text-red-600" : "text-foreground"}`}
                        aria-label={wishlist.has(item.id) ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(item.id);
                        }}
                      >
                        <Heart className={`h-4 w-4 ${wishlist.has(item.id) ? "fill-current" : ""}`} />
                      </Button>

                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className={`h-9 w-9 rounded-full bg-background/90 hover:bg-background shadow-lg focus-ring ${compare.has(item.id) ? "text-primary" : "text-foreground"}`}
                        aria-label={compare.has(item.id) ? `Remove ${item.name} from compare` : `Add ${item.name} to compare`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompare(item.id);
                        }}
                      >
                        <GitCompare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {item.isPopular && (
                    <motion.div 
                      className="absolute top-4 right-4"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                    >
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 px-3 py-1 shadow-lg animate-pulse-glow">
                        <Star className="w-3 h-3 fill-current" />
                        Popular
                      </Badge>
                    </motion.div>
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold font-serif text-foreground group-hover:text-primary transition-colors duration-300">{item.name}</h3>
                    <span className="text-lg font-bold text-primary tabular-nums">{formatPriceKSHS(item.price)}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed">{item.description}</p>
                  
                  {/* Dynamically render added fields that have values */}
                  <div className="space-y-2 mb-3">
                    {ADDED_FIELDS_CONFIG.map(field => renderAddedField(field, item)).filter(Boolean)}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div></div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative group"
                    >
                      <Button
                        size="sm"
                        className="gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 border-0 pointer-events-auto sm:opacity-0 sm:group-hover:opacity-100"
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/menu?product=${item.id}`);
                        }}
                      >
                        View Details
                        <Plus className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </AnimatedCard>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
