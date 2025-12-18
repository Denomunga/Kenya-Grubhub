import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useData } from "@/lib/data";
import HeroSection from "@/components/home/HeroSection";
import CategoryFilter from "@/components/home/CategoryFilter";
import FeaturedDishes from "@/components/home/FeaturedDishes";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";


interface NewsItem {
  id: string;
  title: string;
  content: string;
  image?: string;
  date?: string;
  views?: number;
  // Add other properties as needed
}

export default function Home() {
  const { menu, reviews } = useData();
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [, setLoadingNews] = useState(false);
  const [, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  
  // Newsletter state
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Parallax scroll effect - optimized with throttling and reduced motion support
  const [scrollY, setScrollY] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  useEffect(() => {
    if (prefersReducedMotion) return;
    
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Scroll-based font weight - memoized
  const fontWeight = useMemo(() => 
    Math.min(900, Math.max(400, 400 + scrollY / 10)), 
    [scrollY]
  );
  
  
  // Fetch news on component mount
  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Replace with your actual news fetching logic
        const response = await fetch('/api/news');
        const data = await response.json();

        // Normalize response so `news` is always an array
        const normalized: NewsItem[] = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.news)
            ? (data as any).news
            : [];

        setNews(normalized);
      } catch (error) {
        console.error('Error fetching news:', error);
      }
    };
    
    fetchNews();
    
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  
  // Filter menu items based on active category - memoized
  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return menu;
    return menu.filter(item => item.category?.toLowerCase() === activeCategory.toLowerCase());
  }, [menu, activeCategory]);
    
  const featuredItems = useMemo(() => filteredItems.slice(0, 6), [filteredItems]);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Newsletter subscription handler - optimized
  const handleNewsletterSubscribe = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubscriptionStatus('error');
      setSubscriptionMessage('Please enter a valid email address');
      return;
    }

    setIsSubscribing(true);
    setSubscriptionStatus('idle');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          preferences: {
            specialOffers: true,
            newProducts: true,
            events: true,
            news: true
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubscriptionStatus('success');
        setSubscriptionMessage(data.message);
        setEmail('');
      } else {
        setSubscriptionStatus('error');
        setSubscriptionMessage(data.message || 'Subscription failed');
      }
    } catch (error) {
      setSubscriptionStatus('error');
      setSubscriptionMessage('An error occurred. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  }, [email]);


  const closeNewsModal = () => {
    setSelectedNewsId(null);
    setSelectedNews(null);
    // return to previous URL if present; otherwise navigate to home
    try {
      if (parseInt(window.history.length.toString()) > 1) {
        window.history.back();
      } else {
        setLocation('/');
      }
    } catch (e) { 
      try { 
        setLocation('/'); 
      } catch (er) {} 
    }
  };

  const openNewsModal = async (id: string, push: boolean = true) => {
    setSelectedNewsId(id);
    setLoadingNews(true);
    
    try {
      setSelectedNews(null);
      
      // Track the view
      try {
        if (/^[0-9a-fA-F]{24}$/.test(id)) {
          const response = await fetch(`/api/news/${id}/view`, { 
            method: 'POST', 
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            // Update the view count in the modal
            setSelectedNews((prev: any) => prev ? { ...prev, views: data.views } : null);
            // Also update the news item in the list if it exists
            setNews((prev: any[]) => 
              prev.map(item => 
                item.id === id ? { ...item, views: data.views } : item
              )
            );
          }
        }
      } catch (error) {
        console.error('Error tracking view:', error);
      }
      
      // push new URL to make it linkable
      if (push) {
        try { window.history.pushState({}, '', `/news/${id}`); } catch (e) {}
      }
    } catch (err) {
      setSelectedNews(null);
    } finally {
      setLoadingNews(false);
    }
  };

  React.useEffect(() => {
    if (!selectedNewsId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNewsModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNewsId]);

  // Focus trap for modal
  React.useEffect(() => {
    if (!selectedNewsId) return;
    const prevActive = document.activeElement as HTMLElement | null;
    // focus close button
    setTimeout(() => { closeButtonRef.current?.focus(); }, 30);

    const focusableSelector = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const modal = modalRef.current;
      if (!modal) return;
      const nodes = Array.from(modal.querySelectorAll(focusableSelector)) as HTMLElement[];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      if (prevActive) prevActive.focus();
    };
  }, [selectedNewsId]);

  React.useEffect(() => {
    const onPop = () => {
      // if we are no longer on a /news/:id path but we have modal open, close it
      try {
        const path = window.location.pathname;
        if (!path.startsWith('/news/') && selectedNewsId) closeNewsModal();
        else if (path.startsWith('/news/')) {
          const id = path.split('/')[2];
          if (id && id !== selectedNewsId) openNewsModal(id, false);
        }
      } catch (err) {}
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [selectedNewsId]);

  return (
    <div className="min-h-screen bg-background gradient-mesh particle-container">
      {/* Hero Section */}
      <div className="relative">
        <HeroSection />
      </div>
      
      <main className="container mx-auto px-4 py-16 relative z-10">
        <div className="relative z-32">
          <CategoryFilter 
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>
        
        <div>
          <FeaturedDishes 
            items={featuredItems}
            isLoading={isLoading}
          />
        </div>
        
        {/* View Full Menu Button - Integrated with Featured Dishes */}
        <div className="text-center mt-12 mb-8 relative z-20">
          <Button 
            asChild 
            variant="default" 
            size="lg" 
            className="group bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 px-10 py-4 text-lg font-semibold border-0 relative z-30 pointer-events-auto rounded-full hover:scale-105 active:scale-95"
          >
            <Link href="/menu">
              View Full Menu
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-2" />
            </Link>
          </Button>
        </div>
        
        {/* Professional divider */}
        <div className="relative py-16">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full max-w-4xl h-px bg-linear-to-r from-transparent via-blue-200 to-transparent"></div>
          </div>
          <div className="relative flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-8 h-8 bg-background rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Testimonials Section */}
        <motion.section 
          className="py-24 relative overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={!prefersReducedMotion ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-linear-to-br from-primary/3 via-secondary/2 to-background pointer-events-none"></div>
          <div className="container mx-auto px-4 relative z-10">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={!prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.h2 
                className="text-4xl md:text-6xl font-bold font-serif mb-6 bg-linear-to-r from-primary via-secondary to-primary bg-clip-text text-transparent"
                style={{ '--font-weight': fontWeight } as React.CSSProperties}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                What Our Customers Say
              </motion.h2>
              <motion.div 
                className="w-32 h-1 bg-linear-to-r from-primary to-secondary mx-auto mb-8 rounded-full shadow-lg"
                initial={{ width: 0 }}
                whileInView={{ width: 128 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              ></motion.div>
              <motion.p 
                className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Don't just take our word for it. Here's what our customers have to say about us.
              </motion.p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {reviews.slice(0, 3).map((review, index) => (
                <motion.div 
                  key={review.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="pointer-events-auto"
                >
                  <Card className="h-full p-8 bg-white/80 backdrop-blur-sm border border-primary/10 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl">
                    <div className="flex items-center mb-6">
                      {[...Array(5)].map((_, i) => (
                        <motion.svg
                          key={i}
                          className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 + i * 0.05 }}
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </motion.svg>
                      ))}
                    </div>
                    <p className="text-foreground mb-6 italic text-lg leading-relaxed line-clamp-3">"{review.comment}"</p>
                    <div className="font-semibold text-lg text-gradient">{review.user}</div>
                    <div className="text-sm text-muted-foreground font-medium">Verified Customer</div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
        
        {/* Newsletter Section */}
        <motion.section 
          className="py-20 relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-secondary/3 to-primary/5"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto">
              <motion.div 
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <motion.h2 
                  className="text-4xl md:text-5xl font-bold font-serif mb-6 bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Stay Connected
                </motion.h2>
                <motion.div 
                  className="w-24 h-1 bg-linear-to-r from-primary to-secondary mx-auto mb-8 rounded-full shadow-lg"
                  initial={{ width: 0 }}
                  whileInView={{ width: 96 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                ></motion.div>
                <motion.p 
                  className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  Get exclusive offers, new menu updates, and special events delivered directly to your inbox.
                </motion.p>
              </motion.div>
              
              <motion.div 
                className="bg-white/60 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-primary/10 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <form onSubmit={handleNewsletterSubscribe} className="flex flex-col sm:flex-row gap-4 w-full">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-6 py-4 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                    disabled={isSubscribing}
                  />
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      type="submit"
                      disabled={isSubscribing}
                      className="bg-linear-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8 py-4 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-0 rounded-xl min-w-[140px]"
                    >
                      {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                    </Button>
                  </motion.div>
                </form>
                
                {/* Subscription Status Messages */}
                <AnimatePresence>
                  {subscriptionStatus !== 'idle' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex items-center gap-2 p-4 rounded-xl text-sm mt-4 ${
                        subscriptionStatus === 'success' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {subscriptionStatus === 'success' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                      {subscriptionMessage}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </main>
      
      {/* News & Events */}
      <motion.section 
        className="py-20 bg-blue-50 relative overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 bg-linear-to-br from-blue-100 to-white"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h2 
              className="text-4xl md:text-5xl font-heading font-bold mb-4 text-blue-600"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Latest News & Updates
            </motion.h2>
            <motion.div 
              className="w-24 h-1 bg-blue-600 mx-auto mb-6 shadow-glow"
              initial={{ width: 0 }}
              whileInView={{ width: 96 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            ></motion.div>
            <motion.p 
              className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Stay updated with the latest trends, offers, and news from our fashion store
            </motion.p>
          </motion.div>

          <AnimatePresence>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {news.map((item) => (
                <div key={item.id} className="h-full">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="h-full"
                  >
                  <Card 
                    className="h-full flex flex-col overflow-hidden card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                    onClick={() => openNewsModal(item.id)}
                  >
                    {item.image && (
                      <div className="relative pt-[60%] overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    )}
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 text-sm text-blue-600 font-medium mb-4">
                        <Clock className="h-4 w-4" />
                        <span>{item.date ? new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No date'}</span>
                      </div>
                      <h3 className="text-xl font-bold mb-4 font-heading line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">{item.title}</h3>
                      <p className="text-muted-foreground mb-6 line-clamp-3 flex-1 leading-relaxed">{item.content}</p>
                      <div className="flex justify-between items-center mt-auto pt-4 border-t border-border">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-blue-600 hover:text-blue-700 font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              openNewsModal(item.id);
                            }}
                          >
                            Read More <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </Button>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                </div>
              ))}
            </div>
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Location & Info */}
      <motion.section 
        className="py-20 grid md:grid-cols-2 min-h-[600px] max-w-7xl mx-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div 
          className="bg-blue-600 text-white p-12 flex flex-col justify-center relative overflow-hidden rounded-3xl m-4 shadow-2xl card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow"
          initial={{ x: -100 }}
          whileInView={{ x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
          <div className="max-w-md mx-auto w-full relative z-10">
            <motion.h2 
              className="text-4xl md:text-5xl font-bold mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Visit Our Location
            </motion.h2>
            
            <div className="space-y-8">
              <motion.div 
                className="flex gap-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl h-fit border border-white/30 shadow-lg">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">Westlands Location</h3>
                  <p className="text-white/90 leading-relaxed">123 Mpaka Road, Westlands</p>
                  <p className="text-white/90">Nairobi, Kenya</p>
                </div>
              </motion.div>

              <motion.div 
                className="flex gap-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl h-fit border border-white/30 shadow-lg">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">Opening Hours</h3>
                  <p className="text-white/90 leading-relaxed">Monday - Friday: 11am - 10pm</p>
                  <p className="text-white/90 leading-relaxed">Weekends: 10am - 11pm</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
        <motion.div 
          className="bg-white relative h-[600px] md:h-auto rounded-3xl m-4 shadow-2xl overflow-hidden card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow"
          initial={{ x: 100 }}
          whileInView={{ x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Professional Map Placeholder */}
          <div className="absolute inset-0 bg-linear-to-br from-blue-50 to-white flex items-center justify-center">
            <div className="text-center p-8">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mb-6"
              >
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-xl mx-auto">
                  <MapPin className="h-10 w-10 text-white" />
                </div>
              </motion.div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Find Us Easily</h3>
              <p className="text-muted-foreground mb-4">Located in the heart of Westlands</p>
              <div className="w-full h-32 bg-muted/30 rounded-xl border border-border/20 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Interactive Map</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}

// Function to fetch news by ID

