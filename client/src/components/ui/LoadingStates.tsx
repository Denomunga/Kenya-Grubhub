import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Package, ShoppingBag, Heart, Star } from 'lucide-react';

// Skeleton Loader Component
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({ 
  className = '', 
  variant = 'text', 
  width, 
  height, 
  lines = 3 
}: SkeletonProps) {

  const baseClasses = "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded";

  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} h-4`}
            style={{
              width: i === lines - 1 ? '60%' : '100%',
              height: height || '1rem'
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div
        className={`${baseClasses} ${className}`}
        style={{
          width: width || 40,
          height: height || 40,
          borderRadius: '50%'
        }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div
          className={`${baseClasses} h-48 rounded-lg`}
          style={{ width: '100%' }}
        />
        <div className="space-y-2">
          <div className={`${baseClasses} h-6 w-3/4`} />
          <div className={`${baseClasses} h-4 w-full`} />
          <div className={`${baseClasses} h-4 w-2/3`} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${className}`}
      style={{
        width,
        height
      }}
    />
  );
}

// Page Loading Component
export function PageLoader() {
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 bg-linear-to-br from-primary/5 to-secondary/5 backdrop-blur-sm z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center space-y-8">
        {/* Animated Logo */}
        <motion.div
          className="relative w-24 h-24 mx-auto"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-0 bg-blue-600 rounded-2xl shadow-2xl" />
          <div className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold">
            W
          </div>
        </motion.div>

        {/* Loading Progress */}
        <div className="w-64 space-y-2">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="w-full h-full bg-blue-500 rounded-lg animate-pulse"
              initial={{ width: 0 }}
              animate={{ width: `${loadingProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            I LOVE YOU WALI..... {Math.round(loadingProgress)}%
          </p>
        </div>

        {/* Loading Animation */}
        <motion.div
          className="flex justify-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-primary rounded-full"
              animate={{
                y: [0, -10, 0],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

// Button Loading State
interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function LoadingButton({ loading, children, className, disabled }: LoadingButtonProps) {
  return (
    <motion.button
      className={`relative ${className}`}
      disabled={disabled || loading}
      whileHover={!loading && !disabled ? { scale: 1.05 } : {}}
      whileTap={!loading && !disabled ? { scale: 0.95 } : {}}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            className="flex items-center justify-center space-x-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// Product Card Skeleton
export function ProductCardSkeleton() {
  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Skeleton variant="rectangular" height={200} />
      <div className="p-4 space-y-3">
        <Skeleton variant="text" height={20} width="80%" />
        <Skeleton variant="text" height={16} width="60%" />
        <div className="flex justify-between items-center">
          <Skeleton variant="text" height={24} width={80} />
          <Skeleton variant="circular" width={40} height={40} />
        </div>
      </div>
    </motion.div>
  );
}

// Image Loading with Blur Effect
interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}

export function ProgressiveImage({ src, alt, className, placeholder }: ProgressiveImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder/Blur */}
      <motion.img
        src={placeholder || 'data:image/svg+xml,%3Csvg width="400" height="300" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3C/svg%3E'}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        animate={{ filter: imageLoaded ? 'blur(0px)' : 'blur(20px)' }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Actual Image */}
      <AnimatePresence>
        {!error && (
          <motion.img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setError(true)}
          />
        )}
      </AnimatePresence>

      {/* Loading Indicator */}
      {!imageLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-8 h-8 text-primary" />
          </motion.div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center space-y-2">
            <Package className="w-12 h-12 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-500">Failed to load image</p>
          </div>
        </div>
      )}
    </div>
  );
}

// List Loading Animation
export function ListLoader({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <motion.div
          key={i}
          className="bg-white rounded-lg p-4 shadow-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="flex items-center space-x-4">
            <Skeleton variant="circular" width={48} height={48} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" height={16} width="60%" />
              <Skeleton variant="text" height={14} width="40%" />
            </div>
            <Skeleton variant="text" height={20} width={60} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Heart Loading Animation
export function HeartLoader() {
  return (
    <motion.div
      className="flex justify-center items-center"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Heart className="w-8 h-8 text-red-500 fill-current" />
      </motion.div>
    </motion.div>
  );
}

// Star Rating Loading
export function StarRatingLoader({ rating = 0 }: { rating?: number }) {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.div
          key={star}
          initial={{ rotate: 0, scale: 0 }}
          animate={{
            rotate: star <= rating ? 360 : 0,
            scale: 1,
            opacity: star <= rating ? 1 : 0.3
          }}
          transition={{
            delay: star * 0.1,
            duration: 0.5,
            rotate: { duration: 1, repeat: Infinity, ease: "linear" }
          }}
        >
          <Star 
            className={`w-5 h-5 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`} 
          />
        </motion.div>
      ))}
    </div>
  );
}

// Floating Shopping Bag Loader
export function ShoppingLoader() {
  return (
    <motion.div
      className="relative"
      initial={{ y: 0 }}
      animate={{ y: [-10, 0, -10] }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <ShoppingBag className="w-12 h-12 text-primary" />
      <motion.div
        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [1, 0.7, 1]
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
}

// Add shimmer animation to global styles
export const shimmerAnimation = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`;
