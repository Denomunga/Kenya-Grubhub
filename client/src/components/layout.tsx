import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useHybridAuth } from "@/lib/hybrid-auth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { Button } from "@/components/ui/button";
import { 
  Menu, X, Bomb, MapPin, 
  MessageSquare, LayoutDashboard, Moon, Sun
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import FloatingActionButton from "@/components/ui/FloatingActionButton";
import { ScrollProgressIndicator } from "@/hooks/useSmoothScroll";
import { MagneticButton } from "@/components/ui/ProfessionalEffects";
import { FloatingOrderButton } from "@/components/FloatingOrderButton";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, isAdmin, isStaff } = useHybridAuth();
  const { theme, setTheme } = useTheme();
  const { hasUnread, unreadCount, markAsRead } = useUnreadMessages();
  useOrderNotifications();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "success" | "error">("idle");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  const [socialLinks, setSocialLinks] = useState<{ instagram: string; facebook: string; x: string } | null>(null);

  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const prevActive = document.activeElement as HTMLElement | null;

    setTimeout(() => {
      mobileCloseButtonRef.current?.focus();
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        return;
      }

      if (e.key !== "Tab") return;
      const panel = mobilePanelRef.current;
      if (!panel) return;

      const focusableSelector = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
      const nodes = Array.from(panel.querySelectorAll(focusableSelector)) as HTMLElement[];
      if (!nodes.length) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus();
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const loadSocialLinks = async () => {
      try {
        const res = await apiFetch("/api/site-settings/social-links");
        const data = await res.json();
        setSocialLinks({
          instagram: data?.socialLinks?.instagram || "",
          facebook: data?.socialLinks?.facebook || "",
          x: data?.socialLinks?.x || "",
        });
      } catch {
        setSocialLinks({ instagram: "", facebook: "", x: "" });
      }
    };

    loadSocialLinks();
  }, []);

  const breadcrumbs = useMemo(() => {
    const path = (location || "/").split("?")[0];
    const parts = path.split("/").filter(Boolean);

    const labelMap: Record<string, string> = {
      menu: "Products",
      chat: "Discount Chat",
      profile: "Profile",
      dashboard: "Dashboard",
      login: "Login",
      news: "News",
      auth: "Auth",
    };

    const crumbs = [{ href: "/", label: "Home" }];
    let acc = "";
    for (const p of parts) {
      acc += `/${p}`;
      crumbs.push({ href: acc, label: labelMap[p] || p });
    }
    return crumbs;
  }, [location]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterStatus("error");
      setNewsletterMessage("Please enter a valid email address.");
      return;
    }

    setNewsletterLoading(true);
    setNewsletterStatus("idle");
    setNewsletterMessage("");

    try {
      const res = await apiFetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          preferences: {
            specialOffers: true,
            newProducts: true,
            events: true,
            news: true,
          },
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setNewsletterStatus("success");
        setNewsletterMessage(data?.message || "Subscribed successfully.");
        setNewsletterEmail("");
      } else {
        setNewsletterStatus("error");
        setNewsletterMessage(data?.message || "Subscription failed.");
      }
    } catch {
      setNewsletterStatus("error");
      setNewsletterMessage("An error occurred. Please try again.");
    } finally {
      setNewsletterLoading(false);
    }
  };

  const NavLink = ({ href, children, isDiscountButton = false }: { href: string; children: React.ReactNode; onClick?: () => void; isDiscountButton?: boolean }) => {
    const isActive = location === href;
    return (
      <Link href={href}>
        <motion.div 
          className={`cursor-pointer text-sm font-bold transition-all duration-300 relative px-4 py-2 rounded-xl card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow ${
            isDiscountButton
              ? 'bg-blue-600! text-white! border-0 shadow-lg hover:shadow-xl hover:bg-blue-700!'
              : isActive 
                ? 'bg-blue-100 text-blue-800 shadow-xl border-blue-300 hover:bg-blue-200'
                : "bg-white text-blue-700 hover:bg-blue-50 border-2 border-blue-600 hover:border-blue-700"
          }`}
          whileHover={{ scale: 1.02, x: 5 }}
          whileTap={{ scale: 0.98 }}
        >
          {children}
          {isActive && (
            <motion.div 
              className="absolute bottom-0 left-0 right-0 h-1 mx-auto bg-blue-600"
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
    <div className="min-h-screen flex flex-col font-sans relative bg-background text-foreground">
      {/* Scroll Progress Indicator */}
      <ScrollProgressIndicator />
      
      {/* Navbar */}
      <motion.header 
        className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60 shadow-sm"
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
              <div className="p-1.5 rounded-xl shadow-xl group-hover:shadow-2xl transition-shadow duration-300 bg-blue-600">
                <motion.div 
                  className="text-white"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Bomb className="h-6 w-6" />
                </motion.div>
              </div>
              <span className="font-heading text-2xl font-bold tracking-tight flex items-center gap-2 text-gradient">
                MS COMPUTERS & REPAIRS
              </span>
            </motion.div>
          </Link>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
            {breadcrumbs.map((c, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={c.href}>
                  {idx > 0 && <span className="opacity-50">/</span>}
                  {isLast ? (
                    <span className="text-foreground font-medium">{c.label}</span>
                  ) : (
                    <Link href={c.href}>
                      <span className="cursor-pointer hover:text-foreground transition-colors">{c.label}</span>
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/menu">Products</NavLink>
            <NavLink href="/chat" onClick={() => {
              // Clear notifications when navigating to chat
              if (isAdmin || isStaff) {
                // For admin/staff, clear all notifications when entering chat
                markAsRead();
              } else {
                // For users, clear notifications when entering chat
                markAsRead();
              }
            }} isDiscountButton>
              ASK FOR DISCOUNT
              {hasUnread && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
            {(isAdmin || isStaff) && (
              <Link href="/dashboard">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <div className={`cursor-pointer text-sm font-bold transition-all duration-300 relative px-4 py-2 rounded-xl card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow gap-2 flex items-center ${
                    'bg-blue-100 text-blue-800 shadow-xl border-blue-300 hover:bg-blue-200'
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-primary/10"
              aria-label="Toggle theme"
              onClick={() => {
                setTheme(theme === "dark" ? "light" : "dark");
              }}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
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

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-primary/10"
              aria-label="Toggle theme"
              onClick={() => {
                setTheme(theme === "dark" ? "light" : "dark");
              }}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <motion.button 
              className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
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
              id="mobile-nav"
              ref={mobilePanelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              className="md:hidden fixed top-0 right-0 h-full w-80 bg-background shadow-2xl z-50 overflow-hidden border-l border-border"
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
              <div className="relative p-6 border-b border-border bg-background">
                <div className="flex items-center justify-between">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                  >
                    <h2 className="text-2xl font-bold text-primary">
                      Navigation
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Explore MS-COMPUTERS</p>
                  </motion.div>
                  <motion.button
                    ref={mobileCloseButtonRef}
                    className="p-3 rounded-full bg-primary/10 hover:bg-primary/15 transition-all duration-300 border border-border shadow-lg hover:shadow-xl"
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
                  { href: "/chat", label: "ASK FOR DISCOUNT", icon: "💬", desc: "Talk to staff", special: true },
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
                        onClick={() => {
                          setMobileMenuOpen(false);
                          if (item.href === "/chat") markAsRead();
                        }}
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
                        
                        {/* Unread Badge for Chat */}
                        {item.href === "/chat" && hasUnread && (
                          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
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
                  <div className="text-xs text-muted-foreground font-medium">MS-COMPUTERS</div>
                  <div className="text-xs text-muted-foreground mt-1">Premium Kenyan Laptops</div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        <div className="min-h-full">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-16 relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 left-0 w-full h-full shimmer opacity-20"></div>
        <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1 rounded-md shadow-lg bg-white">
                <Bomb className="h-5 w-5 text-primary" />
              </div>
              <span className="font-heading text-xl font-bold">MS-COMPUTERS</span>
            </div>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              <>Experience our curated collection featuring XUK Laptops, XUS Laptops, Computers Accessories, Computer Repairs and Stationeries, with modern elegance, and a touch of sophistication.</>
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="font-bold mb-4 text-lg">Quick Links</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/80 hover:text-white transition-colors duration-300">
              <li><Link href="/" className="hover:text-white transition-colors duration-300">Home</Link></li>
              <li><Link href="/menu" className="hover:text-white transition-colors duration-300">Products</Link></li>
              <li><Link href="/chat" className="hover:text-white transition-colors duration-300">Reservations</Link></li>
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="font-bold mb-4 text-lg">Contact</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Mathingu Road Wangirika  Hse Room No.G10, Ruiru Town </li>
              <li className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> +254 724 399 231</li>
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="font-bold mb-4 text-lg">Opening Hours</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>Mon - Fri: 11:00 AM - 10:00 PM</li>
              <li>Sat - Sun: 10:00 AM - 11:00 PM</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h3 className="font-bold mb-4 text-lg">Newsletter</h3>
            <p className="text-sm text-primary-foreground/80 leading-relaxed mb-4">
              Get product updates, offers and new arrivals.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address"
                aria-label="Email address"
                className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              <Button
                type="submit"
                disabled={newsletterLoading}
                className="w-full h-11 bg-white text-primary hover:bg-white/90 font-semibold rounded-xl"
              >
                {newsletterLoading ? "Subscribing..." : "Subscribe"}
              </Button>
              {newsletterStatus !== "idle" && (
                <div
                  className={`text-xs rounded-xl px-4 py-3 border ${
                    newsletterStatus === "success"
                      ? "bg-green-500/15 border-green-300/30 text-green-50"
                      : "bg-red-500/15 border-red-300/30 text-red-50"
                  }`}
                >
                  {newsletterMessage}
                </div>
              )}
            </form>

            <div className="mt-6">
              <h4 className="font-semibold text-sm mb-3">Follow</h4>
              <div className="flex items-center gap-3 text-sm">
                {!!socialLinks?.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 transition-colors"
                    aria-label="Instagram"
                  >
                    Instagram
                  </a>
                )}
                {!!socialLinks?.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 transition-colors"
                    aria-label="Facebook"
                  >
                    Facebook
                  </a>
                )}
                {!!socialLinks?.x && (
                  <a
                    href={socialLinks.x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 transition-colors"
                    aria-label="X"
                  >
                    X
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </div>
        <div className={`container mx-auto px-4 mt-8 pt-8 border-t text-center text-sm relative z-10 ${
          'border-primary-foreground/20 text-primary-foreground/60'
        }`}>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <>© 2024 MS-COMPUTERS. All rights reserved.</>
          </motion.p>
        </div>
      </footer>

      {/* Floating Action Button */}
      <FloatingActionButton />
      
      {/* Floating Order Button */}
      <FloatingOrderButton />
    </div>
  );
}
