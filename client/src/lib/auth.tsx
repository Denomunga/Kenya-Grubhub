import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export type Role = "admin" | "staff" | "user";

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  pendingPhone?: string;
  role: Role;
  name: string;
  avatar?: string;
  jobTitle?: string;
  lastSessionInvalidatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, name: string, phone?: string) => Promise<boolean>;
  updateUserRole: (userId: string, newRole: Role, jobTitle?: string) => Promise<boolean>;
  updateProfile: (data: { name?: string; email?: string; avatar?: string }) => Promise<boolean>;
  requestPasswordChange: (newPassword: string) => Promise<boolean>;
  requestPhoneChange: (newPhone: string) => Promise<boolean>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<boolean>;
  confirmPhoneChange: (token: string) => Promise<boolean>;
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
  const [lastInvalidatedAt, setLastInvalidatedAt] = useState<string | undefined>(undefined);
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
          if (data.user?.lastSessionInvalidatedAt) setLastInvalidatedAt(data.user.lastSessionInvalidatedAt);
          if (data.user?.lastSessionInvalidatedAt) {
            setLastInvalidatedAt(data.user.lastSessionInvalidatedAt);
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Poll /api/auth/me every 60 seconds to detect session invalidation and notify
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const resp = await fetch('/api/auth/me', { credentials: 'include' });
        if (!resp.ok) {
          // if session became invalid, log out and show a message
          if (user) {
            setUser(null);
            toast({ title: 'Logged out', description: 'Your session was ended. This can happen if your password or security settings were changed.', variant: 'destructive' });
          }
          return;
        }
        const d = await resp.json();
        if (d.user?.lastSessionInvalidatedAt && lastInvalidatedAt && new Date(d.user.lastSessionInvalidatedAt).getTime() > new Date(lastInvalidatedAt).getTime()) {
          // sessions were invalidated after our recorded time
          toast({ title: 'Session invalidated', description: 'Your sessions were logged out due to password change.', variant: 'destructive' });
          // force logout
          setUser(null);
        }
        if (d.user?.lastSessionInvalidatedAt) setLastInvalidatedAt(d.user.lastSessionInvalidatedAt);
      } catch (err) {
        // ignore polling errors
      }
    }, 60000);
    return () => clearInterval(id);
  }, [user, lastInvalidatedAt, toast]);

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
      if (data.user?.lastSessionInvalidatedAt) setLastInvalidatedAt(data.user.lastSessionInvalidatedAt);
      
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

  const register = async (username: string, email: string, password: string, name: string, phone?: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email, password, name, phone }),
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
      if (data.user?.lastSessionInvalidatedAt) setLastInvalidatedAt(data.user.lastSessionInvalidatedAt);
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
        if (data.user?.lastSessionInvalidatedAt) setLastInvalidatedAt(data.user.lastSessionInvalidatedAt);
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
      // Prevent non-admin users from sending email updates from the client
      if (data.email && user?.role !== 'admin') {
        delete data.email;
      }
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

  const requestPasswordChange = async () => {
    try {
      const resp = await fetch('/api/auth/password-change-request', {
        method: 'POST',
        credentials: 'include',
      });
      if (!resp.ok) {
        const d = await resp.json();
        toast({ title: 'Password change failed', description: d.message || 'Could not request password change', variant: 'destructive' });
        return false;
      }
      toast({ title: 'Confirmation sent', description: 'Check your email to confirm the password change.' });
      return true;
    } catch (err) {
      console.error('Request password change failed', err);
      toast({ title: 'Password change failed', description: 'Network error', variant: 'destructive' });
      return false;
    }
  };

  const requestPhoneChange = async (newPhone: string) => {
    try {
      const resp = await fetch('/api/auth/phone-change-request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPhone }),
      });
      if (!resp.ok) {
        const d = await resp.json();
        toast({ title: 'Phone change failed', description: d.message || 'Could not request phone change', variant: 'destructive' });
        return false;
      }
      toast({ title: 'Confirmation sent', description: 'Check your email to confirm the phone change.' });
      return true;
    } catch (err) {
      console.error('Request phone change failed', err);
      toast({ title: 'Phone change failed', description: 'Network error', variant: 'destructive' });
      return false;
    }
  };

  const confirmPhoneChange = async (token: string) => {
    try {
      const resp = await fetch('/api/auth/phone-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!resp.ok) {
        const d = await resp.json();
        toast({ title: 'Confirmation failed', description: d.message || 'Invalid or expired token', variant: 'destructive' });
        return false;
      }
      toast({ title: 'Phone updated', description: 'Your phone number was updated.' });
      // Refresh user information
      try {
        const r = await fetch('/api/auth/me', { credentials: 'include' });
        if (r.ok) {
          const d = await r.json();
          setUser(d.user);
          if (d.user?.lastSessionInvalidatedAt) setLastInvalidatedAt(d.user.lastSessionInvalidatedAt);
        }
      } catch (e) {
        // ignore
      }
      return true;
    } catch (err) {
      console.error('Confirm phone change failed', err);
      toast({ title: 'Confirmation failed', description: 'Network error', variant: 'destructive' });
      return false;
    }
  };

  const confirmPasswordReset = async (token: string, newPassword: string) => {
    try {
      const resp = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!resp.ok) {
        const d = await resp.json();
        toast({ title: 'Confirmation failed', description: d.message || 'Invalid or expired token', variant: 'destructive' });
        return false;
      }

      toast({ title: 'Password changed', description: 'Your password was updated.' });
      return true;
    } catch (err) {
      console.error('Confirm password reset failed', err);
      toast({ title: 'Confirmation failed', description: 'Network error', variant: 'destructive' });
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
        requestPasswordChange,
        requestPhoneChange,
        confirmPasswordReset,
        confirmPhoneChange,
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
