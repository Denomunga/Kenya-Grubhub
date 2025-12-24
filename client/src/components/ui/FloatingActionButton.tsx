import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, X, ShoppingBag, User, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useChristmas } from '@/lib/christmas';
import { useLocation } from 'wouter';

interface FABProps {
  actions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    color?: string;
  }>;
}

const FloatingActionButton: React.FC<FABProps> = ({ actions = [] }) => {
  const { isAuthenticated } = useAuth();
  const { isChristmasMode } = useChristmas();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [magneticPosition, setMagneticPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const fab = document.getElementById('fab-main');
      if (!fab || !isOpen) return;

      const rect = fab.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distance = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
      );

      if (distance < 120) {
        const pullStrength = (120 - distance) / 120;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const pullX = Math.cos(angle) * pullStrength * 15;
        const pullY = Math.sin(angle) * pullStrength * 15;
        
        setMagneticPosition({ x: pullX, y: pullY });
      } else {
        setMagneticPosition({ x: 0, y: 0 });
      }
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isOpen]);

  // Subtle pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseScale(1 + Math.sin(Date.now() / 1000) * 0.05);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const defaultActions = [
    {
      icon: <ShoppingBag className="h-5 w-5" />,
      label: 'Browse Menu',
      onClick: () => {
        console.log('FAB: Navigating to menu');
        setLocation('/menu');
      },
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: <MessageCircle className="h-5 w-5" />,
      label: 'Live Chat',
      onClick: () => {
        console.log('FAB: Navigating to chat');
        setLocation('/chat');
      },
      color: 'from-green-500 to-green-600'
    },
    ...(isAuthenticated ? [{
      icon: <User className="h-5 w-5" />,
      label: 'Profile',
      onClick: () => {
        console.log('FAB: Navigating to profile');
        setLocation('/profile');
      },
      color: 'from-purple-500 to-purple-600'
    }] : [{
      icon: <User className="h-5 w-5" />,
      label: 'Login',
      onClick: () => {
        console.log('FAB: Navigating to login');
        setLocation('/login');
      },
      color: 'from-orange-500 to-orange-600'
    }])
  ];

  const displayActions = actions.length > 0 ? actions : defaultActions;

  return (
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-9999 flex flex-col items-end gap-3 pointer-events-none">
      {/* Backdrop overlay when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
            onClick={() => {
              console.log('FAB: Backdrop clicked');
              setIsOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Action Items */}
      <AnimatePresence>
        {isOpen && displayActions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
              type: "spring",
              stiffness: 400,
              damping: 25
            }}
            className="flex items-center gap-3"
          >
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.1 + 0.1 }}
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-full text-sm font-medium shadow-xl whitespace-nowrap"
            >
              {action.label}
            </motion.span>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="relative pointer-events-auto"
            >
              <Button
                size="icon"
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-linear-to-r ${action.color} text-white shadow-xl hover:shadow-2xl border-2 border-white/20 backdrop-blur-sm transition-all duration-300`}
                onClick={action.onClick}
              >
                {action.icon}
              </Button>
              
              {/* Glow effect */}
              <div className={`absolute inset-0 rounded-full bg-linear-to-r ${action.color} opacity-30 blur-xl animate-pulse`} />
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div
        id="fab-main"
        className="relative pointer-events-auto"
        animate={{
          x: magneticPosition.x,
          y: magneticPosition.y,
          rotate: isOpen ? 135 : 0,
          scale: isHovered ? 1.1 : pulseScale
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: isOpen 
              ? "0 0 40px rgba(59, 130, 246, 0.5), 0 0 80px rgba(59, 130, 246, 0.3)"
              : isChristmasMode
                ? "0 0 30px rgba(239, 68, 68, 0.5), 0 0 60px rgba(239, 68, 68, 0.3)"
                : "0 0 30px rgba(59, 130, 246, 0.5), 0 0 60px rgba(59, 130, 246, 0.3)"
          }}
          transition={{ duration: 0.3 }}
        />
        
        <Button
          size="icon"
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-r ${
            isChristmasMode 
              ? 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
              : 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
          } text-white shadow-2xl hover:shadow-3xl border-2 border-white/30 backdrop-blur-sm transition-all duration-300 relative overflow-hidden group`}
          onClick={() => {
            console.log('FAB: Main button clicked, isOpen:', isOpen);
            setIsOpen(!isOpen);
          }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 180, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <X className="h-6 w-6 sm:h-7 sm:w-7" />
              </motion.div>
            ) : (
              <motion.div
                key="plus"
                initial={{ rotate: 180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -180, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {isChristmasMode ? (
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
                ) : (
                  <Plus className="h-6 w-6 sm:h-7 sm:w-7" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Inner shine effect */}
          <div className="absolute inset-0 bg-linear-to-tr from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Button>
        
        {/* Enhanced ripple effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-linear-to-r from-blue-400/30 to-purple-400/30"
          animate={{
            scale: [1, 1.5, 2],
            opacity: [0.5, 0.3, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
        
        {/* Floating particles effect */}
        <AnimatePresence>
          {isHovered && (
            <React.Fragment>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  initial={{ 
                    scale: 0,
                    x: 0,
                    y: 0,
                    opacity: 1
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    x: (i - 1) * 30,
                    y: -20 - i * 10,
                    opacity: [1, 0.8, 0]
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    duration: 1,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </React.Fragment>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default FloatingActionButton;
