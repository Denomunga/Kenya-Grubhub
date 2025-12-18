import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, X, ShoppingBag, User, MessageCircle } from 'lucide-react';

interface FABProps {
  actions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    color?: string;
  }>;
}

const FloatingActionButton: React.FC<FABProps> = ({ actions = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [magneticPosition, setMagneticPosition] = useState({ x: 0, y: 0 });

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

      if (distance < 100) {
        const pullStrength = (100 - distance) / 100;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const pullX = Math.cos(angle) * pullStrength * 10;
        const pullY = Math.sin(angle) * pullStrength * 10;
        
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

  const defaultActions = [
    {
      icon: <ShoppingBag className="h-4 w-4" />,
      label: 'View Menu',
      onClick: () => window.location.href = '/menu',
      color: 'bg-primary'
    },
    {
      icon: <MessageCircle className="h-4 w-4" />,
      label: 'Live Chat',
      onClick: () => window.location.href = '/chat',
      color: 'bg-secondary'
    },
    {
      icon: <User className="h-4 w-4" />,
      label: 'Profile',
      onClick: () => window.location.href = '/profile',
      color: 'bg-accent'
    }
  ];

  const displayActions = actions.length > 0 ? actions : defaultActions;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Action Items */}
      <AnimatePresence>
        {isOpen && displayActions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            transition={{
              duration: 0.3,
              delay: index * 0.1,
              type: "spring",
              stiffness: 300
            }}
            className="flex items-center gap-3"
          >
            <span className="bg-background border border-border px-3 py-1 rounded-lg text-sm shadow-lg whitespace-nowrap">
              {action.label}
            </span>
            <Button
              size="icon"
              className={`w-12 h-12 rounded-full ${action.color} text-white shadow-lg hover:shadow-xl magnetic luminous-glow`}
              onClick={action.onClick}
            >
              {action.icon}
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div
        id="fab-main"
        className="relative"
        animate={{
          x: magneticPosition.x,
          y: magneticPosition.y,
          rotate: isOpen ? 45 : 0
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
      >
        <Button
          size="icon"
          className="w-14 h-14 rounded-full bg-linear-to-r from-primary to-secondary text-white shadow-xl hover:shadow-2xl fab magnetic luminous-glow"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </Button>
        
        {/* Ripple Effect */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
      </motion.div>
    </div>
  );
};

export default FloatingActionButton;
