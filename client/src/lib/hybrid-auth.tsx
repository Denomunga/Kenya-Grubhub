import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
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
  auth0Id?: string;
}

interface HybridAuthContextType {
  // Auth0 methods only
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
          const response = await fetch('/api/auth/sync-auth0', {
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
  };

  return (
    <HybridAuthContext.Provider
      value={{
        user: currentUser,
        loginWithRedirect,
        loginWithGoogle,
        loginWithGitHub,
        loginWithSocial,
        logout,
        isAuthenticated,
        isAdmin: currentUser?.role === "admin",
        isStaff: currentUser?.role === "staff" || currentUser?.role === "admin",
        isManager: currentUser?.role === "admin" || (currentUser?.role === "staff" && currentUser?.jobTitle === "Manager"),
        allUsers: [], // TODO: Implement admin users fetching
        refreshAllUsers: async () => {}, // TODO: Implement
        loading,
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
