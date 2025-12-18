import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Gift, TreePine } from "lucide-react";
import { Link } from 'wouter';
import { motion } from "framer-motion";
import { useChristmas } from "@/lib/christmas";
import heroImage from "@assets/generated_images/abc.jpg";
const HeroSection = () => {
  const { isChristmasMode } = useChristmas();

  // Professional Realistic Santa decoration
  const SantaWithGifts = () => (
    <motion.div 
      className="absolute bottom-16 right-16 pointer-events-none"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, delay: 0.5 }}
    >
      <div className="relative">
        {/* Santa Figure - Realistic proportions */}
        <div className="relative w-20 h-24">
          {/* Santa Body */}
          <div className="absolute bottom-0 w-full h-16 bg-linear-to-b from-red-700 to-red-800 rounded-t-2xl shadow-xl">
            {/* White trim on suit */}
            <div className="absolute top-0 w-full h-3 bg-white rounded-t-lg"></div>
            {/* Belt */}
            <div className="absolute top-8 w-full h-2 bg-black">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-3 bg-yellow-500 rounded-sm shadow-md"></div>
            </div>
          </div>
          
          {/* Santa Head */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-linear-to-br from-rose-50 to-rose-100 rounded-full shadow-lg">
            {/* Eyes */}
            <div className="absolute top-3 left-2 w-1.5 h-1.5 bg-blue-900 rounded-full"></div>
            <div className="absolute top-3 right-2 w-1.5 h-1.5 bg-blue-900 rounded-full"></div>
            {/* Nose */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-2 h-1.5 bg-red-400 rounded-full"></div>
            {/* Beard */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-14 h-6 bg-linear-to-b from-white to-gray-100 rounded-b-2xl shadow-md">
              {/* Beard texture lines */}
              <div className="absolute top-1 left-2 w-0.5 h-3 bg-gray-200 rounded-full opacity-50"></div>
              <div className="absolute top-1 right-2 w-0.5 h-3 bg-gray-200 rounded-full opacity-50"></div>
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-gray-200 rounded-full opacity-50"></div>
            </div>
          </div>
          
          {/* Santa Hat */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
            <div className="w-0 h-0 border-l-12 border-l-transparent border-r-12 border-r-transparent border-b-16 border-b-red-600 shadow-lg">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-md"></div>
            </div>
          </div>
          
          {/* Arms holding gift */}
          <div className="absolute top-12 -left-2 w-3 h-8 bg-red-700 rounded-full shadow-md transform rotate-12"></div>
          <div className="absolute top-12 -right-2 w-3 h-8 bg-red-700 rounded-full shadow-md transform -rotate-12"></div>
          
          {/* Gift Box */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-linear-to-br from-green-600 to-green-700 rounded shadow-lg border border-green-800/20">
            {/* Ribbon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-0.5 bg-yellow-500"></div>
              <div className="absolute w-0.5 h-full bg-yellow-500"></div>
            </div>
            {/* Bow */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex gap-0.5">
              <div className="w-2 h-1.5 bg-yellow-500 rounded-sm transform rotate-12"></div>
              <div className="w-2 h-1.5 bg-yellow-500 rounded-sm transform -rotate-12"></div>
            </div>
          </div>
        </div>
        
        {/* Sitting on stylized Christmas tree */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 h-8 bg-linear-to-b from-green-700 to-green-800 rounded-t-full shadow-lg">
          {/* Tree layers */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-6 bg-linear-to-b from-green-600 to-green-700 rounded-t-full"></div>
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-4 bg-linear-to-b from-green-500 to-green-600 rounded-t-full"></div>
          {/* Star on top */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-400 rotate-45 shadow-md"></div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.section 
      className="relative h-[500px] sm:h-[600px] md:h-[700px] w-full overflow-hidden rounded-3xl mb-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0">
        <motion.img
          src={heroImage}
          alt="Modern Kenyan fashion and lifestyle"
          className="w-full h-full object-cover"
          loading="eager"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <div className={`absolute inset-0 ${
          isChristmasMode 
            ? 'bg-black/20' 
            : 'bg-linear-to-r from-black/80 via-black/50 to-black/30'
        }`}></div>
        {isChristmasMode && <SantaWithGifts />}
      </div>
      
      <motion.div 
        className="relative z-10 h-full flex items-center justify-center text-white px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="w-full max-w-5xl mx-auto text-center flex flex-col items-center justify-center space-y-6">
          <motion.div 
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-md border shadow-lg ${
              isChristmasMode 
                ? 'bg-linear-to-r from-blue-600/20 to-blue-700/20 border-blue-300/30' 
                : 'bg-linear-to-r from-primary/20 to-secondary/20 border-white/20'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              {isChristmasMode ? (
                <TreePine className="w-4 h-4 text-green-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-yellow-400" />
              )}
            </motion.div>
            <span className="text-sm font-medium text-white">
              {isChristmasMode ? '🎄 Magical Christmas Collection' : 'Experience Authentic Kenyan Fashion'}
            </span>
          </motion.div>
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-6xl font-bold font-serif mb-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {isChristmasMode ? (
              <span className="text-gradient bg-clip-text text-transparent bg-linear-to-r from-red-400 via-green-400 to-red-600 animate-pulse">🎄 Magical Christmas Collection</span>
            ) : (
              <>Discover the Style of <span className="text-gradient bg-clip-text text-transparent bg-linear-to-r from-yellow-400 via-orange-400 to-red-400">Kenya</span></>
            )}
          </motion.h1>
          <motion.p 
            className="text-lg sm:text-xl md:text-2xl text-white leading-relaxed text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            {isChristmasMode ? (
              <>🎅 Step into our winter wonderland! Experience the enchantment of Christmas with exclusive Kenyan designs that blend traditional craftsmanship with festive magic. Perfect for spreading joy and style this magical season! 🎁</>
            ) : (
              <>Explore our curated collection featuring traditional designs with modern elegance, crafted with authentic Kenyan materials and timeless style.</>
            )}
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                asChild
                size="default"
                className={`px-4 py-2 text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-full border-0 ${
                  isChristmasMode 
                    ? 'bg-linear-to-r from-red-600 via-green-600 to-red-600 text-white shadow-red-600/30 hover:shadow-red-600/40 animate-gradient bg-size-[200%_100%]' 
                    : 'bg-linear-to-r from-primary to-secondary text-white shadow-primary/30 hover:shadow-primary/40'
                }`}
              >
                <Link href="/menu">
                  {isChristmasMode ? (
                    <>🎄 Christmas Magic <Gift className="ml-1 h-4 w-4" /></>
                  ) : (
                    <>View Collection <ArrowRight className="ml-1 h-4 w-4" /></>
                  )}
                </Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                asChild
                variant="outline"
                size="default"
                className={`px-4 py-2 text-sm font-semibold backdrop-blur-sm hover:bg-white/10 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-full ${
                  isChristmasMode 
                    ? 'text-white border-2 border-gradient bg-linear-to-r from-red-600/20 to-green-600/20 hover:from-red-600/30 hover:to-green-600/30' 
                    : 'text-white border-2 border-white/30 hover:border-white/50'
                }`}
              >
                <Link href="/chat">
                  {isChristmasMode ? '🎅 Book Holiday Experience' : 'Book Consultation'}
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.section>
  );
};

export default HeroSection;
