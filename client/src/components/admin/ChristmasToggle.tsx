import { useAuth } from "@/lib/auth";
import { useChristmas } from "@/lib/christmas";
import { Snowflake, Star, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function ChristmasToggle() {
  const { isAdmin } = useAuth();
  const { isChristmasMode, toggleChristmasMode } = useChristmas();

  if (!isAdmin) return null;

  return (
    <motion.div
      className="fixed top-20 right-4 z-50"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-2 shadow-xl"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={toggleChristmasMode}
          size="sm"
          className={`relative overflow-hidden rounded-full transition-all duration-500 ${
            isChristmasMode 
              ? 'bg-linear-to-r from-red-600 to-green-600 text-white shadow-lg shadow-red-600/30' 
              : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-1">
            <motion.div
              animate={isChristmasMode ? { rotate: [0, 360] } : { rotate: 0 }}
              transition={{ duration: 2, repeat: isChristmasMode ? Infinity : 0, ease: "linear" }}
            >
              {isChristmasMode ? <Snowflake className="w-4 h-4" /> : <Star className="w-4 h-4" />}
            </motion.div>
            <span className="text-xs font-medium whitespace-nowrap">
              {isChristmasMode ? 'Christmas ON' : 'Christmas OFF'}
            </span>
            <Gift className="w-3 h-3" />
          </div>
          
          {/* Animated background effect */}
          {isChristmasMode && (
            <motion.div
              className="absolute inset-0 bg-linear-to-r from-red-400 to-green-400 opacity-30"
              animate={{
                background: [
                  "linear-gradient(90deg, #ef4444 0%, #22c55e 50%, #ef4444 100%)",
                  "linear-gradient(90deg, #22c55e 0%, #ef4444 50%, #22c55e 100%)",
                  "linear-gradient(90deg, #ef4444 0%, #22c55e 50%, #ef4444 100%)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          )}
        </Button>
      </motion.div>
      
      {/* Admin indicator */}
      <motion.div
        className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
}
