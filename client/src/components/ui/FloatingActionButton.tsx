import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ShoppingBag, MessageCircle, User, Plus, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useChristmas } from '@/lib/christmas';

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

  // Add this at the beginning of the component for debugging
  useEffect(() => {
    console.log('FAB: Component mounted');
    const fabElement = document.getElementById('fab-main');
    if (fabElement) {
      console.log('FAB: Found FAB element:', fabElement);
      console.log('FAB: Computed styles:', window.getComputedStyle(fabElement));
      console.log('FAB: Pointer events:', window.getComputedStyle(fabElement).pointerEvents);
      
      // Check if there are any overlays
      const rect = fabElement.getBoundingClientRect();
      const elementsAtPoint = document.elementsFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
      console.log('FAB: Elements at click point:', elementsAtPoint);
    }
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
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col-reverse items-end gap-3">
      {/* Action Items */}
      {isOpen && displayActions.map((action, index) => {
        console.log(`FAB: Rendering action ${index}: ${action.label}`);
        return (
          <div
            key={action.label}
            className="flex items-center gap-3 relative z-50"
          >
            <span
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-full text-sm font-medium shadow-xl whitespace-nowrap"
            >
              {action.label}
            </span>
            <div className="relative">
              <button
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-linear-to-r ${action.color} text-white shadow-xl hover:shadow-2xl border-2 border-white/20 backdrop-blur-sm transition-all duration-300`}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
              >
                {action.icon}
              </button>
              
              {/* Glow effect */}
              <div className={`absolute inset-0 rounded-full bg-linear-to-r ${action.color} opacity-30 blur-xl animate-pulse pointer-events-none`} />
            </div>
          </div>
        );
      })}

      {/* Main FAB */}
      <div id="fab-main" className="relative">
        <button
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-r ${
            isChristmasMode 
              ? 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
              : 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
          } text-white shadow-2xl hover:shadow-3xl border-2 border-white/30 backdrop-blur-sm transition-all duration-300 relative overflow-hidden group pointer-events-auto`}
          onClick={() => {
            console.log('FAB: Click event fired!');
            console.log('FAB: Current isOpen:', isOpen);
            setIsOpen(!isOpen);
            console.log('FAB: New isOpen:', !isOpen);
          }}
        >
          {isOpen ? (
            <X className="h-6 w-6 sm:h-7 sm:w-7" />
          ) : (
            isChristmasMode ? (
              <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
            ) : (
              <Plus className="h-6 w-6 sm:h-7 sm:w-7" />
            )
          )}
        </button>
      </div>
    </div>
  );
};

export default FloatingActionButton;
