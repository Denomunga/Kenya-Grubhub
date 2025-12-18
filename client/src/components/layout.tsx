import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useChristmas } from "@/lib/christmas";
import { Button } from "@/components/ui/button";
import { 
  Menu, X, UtensilsCrossed, MapPin, 
  MessageSquare, LayoutDashboard, Gift
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import FloatingActionButton from "@/components/ui/FloatingActionButton";
import { ChristmasToggle } from "@/components/admin/ChristmasToggle";
import { ScrollProgressIndicator } from "@/hooks/useSmoothScroll";
import { GlassCard, MagneticButton } from "@/components/ui/ProfessionalEffects";
import "@/styles/design-system.css";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, isAdmin, isStaff } = useAuth();
  const { isChristmasMode } = useChristmas();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = location === href;
    return (
      <Link href={href}>
        <motion.div 
          className={`cursor-pointer text-sm font-bold transition-all duration-300 relative px-4 py-2 rounded-xl card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow ${
            isActive 
              ? isChristmasMode 
                ? "bg-red-100 text-red-800 shadow-xl border-red-300" 
                : "bg-blue-100 text-blue-800 shadow-xl border-blue-300"
              : isChristmasMode
                ? "bg-white text-red-700 hover:bg-red-50 border-2 border-red-600 hover:border-red-700"
                : "bg-white text-blue-700 hover:bg-blue-50 border-2 border-blue-600 hover:border-blue-700"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {children}
          {isActive && (
            <motion.div 
              className={`absolute bottom-0 left-0 right-0 h-1 mx-auto ${
                isChristmasMode 
                  ? "bg-red-600" 
                  : "bg-blue-600"
              }`}
              layoutId="activeTab"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </motion.div>
      </Link>
    );
  };

  // Remove unused function
  // const GlobalSnowEffect = () => null;

  return (
    <div className={`min-h-screen flex flex-col font-sans relative bg-white text-black`}>
      {/* Global Christmas Snow Effect - Very Subtle */}
      {isChristmasMode && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={`global-snow-${i}`}
              className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5px`,
              }}
              animate={{
                y: ["0vh", "100vh"],
                opacity: [0, 0.3, 0.1, 0],
              }}
              transition={{
                duration: Math.random() * 8 + 15,
                repeat: Infinity,
                delay: Math.random() * 15,
                ease: "linear",
              }}
            />
          ))}
        </div>
      )}
      
      {/* Scroll Progress Indicator */}
      <ScrollProgressIndicator />
      
      {/* Navbar */}
      <motion.header 
        className="sticky top-0 z-50 w-full border-b glass shadow-lg"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <motion.div 
              className="flex items-center gap-2 cursor-pointer group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className={`p-1.5 rounded-xl shadow-xl group-hover:shadow-2xl transition-shadow duration-300 ${
                isChristmasMode 
                  ? 'bg-blue-600' 
                  : 'bg-blue-600'
              }`}>
                <motion.div 
                  className="text-white"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  {isChristmasMode ? (
                    <Gift className="h-6 w-6" />
                  ) : (
                    <UtensilsCrossed className="h-6 w-6" />
                  )}
                </motion.div>
              </div>
              <span className={`font-heading text-2xl font-bold tracking-tight flex items-center gap-2 ${
                isChristmasMode 
                  ? 'text-gradient-christmas' 
                  : 'text-gradient-primary'
              }`}>
                {isChristmasMode && (
                  <div className="flex items-center gap-1">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                      className="text-lg"
                    >
                      🎄
                    </motion.div>
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                      className="text-xl"
                    >
                      🎄
                    </motion.div>
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                      className="text-lg"
                    >
                      🎄
                    </motion.div>
                  </div>
                )}
                WATHII
              </span>
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/menu">Products</NavLink>
            <NavLink href="/chat">Chat with Staff</NavLink>
            
            {(isAdmin || isStaff) && (
              <Link href="/dashboard">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <div className={`cursor-pointer text-sm font-bold transition-all duration-300 relative px-4 py-2 rounded-xl card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow gap-2 flex items-center ${
                    isChristmasMode 
                      ? 'bg-red-100 text-red-800 shadow-xl border-red-300 hover:bg-red-200' 
                      : 'bg-blue-100 text-blue-800 shadow-xl border-blue-300 hover:bg-blue-200'
                  }`}>
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </div>
                </motion.div>
              </Link>
            )}
          </nav>

          {/* User Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-primary/10 transition-colors">
                      <Avatar className="h-10 w-10 border-2 border-gradient shadow-glow-hover">
                        <AvatarImage src={user?.avatar} alt={user?.name} />
                        <AvatarFallback className="bg-linear-to-br from-primary/20 to-secondary/20 text-primary font-bold">
                          {user?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass border-gradient shadow-xl">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user?.name && <p className="font-medium text-gradient">{user.name}</p>}
                      {user?.username && <p className="w-[200px] truncate text-sm text-muted-foreground">@{user.username}</p>}
                    </div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer w-full hover:bg-primary/10 transition-colors">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer hover:bg-destructive/10 transition-colors">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/login">
                  <MagneticButton className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300">
                    Login
                  </MagneticButton>
                </Link>
              </motion.div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <motion.button 
            className="md:hidden p-2 rounded-lg hover:bg-primary/10 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              {mobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.header>

      {/* Mobile Menu Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Sidebar */}
            <motion.div
              className="md:hidden fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 overflow-hidden border-l border-gray-200"
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.8 }}
            >
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-blue-50"></div>
                <div 
                  className="absolute inset-0" 
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                  }}
                ></div>
              </div>

              {/* Header with Glass Effect */}
              <div className="relative p-6 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                  >
                    <h2 className="text-2xl font-bold text-blue-600">
                      Navigation
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Explore WATHII</p>
                  </motion.div>
                  <motion.button
                    className="p-3 rounded-full bg-blue-100 hover:bg-blue-200 transition-all duration-300 border border-blue-200 shadow-lg hover:shadow-xl"
                    onClick={() => setMobileMenuOpen(false)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="h-5 w-5 text-primary" />
                  </motion.button>
                </div>
              </div>

              {/* Navigation Items with Enhanced Styling */}
              <div className="relative p-6 space-y-3">
                {[
                  { href: "/", label: "Home", icon: "🏠", desc: "Welcome page" },
                  { href: "/menu", label: "Products", icon: "🛍️", desc: "Browse items" },
                  { href: "/chat", label: "Chat", icon: "💬", desc: "Talk to staff" },
                  ...(isAdmin || isStaff ? [{ href: "/dashboard", label: "Dashboard", icon: "📊", desc: "Admin panel", special: true }] : [])
                ].map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 * index, type: "spring", stiffness: 300 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href={item.href}>
                      <motion.span 
                        className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 relative overflow-hidden ${
                          item.special 
                            ? "bg-blue-100 border border-blue-300 shadow-lg shadow-blue-100" 
                            : "hover:bg-blue-50 border border-gray-200 hover:border-blue-200"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                        whileHover={{ boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
                      >
                        {/* Hover Effect Background */}
                        <div className="absolute inset-0 bg-blue-50 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Icon Container */}
                        <motion.div 
                          className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                            item.special 
                              ? "bg-blue-600 text-white shadow-lg" 
                              : "bg-blue-100 text-blue-600"
                          }`}
                          whileHover={{ rotate: 360, scale: 1.1 }}
                          transition={{ duration: 0.6, type: "spring" }}
                        >
                          {item.icon}
                        </motion.div>
                        
                        {/* Text Content */}
                        <div className="flex-1 relative z-10">
                          <div className="font-semibold text-foreground">{item.label}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                        
                        {/* Arrow */}
                        <motion.div 
                          className="shrink-0 text-muted-foreground"
                          whileHover={{ x: 3 }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </motion.div>
                      </motion.span>
                    </Link>
                  </motion.div>
                ))}
                
                {/* Auth Section with Enhanced Styling */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                  className="pt-6 mt-6 border-t border-gradient/20"
                >
                  {isAuthenticated ? (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.span 
                        className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-300 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"
                        onClick={() => { logout(); setMobileMenuOpen(false); }}
                        whileHover={{ boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.2)" }}
                      >
                        <motion.div 
                          className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-red-600 text-white shadow-lg"
                          whileHover={{ rotate: 360, scale: 1.1 }}
                          transition={{ duration: 0.6, type: "spring" }}
                        >
                          🚪
                        </motion.div>
                        <div className="flex-1">
                          <div className="font-semibold text-destructive">Logout</div>
                          <div className="text-xs text-muted-foreground">Sign out of account</div>
                        </div>
                        <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </motion.span>
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link href="/login">
                        <motion.div
                          className="relative overflow-hidden rounded-2xl"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="absolute inset-0 bg-blue-600"></div>
                          <Button 
                            className="w-full relative z-10 bg-transparent hover:bg-transparent text-white font-semibold py-4 border-0 shadow-2xl"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <div className="flex items-center justify-center gap-3">
                              <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                              >
                                🔐
                              </motion.div>
                              <span>Login to Account</span>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                            </div>
                          </Button>
                        </motion.div>
                      </Link>
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* Footer in Sidebar */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 bg-white"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
              >
                <div className="text-center">
                  <div className="text-xs text-muted-foreground font-medium">WATHII</div>
                  <div className="text-xs text-muted-foreground mt-1">Premium Fashion Experience</div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className={`py-16 relative overflow-hidden ${
        isChristmasMode 
          ? 'bg-blue-600 text-white' 
          : 'bg-blue-600 text-white'
      }`}>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 left-0 w-full h-full shimmer opacity-20"></div>
        {isChristmasMode && (
          <GlassCard className="absolute inset-0 bg-white/5">
            <div className="absolute inset-0">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={`footer-snow-${i}`}
                  className="absolute w-1 h-1 bg-white rounded-full opacity-40"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -10, 0],
                    opacity: [0.4, 0.8, 0.4],
                  }}
                  transition={{
                    duration: Math.random() * 2 + 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </GlassCard>
        )}
        <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-1 rounded-md shadow-lg ${
                isChristmasMode 
                  ? 'bg-white' 
                  : 'bg-white'
              }`}>
                {isChristmasMode ? (
                  <Gift className="h-5 w-5 text-red-600" />
                ) : (
                  <UtensilsCrossed className="h-5 w-5 text-primary" />
                )}
              </div>
              <span className="font-heading text-xl font-bold">WATHII</span>
              {isChristmasMode && <span className="text-2xl">🎄</span>}
            </div>
            <p className={`${
              isChristmasMode 
                ? 'text-white/80' 
                : 'text-primary-foreground/80'
            } text-sm leading-relaxed`}>
              {isChristmasMode ? (
                <>Experience the magic of Christmas fashion! 🎅 Discover festive styles and elegant designs that bring joy and style to your holiday season. Perfect for spreading cheer and looking your best! 🎁</>
              ) : (
                <>Experience fashion, elegance thrifted wear. 
                From sizzling jackets, Denim, Shoes, Trousers,caps cadigans.</>
              )}
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="font-bold mb-4 text-lg">Quick Links</h3>
            <ul className={`space-y-2 text-sm ${
              isChristmasMode 
                ? 'text-white/80 hover:text-white' 
                : 'text-primary-foreground/80 hover:text-white'
            } transition-colors duration-300`}>
              <li><Link href="/" className={`${isChristmasMode ? 'hover:text-white' : 'hover:text-white'} transition-colors duration-300`}>Home</Link></li>
              <li><Link href="/menu" className={`${isChristmasMode ? 'hover:text-white' : 'hover:text-white'} transition-colors duration-300`}>Products</Link></li>
              <li><Link href="/chat" className={`${isChristmasMode ? 'hover:text-white' : 'hover:text-white'} transition-colors duration-300`}>Reservations</Link></li>
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="font-bold mb-4 text-lg">Contact</h3>
            <ul className={`space-y-2 text-sm ${
              isChristmasMode 
                ? 'text-white/80' 
                : 'text-primary-foreground/80'
            }`}>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Westlands, Nairobi, Kenya</li>
              <li className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> +254 700 000 000</li>
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="font-bold mb-4 text-lg">Opening Hours</h3>
            <ul className={`space-y-2 text-sm ${
              isChristmasMode 
                ? 'text-white/80' 
                : 'text-primary-foreground/80'
            }`}>
              <li>{isChristmasMode ? '🎅 Mon - Fri: 9:00 AM - 8:00 PM (Holiday Hours)' : 'Mon - Fri: 11:00 AM - 10:00 PM'}</li>
              <li>{isChristmasMode ? '🎄 Sat - Sun: 10:00 AM - 9:00 PM (Holiday Hours)' : 'Sat - Sun: 10:00 AM - 11:00 PM'}</li>
            </ul>
          </motion.div>
        </div>
        <div className={`container mx-auto px-4 mt-8 pt-8 border-t text-center text-sm relative z-10 ${
          isChristmasMode 
            ? 'border-white/20 text-white/60' 
            : 'border-primary-foreground/20 text-primary-foreground/60'
        }`}>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {isChristmasMode ? (
              <>© 2024 WATHII. All rights reserved. 🎄 Wishing you a Merry Christmas and Happy New Year! 🎅</>
            ) : (
              <>© 2024 WATHII. All rights reserved.</>
            )}
          </motion.p>
        </div>
      </footer>

      {/* Floating Action Button */}
      <FloatingActionButton />
      
      {/* Admin Christmas Toggle */}
      <ChristmasToggle />
    </div>
  );
}
