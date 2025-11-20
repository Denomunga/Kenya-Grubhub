import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { 
  Menu, X, UtensilsCrossed, User, LogOut, MapPin, 
  ShoppingBag, MessageSquare, LayoutDashboard 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, isAdmin, isStaff } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = location === href;
    return (
      <Link href={href}>
        <span className={`cursor-pointer text-sm font-medium transition-colors hover:text-primary ${isActive ? "text-primary font-bold" : "text-foreground/80"}`}>
          {children}
        </span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="bg-primary p-1.5 rounded-md">
                <UtensilsCrossed className="h-6 w-6 text-white" />
              </div>
              <span className="font-heading text-xl font-bold tracking-tight">Kenyan Bistro</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/menu">Menu</NavLink>
            <NavLink href="/chat">Chat with Staff</NavLink>
            
            {(isAdmin || isStaff) && (
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="gap-2 border-primary text-primary hover:bg-primary hover:text-white">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            )}
          </nav>

          {/* User Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user?.name && <p className="font-medium">{user.name}</p>}
                      {user?.username && <p className="w-[200px] truncate text-sm text-muted-foreground">@{user.username}</p>}
                    </div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer w-full">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button>Login</Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t p-4 space-y-4 bg-background">
            <div className="flex flex-col gap-4">
              <Link href="/"><span className="font-medium" onClick={() => setMobileMenuOpen(false)}>Home</span></Link>
              <Link href="/menu"><span className="font-medium" onClick={() => setMobileMenuOpen(false)}>Menu</span></Link>
              <Link href="/chat"><span className="font-medium" onClick={() => setMobileMenuOpen(false)}>Chat</span></Link>
              {(isAdmin || isStaff) && (
                <Link href="/dashboard"><span className="font-medium text-primary" onClick={() => setMobileMenuOpen(false)}>Dashboard</span></Link>
              )}
              {isAuthenticated ? (
                <span className="font-medium text-destructive" onClick={() => { logout(); setMobileMenuOpen(false); }}>Logout</span>
              ) : (
                <Link href="/login"><Button className="w-full" onClick={() => setMobileMenuOpen(false)}>Login</Button></Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-white p-1 rounded-md">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
              </div>
              <span className="font-heading text-xl font-bold">Kenyan Bistro</span>
            </div>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              Authentic Kenyan cuisine served with modern elegance. 
              Experience the taste of Nairobi in every bite.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/menu">Our Menu</Link></li>
              <li><Link href="/chat">Reservations</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Westlands, Nairobi, Kenya</li>
              <li className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> +254 700 000 000</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Opening Hours</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>Mon - Fri: 11:00 AM - 10:00 PM</li>
              <li>Sat - Sun: 10:00 AM - 11:00 PM</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-8 border-t border-primary-foreground/20 text-center text-sm text-primary-foreground/60">
          © 2024 Kenyan Bistro. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
