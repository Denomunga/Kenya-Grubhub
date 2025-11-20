import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export type Role = "admin" | "staff" | "user";

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  name: string;
  avatar?: string;
  jobTitle?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, name: string) => Promise<boolean>;
  updateUserRole: (userId: string, newRole: Role, jobTitle?: string) => Promise<boolean>;
  updateProfile: (data: { name?: string; email?: string; avatar?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isManager: boolean;
  allUsers: User[];
  refreshAllUsers: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch all users for admin
  const refreshAllUsers = async () => {
    if (user?.role !== "admin") return;
    try {
      const response = await fetch("/api/users", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  // Refresh users when admin user logs in
  useEffect(() => {
    if (user?.role === "admin") {
      refreshAllUsers();
    }
  }, [user?.role]);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({ 
          title: "Login Failed", 
          description: data.message || "Invalid credentials", 
          variant: "destructive" 
        });
        return false;
      }

      setUser(data.user);
      
      const roleMsg = data.user.role === "admin" ? "Admin Access Granted" : 
                      data.user.role === "staff" ? "Staff Access Granted" : "Welcome Back!";
      
      toast({ title: roleMsg, description: `Logged in as ${data.user.name}` });
      
      // Role-based redirect
      if (data.user.role === "admin" || data.user.role === "staff") {
        setLocation("/dashboard");
      } else {
        setLocation("/");
      }
      
      return true;
    } catch (error) {
      toast({ 
        title: "Login Failed", 
        description: "Network error. Please try again.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  const register = async (username: string, email: string, password: string, name: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({ 
          title: "Registration Failed", 
          description: data.message || "Could not create account", 
          variant: "destructive" 
        });
        return false;
      }

      setUser(data.user);
      toast({ title: "Welcome!", description: "Account created successfully." });
      
      // Users go to home page after registration
      setLocation("/");
      return true;
    } catch (error) {
      toast({ 
        title: "Registration Failed", 
        description: "Network error. Please try again.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  const updateUserRole = async (userId: string, newRole: Role, jobTitle?: string) => {
    if (user?.role !== "admin") {
      toast({ 
        title: "Access Denied", 
        description: "Only admins can update roles", 
        variant: "destructive" 
      });
      return false;
    }

    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole, jobTitle }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast({ 
          title: "Update Failed", 
          description: data.message || "Could not update role", 
          variant: "destructive" 
        });
        return false;
      }

      toast({ title: "User Updated", description: "Role changes saved." });
      
      // Refresh all users
      await refreshAllUsers();
      
      // If updating self, refresh current user
      if (userId === user.id) {
        const data = await response.json();
        setUser(data.user);
      }

      return true;
    } catch (error) {
      toast({ 
        title: "Update Failed", 
        description: "Network error. Please try again.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  const updateProfile = async (data: { name?: string; email?: string; avatar?: string }) => {
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({ 
          title: "Update Failed", 
          description: errorData.message || "Could not update profile", 
          variant: "destructive" 
        });
        return false;
      }

      const responseData = await response.json();
      setUser(responseData.user);
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
      return true;
    } catch (error) {
      toast({ 
        title: "Update Failed", 
        description: "Network error. Please try again.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      
      setUser(null);
      setAllUsers([]);
      toast({ title: "Logged out", description: "See you soon!" });
      setLocation("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Logged out", description: "See you soon!" });
      setUser(null);
      setLocation("/");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        updateUserRole,
        updateProfile,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isStaff: user?.role === "staff" || user?.role === "admin",
        isManager: user?.role === "admin" || (user?.role === "staff" && user?.jobTitle === "Manager"),
        allUsers,
        refreshAllUsers,
        loading,
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
