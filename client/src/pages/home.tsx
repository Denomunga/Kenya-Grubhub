import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useData } from "@/lib/data";
import { apiFetch } from "@/lib/api";
import HeroSection from "@/components/home/HeroSection";
import CategoryFilter from "@/components/home/CategoryFilter";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import ProductSearch from "@/components/search/ProductSearch";
import JobAdvertBanner from "@/components/home/JobAdvertBanner";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, MapPin, Eye, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { SEOMetaTags } from "@/components/seo/SEOMetaTags";
import ChatWidget from '@/components/ChatWidget';
import { useWebsiteStructuredData } from "@/components/seo/StructuredData";
import { useIntersectionObserver } from "@/hooks/usePerformanceOptimizations";

const LazyInteractiveMap = React.lazy(() => import("@/components/home/InteractiveMap"));


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
  const { menu, reviews, fetchReviewsFromServer, news } = useData(); // ✅ Use global news state
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchedProducts, setSearchedProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLoadingNews] = useState(false);
  const [, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  // const [news, setNews] = useState<NewsItem[]>([]); // ❌ Remove local news state
  const [chatOpen, setChatOpen] = useState(false);
  const [businessLocation, setBusinessLocation] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // SEO structured data
  const websiteStructuredData = useWebsiteStructuredData();

  const mapObserver = useIntersectionObserver(
    {
      threshold: 0.01,
      rootMargin: '300px'
    },
    true
  );
  
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
  
  // Fetch business location
  useEffect(() => {
    const fetchBusinessLocation = async () => {
      try {
        const response = await fetch('/api/business-location');
        if (response.ok) {
          const data = await response.json();
          setBusinessLocation(data);
        } else {
          // Business location is optional - don't show error
          setBusinessLocation(null);
        }
      } catch (error) {
        // Business location is optional - don't show error
        setBusinessLocation(null);
      } finally {
        setLocationLoading(false);
      }
    };
    
    fetchBusinessLocation();
  }, []);
  
  

  // ✅ News is now fetched from global DataContext, no need for local fetching
  useEffect(() => {
    // Fetch live reviews from server
    fetchReviewsFromServer();
    
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [fetchReviewsFromServer]);
  
  // Filter menu items based on active category and search - memoized
  const filteredItems = useMemo(() => {
    const baseItems = searchedProducts.length > 0 ? searchedProducts : menu;
    if (activeCategory === 'all') return baseItems;
    return baseItems.filter(item => item.category?.toLowerCase() === activeCategory.toLowerCase());
  }, [menu, activeCategory, searchedProducts]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menu.forEach((m: any) => {
      if (m?.category && typeof m.category === 'string') set.add(m.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [menu]);
    
  const featuredItems = useMemo(() => filteredItems.slice(0, 6), [filteredItems]);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);


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
          const response = await apiFetch(`/api/news/${id}/view`, { 
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
            // ✅ View count updates are handled by global DataContext
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
    <>
      <SEOMetaTags 
        title="Premium Laptops, Mobiles & Stationery in Kenya"
        description="Shop premium laptops, mobiles, and stationery in Kenya. HP, Dell, Lenovo, Asus, Apple MacBooks, and more. Fast delivery across Kenya with secure checkout."
        keywords="laptops Kenya, mobiles Kenya, stationery Kenya, HP laptops, Dell laptops, Lenovo laptops, Asus laptops, Apple MacBooks, Microsoft Surface, mobile phones Nairobi, electronics Kenya, online shopping Kenya"
        structuredData={websiteStructuredData}
      />
      <div className="min-h-screen bg-background gradient-mesh particle-container">
      {/* Job Advert Banner - visible to all users */}
      <JobAdvertBanner />
      {/* Hero Section */}
      <div className="relative">
        <HeroSection />
      </div>
      
      <main className="relative z-10">
        <div className="container mx-auto px-6 py-12 sm:py-16 lg:py-20">
          <div className="relative z-32">
            {/* Search Component */}
            <ProductSearch
              products={menu}
              onFilteredProducts={setSearchedProducts}
              className="mb-6 sm:mb-8 max-w-4xl mx-auto"
            />

            <CategoryFilter
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              categories={categories}
            />
          </div>
        </div>

        <FeaturedProducts
          items={featuredItems}
          isLoading={isLoading}
        />

        <div className="container mx-auto px-6">
          {/* View Full Menu Button */}
          <div className="text-center py-16 relative z-20">
            <Button
              asChild
              variant="default"
              size="lg"
              className="group bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-12 py-4 text-base font-medium border-0 relative z-30 pointer-events-auto rounded-xl hover:scale-105 active:scale-95"
            >
              <Link href="/menu">
                View All Products
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-2" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Testimonials Section */}
        <motion.section
          className="py-28"
          initial={{ opacity: 0 }}
          whileInView={!prefersReducedMotion ? { opacity: 1 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="container mx-auto px-4">
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
                  <Card className="h-full p-8 bg-background/70 backdrop-blur-sm border border-border shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl">
                    <div className="flex items-center mb-6">
                      {[...Array(5)].map((_, i) => (
                        <motion.svg
                          key={i}
                          className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400' : 'text-muted-foreground/40'}`}
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
      </main>

      {/* News & Events */}
      <motion.section
        className="py-24 relative"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h2 
              className="text-4xl md:text-5xl font-heading font-bold mb-4 text-foreground"
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
              Stay updated with the latest trends, offers, and news!
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
                    className="h-full flex flex-col overflow-hidden bg-background/70 border border-border card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
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
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mb-4">
                        <Clock className="h-4 w-4" />
                        <span>{item.date ? new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No date'}</span>
                        {typeof item.views === 'number' && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Eye className="h-4 w-4" />
                            <span>{item.views.toLocaleString()}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-4 font-heading line-clamp-2 group-hover:text-primary transition-colors duration-300">{item.title}</h3>
                      <p className="text-muted-foreground mb-6 line-clamp-3 flex-1 leading-relaxed">{item.content}</p>
                      <div className="flex justify-between items-center mt-auto pt-4 border-t border-border">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-primary hover:text-primary/80 font-medium"
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
        className="py-24 grid md:grid-cols-2 min-h-[600px] max-w-7xl mx-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="bg-linear-to-br from-blue-600 to-blue-700 text-white p-14 flex flex-col justify-center relative overflow-hidden rounded-2xl m-6 shadow-xl card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow"
          initial={{ x: -100 }}
          whileInView={{ x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
          <div className="max-w-md mx-auto w-full relative z-10">
            {locationLoading ? (
              <>
                <motion.h2 
                  className="text-4xl md:text-5xl font-bold mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Loading...
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
                      <h3 className="font-bold text-xl mb-2">Loading location...</h3>
                      <p className="text-white/90 leading-relaxed">Please wait while we load the business location.</p>
                    </div>
                  </motion.div>
                </div>
              </>
            ) : businessLocation ? (
              <>
                <motion.h2 
                  className="text-4xl md:text-5xl font-bold mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  {businessLocation.name}
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
                      <h3 className="font-bold text-xl mb-2">{businessLocation.name}</h3>
                      <p className="text-white/90 leading-relaxed">{businessLocation.address}</p>
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
                      <div className="text-white/90 leading-relaxed">
                        <p>Monday - Friday: {businessLocation.openingHours.monday || businessLocation.openingHours.friday}</p>
                        <p>Weekends: {businessLocation.openingHours.saturday || businessLocation.openingHours.sunday}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </>
            ) : (
              <>
                <motion.h2 
                  className="text-4xl md:text-5xl font-bold mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Location Coming Soon
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
                      <h3 className="font-bold text-xl mb-2">Waiting for Admin</h3>
                      <p className="text-white/90 leading-relaxed">
                        Please wait for the administrator to add the business location. 
                        This will help you find us easily and get directions.
                      </p>
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
                      <div className="text-white/90 leading-relaxed">
                        <p>Monday - Friday: 11am - 10pm</p>
                        <p>Weekends: 10am - 11pm</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </div>
        </motion.div>
        <motion.div 
          className="bg-white relative h-[600px] md:h-auto rounded-3xl m-4 shadow-2xl overflow-hidden card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow"
          initial={{ x: 100 }}
          whileInView={{ x: 0 }}
          transition={{ duration: 0.6 }}
          ref={mapObserver.ref as any}
        >
          {mapObserver.hasBeenVisible ? (
            <React.Suspense
              fallback={<div className="h-[600px] w-full bg-muted" />}
            >
              <LazyInteractiveMap />
            </React.Suspense>
          ) : (
            <div className="h-[600px] w-full bg-muted" />
          )}
        </motion.div>
      </motion.section>
    </div>

      {/* Floating AI Chat */}
      {chatOpen && (
        <div className="fixed bottom-20 right-6 z-50">
          <ChatWidget />
        </div>
      )}
      <Button
        className="fixed bottom-6 right-6 z-50 rounded-full h-12 w-12 shadow-lg"
        size="icon"
        onClick={() => setChatOpen(!chatOpen)}
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
    </>
  );
}

// Function to fetch news by ID

