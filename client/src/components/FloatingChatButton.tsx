import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, MessageSquare, Shield } from 'lucide-react';
import ChatWidget from '@/components/ChatWidget';
import AdminChatWidget from '@/components/admin/component/AdminChatWidget';
import { useHybridAuth } from '@/lib/hybrid-auth';

type ChatMode = 'user' | 'admin' | null;

export default function FloatingChatButton() {
  const { isAuthenticated, isAdmin, isStaff, isAccountant } = useHybridAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>(null);
  const [showMenu, setShowMenu] = useState(false);

  const canAccessAdmin = isAdmin || isStaff || isAccountant;

  const handleToggle = () => {
    if (!isAuthenticated) {
      // Not logged in - just open user chat directly
      if (!isOpen) {
        setIsOpen(true);
        setChatMode('user');
      } else {
        setIsOpen(false);
        setChatMode(null);
      }
      return;
    }

    // Logged in but not admin - single chat
    if (!canAccessAdmin) {
      if (!isOpen) {
        setIsOpen(true);
        setChatMode('user');
      } else {
        setIsOpen(false);
        setChatMode(null);
      }
      return;
    }

    // Admin/staff - show menu or toggle
    if (!isOpen) {
      setShowMenu(true);
    } else {
      setIsOpen(false);
      setChatMode(null);
      setShowMenu(false);
    }
  };

  const selectMode = (mode: ChatMode) => {
    setChatMode(mode);
    setIsOpen(true);
    setShowMenu(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setChatMode(null);
    setShowMenu(false);
  };

  const switchToAdmin = () => setChatMode('admin');
  const switchToUser = () => setChatMode('user');

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && chatMode && (
          <motion.div
            className="fixed bottom-24 right-6 z-50"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {chatMode === 'user' ? (
              <div className="relative">
                <ChatWidget />
                {canAccessAdmin && (
                  <button
                    onClick={switchToAdmin}
                    className="absolute top-3 right-14 flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-full shadow-md transition-colors"
                    title="Switch to Admin Assistant"
                  >
                    <Shield className="h-3 w-3" />
                    <span>Admin</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <AdminChatWidget onClose={handleClose} />
                <button
                  onClick={switchToUser}
                  className="absolute top-3 right-14 flex items-center gap-1.5 px-2.5 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-full shadow-md transition-colors"
                  title="Switch to User Assistant"
                >
                  <MessageSquare className="h-3 w-3" />
                  <span>User</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode Selection Menu (for admin/staff) */}
      <AnimatePresence>
        {showMenu && !isOpen && canAccessAdmin && (
          <motion.div
            className="fixed bottom-20 right-6 z-50 flex flex-col gap-2"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <button
              onClick={() => selectMode('user')}
              className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-xl shadow-lg border border-gray-200 transition-colors min-w-[180px]"
            >
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">Customer Assistant</div>
                <div className="text-xs text-gray-500">General help & orders</div>
              </div>
            </button>
            <button
              onClick={() => selectMode('admin')}
              className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-xl shadow-lg border border-gray-200 transition-colors min-w-[180px]"
            >
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                <Shield className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">Admin Assistant</div>
                <div className="text-xs text-gray-500">Invoices, inventory & reports</div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating Button */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 px-5 py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/20 backdrop-blur-sm"
        onClick={handleToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {isOpen ? (
          <>
            <X className="h-5 w-5" />
            <span className="font-medium text-sm hidden sm:inline">Close</span>
          </>
        ) : (
          <>
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium text-sm hidden sm:inline">AI Assistant</span>
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
          </>
        )}
      </motion.button>
    </>
  );
}
