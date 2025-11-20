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
  jobTitle?: string; // Added to distinguish "Manager" from other staff
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, name: string) => Promise<boolean>;
  updateUserRole: (userId: string, newRole: Role, jobTitle?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isManager: boolean; // Helper for the specific requirement
  allUsers: User[]; // Added for Admin to manage users
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users
const INITIAL_USERS: User[] = [
  { id: "1", username: "admin", role: "admin", name: "Admin User" },
  { id: "2", username: "manager", role: "staff", name: "Manager Jane", jobTitle: "Manager" },
  { id: "3", username: "user", role: "user", name: "John Doe" },
  { id: "4", username: "staff", role: "staff", name: "Staff Member", jobTitle: "Waiter" },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check local storage on load
  useEffect(() => {
    const storedUser = localStorage.getItem("kenyan_bistro_user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Refresh user data from allUsers to ensure roles are up to date
      const freshUser = allUsers.find(u => u.id === parsedUser.id) || parsedUser;
      setUser(freshUser);
    }
  }, []); // We don't depend on allUsers here to avoid loop, but in real app we would fetch fresh data

  const login = async (username: string, password: string) => {
    // Simple mock login logic
    const foundUser = allUsers.find(u => u.username === username);
    
    if (foundUser && password === username) { // Mock password check: password same as username for demo
      setUser(foundUser);
      localStorage.setItem("kenyan_bistro_user", JSON.stringify(foundUser));
      
      const roleMsg = foundUser.role === "admin" ? "Admin Access Granted" : 
                      foundUser.role === "staff" ? "Staff Access Granted" : "Welcome Back!";
      
      toast({ title: roleMsg, description: `Logged in as ${foundUser.name}` });
      return true;
    }

    toast({ title: "Login Failed", description: "Invalid credentials", variant: "destructive" });
    return false;
  };

  const register = async (username: string, password: string, name: string) => {
    const existing = allUsers.find(u => u.username === username);
    if (existing) {
      toast({ title: "Registration Failed", description: "Username already taken", variant: "destructive" });
      return false;
    }

    const newUser: User = {
      id: Date.now().toString(),
      username,
      name,
      role: "user", // Default role
    };

    setAllUsers([...allUsers, newUser]);
    setUser(newUser);
    localStorage.setItem("kenyan_bistro_user", JSON.stringify(newUser));
    toast({ title: "Welcome!", description: "Account created successfully." });
    return true;
  };

  const updateUserRole = (userId: string, newRole: Role, jobTitle?: string) => {
    setAllUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, role: newRole, jobTitle } : u
    ));
    
    // If updating self
    if (user?.id === userId) {
      const updated = { ...user, role: newRole, jobTitle };
      setUser(updated);
      localStorage.setItem("kenyan_bistro_user", JSON.stringify(updated));
    }
    
    toast({ title: "User Updated", description: "Role changes saved." });
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
        register,
        updateUserRole,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isStaff: user?.role === "staff" || user?.role === "admin",
        isManager: user?.role === "admin" || (user?.role === "staff" && user?.jobTitle === "Manager"),
        allUsers,
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
