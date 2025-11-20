import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export type Role = "admin" | "staff" | "user";

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users
const MOCK_USERS: Record<string, User> = {
  admin: { id: "1", username: "admin", role: "admin", name: "Admin User" },
  staff: { id: "2", username: "staff", role: "staff", name: "Staff Member" },
  user: { id: "3", username: "user", role: "user", name: "John Doe" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check local storage on load
  useEffect(() => {
    const storedUser = localStorage.getItem("kenyan_bistro_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string) => {
    // Simple mock login logic
    if (username === "admin" && password === "admin") {
      const userData = MOCK_USERS.admin;
      setUser(userData);
      localStorage.setItem("kenyan_bistro_user", JSON.stringify(userData));
      toast({ title: "Welcome back, Admin!", description: "You have full access." });
      return true;
    }
    
    if (username === "staff" && password === "staff") {
      const userData = MOCK_USERS.staff;
      setUser(userData);
      localStorage.setItem("kenyan_bistro_user", JSON.stringify(userData));
      toast({ title: "Welcome, Staff!", description: "Ready to work?" });
      return true;
    }

    if (username === "user" && password === "user") {
      const userData = MOCK_USERS.user;
      setUser(userData);
      localStorage.setItem("kenyan_bistro_user", JSON.stringify(userData));
      toast({ title: "Welcome back!", description: "Hungry?" });
      return true;
    }

    // For demo purposes, any other login is a regular user
    if (username && password) {
      const newUser: User = { id: Date.now().toString(), username, role: "user", name: username };
      setUser(newUser);
      localStorage.setItem("kenyan_bistro_user", JSON.stringify(newUser));
      toast({ title: "Welcome!", description: "Account created for demo." });
      return true;
    }

    toast({ title: "Login Failed", description: "Invalid credentials", variant: "destructive" });
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("kenyan_bistro_user");
    toast({ title: "Logged out", description: "See you soon!" });
    setLocation("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isStaff: user?.role === "staff" || user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
