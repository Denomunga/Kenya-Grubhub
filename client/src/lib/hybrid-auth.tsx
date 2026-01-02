import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";

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
  auth0Id?: string;
}

interface HybridAuthContextType {
  // Auth0 methods
  user: User | null;
  loginWithRedirect: () => void;
  loginWithGoogle: () => void;
  loginWithGitHub: () => void;
  loginWithSocial: (provider: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isManager: boolean;
  allUsers: User[];
  refreshAllUsers: () => Promise<void>;
  loading: boolean;
  
  // Legacy methods for compatibility
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, name: string, phone?: string) => Promise<boolean>;
  updateProfile: (data: { name?: string; email?: string; avatar?: string }) => Promise<boolean>;
  requestPasswordChange: () => Promise<boolean>;
  requestPhoneChange: (newPhone: string) => Promise<boolean>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<boolean>;
  confirmPhoneChange: (token: string) => Promise<boolean>;
  updateUserRole: (userId: string, newRole: Role, jobTitle?: string) => Promise<boolean>;
}

const HybridAuthContext = createContext<HybridAuthContextType | undefined>(undefined);

export function HybridAuthProvider({ children }: { children: ReactNode }) {
  const { 
    user: auth0User, 
    loginWithRedirect, 
    logout: auth0Logout,
    isAuthenticated: auth0Authenticated,
    getAccessTokenSilently
  } = useAuth0();
  
  const [syncedUser, setSyncedUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Sync Auth0 user with your system
  useEffect(() => {
    const syncAuth0User = async () => {
      if (auth0Authenticated && auth0User && !syncedUser) {
        try {
          // Get access token with proper error handling
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE
            }
          });
          
          if (!token) {
            throw new Error('Failed to obtain access token');
          }
          
          // Sync with your backend
          const response = await apiFetch('/api/auth/sync-auth0', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              auth0Id: auth0User.sub,
              email: auth0User.email,
              name: auth0User.name,
              avatar: auth0User.picture
            })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to sync user');
          }

          if (data.success) {
            setSyncedUser(data.user);
            toast({ 
              title: "Login Successful", 
              description: `Welcome ${data.user.name}!` 
            });
            
            // Role-based redirect
            if (data.user.role === "admin" || data.user.role === "staff") {
              setLocation("/dashboard");
            } else {
              setLocation("/");
            }
          } else {
            throw new Error('Sync failed');
          }
        } catch (error: any) {
          console.error('Auth0 sync failed:', error);
          toast({ 
            title: "Login Failed", 
            description: error.message || "Could not complete login", 
            variant: "destructive" 
          });
        }
      }
    };

    syncAuth0User();
  }, [auth0Authenticated, auth0User, getAccessTokenSilently, toast, setLocation, syncedUser]);

  const loginWithGoogle = () => {
    loginWithRedirect({
      authorizationParams: {
        connection: 'google-oauth2',
      }
    });
  };

  const loginWithGitHub = () => {
    loginWithRedirect({
      authorizationParams: {
        connection: 'github',
      }
    });
  };

  const loginWithSocial = (provider: string) => {
    loginWithRedirect({
      authorizationParams: {
        connection: provider,
      }
    });
  };

  // Use synced user from Auth0
  const currentUser = syncedUser;
  const isAuthenticated = auth0Authenticated && !!syncedUser;
  const loading = auth0Authenticated && !syncedUser;

  const logout = async () => {
    await auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    setSyncedUser(null);
    setAllUsers([]);
  };

  // Fetch all users for admin
  const refreshAllUsers = async () => {
    if (syncedUser?.role !== "admin") return;
    try {
      const response = await apiFetch("/api/users");
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
    if (syncedUser?.role === "admin") {
      refreshAllUsers();
    }
  }, [syncedUser?.role]);

  // Legacy method stubs for compatibility (not implemented for Auth0)
  const updateProfile = async (_data: { name?: string; email?: string; avatar?: string }) => {
    toast({ 
      title: "Not Available", 
      description: "Profile updates are managed through Auth0", 
      variant: "destructive" 
    });
    return false;
  };

  const requestPasswordChange = async () => {
    toast({ 
      title: "Not Available", 
      description: "Password changes are managed through Auth0", 
      variant: "destructive" 
    });
    return false;
  };

  const requestPhoneChange = async (_newPhone: string) => {
    toast({ 
      title: "Not Available", 
      description: "Phone changes are not available with Auth0", 
      variant: "destructive" 
    });
    return false;
  };

  const confirmPasswordReset = async (_token: string, _newPassword: string) => {
    toast({ 
      title: "Not Available", 
      description: "Password resets are managed through Auth0", 
      variant: "destructive" 
    });
    return false;
  };

  const confirmPhoneChange = async (_token: string) => {
    toast({ 
      title: "Not Available", 
      description: "Phone changes are not available with Auth0", 
      variant: "destructive" 
    });
    return false;
  };

  const updateUserRole = async (_userId: string, _newRole: Role, _jobTitle?: string) => {
    toast({ 
      title: "Not Available", 
      description: "Role changes are managed through Auth0", 
      variant: "destructive" 
    });
    return false;
  };

  // Legacy login method for form-based authentication
  const login = async (username: string, password: string) => {
    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Set the synced user from response
        setSyncedUser(data.user);
        toast({ 
          title: "Login Successful", 
          description: `Welcome back, ${data.user?.name || username}!` 
        });
        return true;
      } else {
        toast({ 
          title: "Login Failed", 
          description: data.message || "Invalid credentials", 
          variant: "destructive" 
        });
        return false;
      }
    } catch (error) {
      toast({ 
        title: "Login Failed", 
        description: "Network error. Please try again.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  // Legacy register method for form-based registration
  const register = async (username: string, email: string, password: string, name: string, phone?: string) => {
    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email, password, name, phone }),
      });

      const data = await response.json();

      if (response.ok) {
        // Set the synced user from response
        setSyncedUser(data.user);
        toast({ 
          title: "Registration Successful", 
          description: `Welcome to KENYAN-HUB, ${name}!` 
        });
        return true;
      } else {
        toast({ 
          title: "Registration Failed", 
          description: data.message || "Registration failed", 
          variant: "destructive" 
        });
        return false;
      }
    } catch (error) {
      toast({ 
        title: "Registration Failed", 
        description: "Network error. Please try again.", 
        variant: "destructive" 
      });
      return false;
    }
  };

  return (
    <HybridAuthContext.Provider
      value={{
        user: currentUser,
        login,
        register,
        loginWithRedirect,
        loginWithGoogle,
        loginWithGitHub,
        loginWithSocial,
        logout,
        isAuthenticated,
        isAdmin: currentUser?.role === "admin",
        isStaff: currentUser?.role === "staff" || currentUser?.role === "admin",
        isManager: currentUser?.role === "admin" || (currentUser?.role === "staff" && currentUser?.jobTitle === "Manager"),
        allUsers,
        refreshAllUsers,
        loading,
        updateProfile,
        requestPasswordChange,
        requestPhoneChange,
        confirmPasswordReset,
        confirmPhoneChange,
        updateUserRole,
      }}
    >
      {children}
    </HybridAuthContext.Provider>
  );
}

export function useHybridAuth() {
  const context = useContext(HybridAuthContext);
  if (context === undefined) {
    throw new Error("useHybridAuth must be used within a HybridAuthProvider");
  }
  return context;
}
