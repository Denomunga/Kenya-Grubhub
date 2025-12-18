import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

const AnimatedCard = motion.create(Card);

// Simple slideshow component for product images
const ProductImageSlideshow = ({ images, productName }: { images: string[], productName: string }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 2500); // Change every 2.5 seconds

    return () => clearInterval(interval);
  }, [images.length]);

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
  isPopular?: boolean;
}

interface FeaturedDishesProps {
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

const FeaturedDishes = ({ items, isLoading }: FeaturedDishesProps) => {
  const [, setLocation] = useLocation();

  return (
    <section className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-blue-50 to-white"></div>
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
            <Badge variant="outline" className="mb-4 text-blue-600 border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium shadow-sm">
              Our Specialties
            </Badge>
          </motion.div>
          <motion.h2 
            className="text-4xl md:text-5xl font-bold font-serif mb-6 text-blue-600"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Featured Dishes
          </motion.h2>
          <motion.p 
            className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Handpicked selection of our most popular and delicious dishes, prepared with love and authentic Kenyan flavors.
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
                onClick={() => setLocation("/menu")}
              >
                <div className="relative overflow-hidden h-48">
                  <ProductImageSlideshow
                    images={item.images || (item.image ? [item.image] : [])}
                    productName={item.name}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
                    <span className="text-lg font-bold text-blue-600">KSh {item.price?.toFixed(2)}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed">{item.description}</p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-600 px-3 py-1">
                      {item.category || 'Main Course'}
                    </Badge>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        size="sm"
                        className="gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 border-0 pointer-events-auto"
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation("/menu");
                        }}
                      >
                        Add to Order
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

export default FeaturedDishes;
