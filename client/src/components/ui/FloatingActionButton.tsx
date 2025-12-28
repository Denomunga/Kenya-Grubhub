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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-4">
      {/* Action Items */}
      {isOpen && displayActions.map((action, index) => {
        return (
          <div
            key={action.label}
            className="flex items-center gap-3 relative z-50 opacity-0 transform translate-y-4 scale-95 animate-fadeInUp"
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'forwards'
            }}
          >
            <span
              className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 px-4 py-2 rounded-2xl text-sm font-semibold shadow-2xl whitespace-nowrap hover:shadow-3xl transition-all duration-300 hover:scale-105"
            >
              {action.label}
            </span>
            <div className="relative group">
              <button
                className={`w-14 h-14 rounded-2xl bg-linear-to-r ${action.color} text-white shadow-2xl hover:shadow-3xl border-2 border-white/30 backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 relative overflow-hidden`}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
              >
                <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {action.icon}
              </button>
              
              {/* Enhanced glow effect */}
              <div className={`absolute -inset-1 rounded-2xl bg-linear-to-r ${action.color} opacity-40 blur-xl group-hover:opacity-60 transition-opacity duration-300 pointer-events-none`} />
              <div className={`absolute inset-0 rounded-2xl bg-linear-to-r ${action.color} opacity-20 blur-lg animate-pulse pointer-events-none`} />
            </div>
          </div>
        );
      })}

      {/* Main FAB */}
      <div id="fab-main" className="relative">
        <button
          className={`w-16 h-16 rounded-2xl bg-linear-to-r ${
            isChristmasMode 
              ? 'from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800' 
              : 'from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800'
          } text-white shadow-3xl hover:shadow-4xl border-2 border-white/30 backdrop-blur-xl transition-all duration-300 relative overflow-hidden group hover:scale-105 active:scale-95`}
          onClick={() => {
            setIsOpen(!isOpen);
          }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          
          {/* Icon with rotation */}
          <div className={`relative z-10 transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}>
            {isOpen ? (
              <X className="h-7 w-7" />
            ) : (
              isChristmasMode ? (
                <Sparkles className="h-7 w-7" />
              ) : (
                <Plus className="h-7 w-7" />
              )
            )}
          </div>
        </button>
        
        {/* Enhanced main button glow */}
        <div className={`absolute -inset-2 rounded-2xl bg-linear-to-r ${
          isChristmasMode 
            ? 'from-red-500 to-red-700' 
            : 'from-blue-500 to-blue-700'
        } opacity-30 blur-2xl animate-pulse pointer-events-none`} />
      </div>
    </div>
  );
};

export default FloatingActionButton;
