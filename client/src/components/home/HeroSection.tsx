import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from 'wouter';
import { motion } from "framer-motion";
import heroImage from "@assets/generated_images/a.jpeg";
const HeroSection = () => {

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
          alt="Modern Kenyan Laptops, Stationery, Computer Accessories, and Repairs"
          className="w-full h-full object-cover"
          loading="eager"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/50 to-black/30"></div>
      </div>
      
      <motion.div 
        className="relative z-10 h-full flex items-center justify-center text-white px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="w-full max-w-5xl mx-auto text-center flex flex-col items-center justify-center space-y-6">
          <motion.div 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-md border shadow-lg bg-linear-to-r from-primary/20 to-secondary/20 border-white/20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </motion.div>
            <span className="text-sm font-medium text-white">
              Ms-Computers And Repairs
            </span>
          </motion.div>
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-6xl font-bold font-serif mb-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <>Discover <span className="text-gradient bg-clip-text text-transparent bg-linear-to-r from-yellow-400 bg-black">TECHNOLOGY</span></>
          </motion.h1>
          <motion.p 
            className="text-lg sm:text-xl md:text-2xl text-white leading-relaxed text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <>Explore our curated collection featuring XUK Laptops, XUS Laptops, Computers Accessories, Computer Repairs and Stationeries, with modern elegance, and a touch of sophistication.</>
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
                className="px-4 py-2 text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-full border-0 bg-linear-to-r from-primary to-secondary text-white shadow-primary/30 hover:shadow-primary/40"
              >
                <Link href="/menu">
                  <>View Collection <ArrowRight className="ml-1 h-4 w-4" /></>
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
                className="px-4 py-2 text-sm font-semibold backdrop-blur-sm hover:bg-white/10 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-full text-white border-2 border-white/30 hover:border-white/50"
              >
                <Link href="/chat">
                  ASK FOR DISCOUNT
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
