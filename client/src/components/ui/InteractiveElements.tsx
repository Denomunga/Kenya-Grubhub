import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, Share2, Eye, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

// Staggered List Animation
interface StaggeredListProps {
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
}

export function StaggeredList({ children, className, staggerDelay = 0.1 }: StaggeredListProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children.map((child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Animated Form Input with Floating Label
interface AnimatedInputProps {
  label: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function AnimatedInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  className,
  error
}: AnimatedInputProps) {
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  useEffect(() => {
    setHasValue(!!value);
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <motion.input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={`
          w-full px-4 py-3 border-2 rounded-xl transition-all duration-300
          ${focused ? 'border-primary' : 'border-gray-300'}
          ${error ? 'border-red-500' : ''}
          ${hasValue || focused ? 'pt-6 pb-2' : 'pt-3 pb-3'}
        `}
        animate={{
          borderColor: focused ? 'var(--color-primary)' : error ? 'var(--color-error)' : 'var(--color-gray-300)'
        }}
      />
      
      <motion.label
        className={`
          absolute left-4 transition-all duration-300 pointer-events-none
          ${hasValue || focused ? 'text-xs top-2' : 'text-base top-3.5'}
          ${focused ? 'text-primary' : 'text-gray-500'}
          ${error ? 'text-red-500' : ''}
        `}
        animate={{
          fontSize: hasValue || focused ? '0.75rem' : '1rem',
          top: hasValue || focused ? '0.5rem' : '0.875rem',
          color: focused ? 'var(--color-primary)' : error ? 'var(--color-error)' : 'var(--color-gray-500)'
        }}
      >
        {label}
      </motion.label>
      
      {error && (
        <motion.p
          className="absolute -bottom-5 left-4 text-xs text-red-500"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

// Interactive Gallery with Zoom
interface InteractiveGalleryProps {
  images: string[];
  className?: string;
}

export function InteractiveGallery({ images, className }: InteractiveGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setIsZoomed(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Image */}
      <div className="relative overflow-hidden rounded-xl bg-gray-100">
        <motion.img
          src={images[currentIndex]}
          alt={`Gallery image ${currentIndex + 1}`}
          className="w-full h-96 object-cover cursor-pointer"
          animate={{ scale: zoomLevel }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={() => setIsZoomed(!isZoomed)}
        />
        
        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <motion.button
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={zoomIn}
          >
            <ZoomIn className="w-4 h-4" />
          </motion.button>
          <motion.button
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={zoomOut}
          >
            <ZoomOut className="w-4 h-4" />
          </motion.button>
          <motion.button
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={resetZoom}
          >
            <RotateCw className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <motion.button
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={prevImage}
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <motion.button
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={nextImage}
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {images.map((image, index) => (
            <motion.button
              key={index}
              className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                index === currentIndex ? 'border-primary' : 'border-transparent'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentIndex(index)}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </motion.button>
          ))}
        </div>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

// Smooth Carousel
interface SmoothCarouselProps {
  items: React.ReactNode[];
  className?: string;
  autoPlay?: boolean;
  interval?: number;
}

export function SmoothCarousel({ items, className, autoPlay = false, interval = 3000 }: SmoothCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!autoPlay || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, isPaused, items.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  return (
    <div className={`relative ${className}`}
         onMouseEnter={() => setIsPaused(true)}
         onMouseLeave={() => setIsPaused(false)}>
      {/* Carousel Container */}
      <div className="overflow-hidden rounded-xl">
        <motion.div
          className="flex"
          animate={{ x: -currentIndex * 100 + '%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {items.map((item, index) => (
            <div key={index} className="w-full shrink-0">
              {item}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Navigation Controls */}
      {items.length > 1 && (
        <>
          <motion.button
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={prevSlide}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <motion.button
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={nextSlide}
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </>
      )}

      {/* Dots Indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, index) => (
            <motion.button
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Interactive Product Card
interface InteractiveProductCardProps {
  product: {
    id: number;
    name: string;
    price: number;
    image: string;
    description?: string;
    rating?: number;
  };
  onLike?: (id: number) => void;
  onShare?: (product: any) => void;
  onView?: (id: number) => void;
  className?: string;
}

export function InteractiveProductCard({
  product,
  onLike,
  onShare,
  onView,
  className
}: InteractiveProductCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(product.id);
  };

  const handleShare = () => {
    onShare?.(product);
  };

  const handleView = () => {
    onView?.(product.id);
  };

  return (
    <motion.div
      className={`relative bg-white rounded-xl shadow-lg overflow-hidden ${className}`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Product Image */}
      <div className="relative h-48 overflow-hidden">
        <motion.img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          animate={{ scale: isHovered ? 1.1 : 1 }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Quick Actions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute top-4 right-4 flex flex-col gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <motion.button
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleLike}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
              </motion.button>
              <motion.button
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 text-gray-600" />
              </motion.button>
              <motion.button
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleView}
              >
                <Eye className="w-4 h-4 text-gray-600" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <motion.div
            className="text-xl font-bold text-primary"
            animate={{ scale: isHovered ? 1.1 : 1 }}
          >
            ${product.price}
          </motion.div>
          
          {product.rating && (
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 ${
                    i < (product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                >
                  ★
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Magnetic Menu
interface MagneticMenuProps {
  items: {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
  }[];
  className?: string;
}

export function MagneticMenu({ items, className }: MagneticMenuProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <motion.div className={`flex gap-4 ${className}`}>
      {items.map((item, index) => (
        <motion.button
          key={index}
          className="relative px-4 py-2 rounded-lg font-medium transition-colors"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={item.onClick}
          animate={{
            scale: hoveredIndex === index ? 1.1 : 1,
            backgroundColor: hoveredIndex === index ? 'var(--color-primary)' : 'transparent',
            color: hoveredIndex === index ? 'white' : 'var(--color-gray-700)'
          }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <span className="flex items-center gap-2">
            {item.icon}
            {item.label}
          </span>
          
          {/* Hover Effect */}
          {hoveredIndex === index && (
            <motion.div
              className="absolute inset-0 rounded-lg bg-primary/20"
              layoutId="hoverBackground"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </motion.div>
  );
}

// Floating Action Menu
interface FloatingActionMenuProps {
  items: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    color?: string;
  }[];
  className?: string;
}

export function FloatingActionMenu({ items, className }: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute bottom-16 right-0 space-y-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            {items.map((item, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
              >
                <span className="bg-gray-800 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap">
                  {item.label}
                </span>
                <motion.button
                  className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: item.color || 'var(--color-primary)' }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                >
                  {item.icon}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center font-bold text-lg hover:shadow-2xl transition-shadow duration-300"
        animate={{ rotate: isOpen ? 45 : 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-2xl">+</span>
      </motion.button>
    </div>
  );
}
