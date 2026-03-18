import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { DataProvider } from "@/lib/data";
import { ChatProvider } from "@/lib/chatApi";
import { ShopProvider } from "@/lib/shop";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import { Suspense, lazy, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageLoader } from "@/components/ui/LoadingStates";
import { CSRFTokenManager } from "@/lib/csrf";
import { Auth0Provider } from "@auth0/auth0-react";
import { HybridAuthProvider } from "@/lib/hybrid-auth";
import { auth0Config } from "@/lib/auth0-config";
import { ThemeProvider } from "next-themes";

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Initialize CSRF token on app startup
CSRFTokenManager.initializeToken();

// Hide all network errors and 429 errors from console
const originalError = console.error;
const originalLog = console.log;
const originalWarn = console.warn;
const originalInfo = console.info;

// Override all console methods to catch network errors
const shouldFilterMessage = (message: any[]) => {
  const msgStr = message.join(' ');
  return (
    msgStr.includes('429') || 
    msgStr.includes('Too Many Requests') || 
    msgStr.includes('Failed to load resource') ||
    msgStr.includes('server responded with a status of 429') ||
    msgStr.includes('server responded with a status of 404') && msgStr.includes('business-location') === false ||
    msgStr.includes('GET') && msgStr.includes('429') ||
    msgStr.includes('kenya-grubhub.onrender.com/api/') ||
    msgStr.includes('fetchWithCSRF') ||
    msgStr.includes('messages') ||
    msgStr.includes('reviews') ||
    msgStr.includes('news') ||
    msgStr.includes('window.fetch') ||
    msgStr.includes('index.') && msgStr.includes('.js:') ||
    msgStr.includes('Rate limited for') ||
    msgStr.includes('Retrying in') ||
    msgStr.includes('attempt') && msgStr.includes('maxRetries')
  );
};

console.error = (...args) => {
  if (shouldFilterMessage(args)) return;
  originalError(...args);
};

console.log = (...args) => {
  if (shouldFilterMessage(args)) return;
  originalLog(...args);
};

console.warn = (...args) => {
  if (shouldFilterMessage(args)) return;
  originalWarn(...args);
};

console.info = (...args) => {
  if (shouldFilterMessage(args)) return;
  originalInfo(...args);
};

// Override fetch to suppress network errors globally
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    return response;
  } catch (error) {
    // Suppress fetch errors that would appear in console
    return Promise.reject(error);
  }
};

// Lazy load components for code splitting
const Home = lazy(() => import("@/pages/home"));
const Menu = lazy(() => import("@/pages/menu"));
const Auth = lazy(() => import("@/pages/auth"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Chat = lazy(() => import("@/pages/chat"));
const Profile = lazy(() => import("@/pages/profile"));
const ConfirmPassword = lazy(() => import("@/pages/confirm-password"));
const NewsDetail = lazy(() => import("@/pages/news-detail"));
const ConfirmPhone = lazy(() => import("@/pages/confirm-phone"));
const Jobs = lazy(() => import("@/pages/jobs"));

function RedirectToMenu() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/menu");
  }, [setLocation]);

  return null;
}

function Router() {
  return (
    <Layout>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <PageLoader />
        </div>
      }>
        <AnimatePresence mode="wait">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/menu" component={Menu} />
              <Route path="/favorites" component={RedirectToMenu} />
              <Route path="/compare" component={RedirectToMenu} />
              <Route path="/login" component={Auth} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/chat" component={Chat} />
              <Route path="/profile" component={Profile} />
              <Route path="/auth/confirm-password" component={ConfirmPassword} />
              <Route path="/news/:id" component={NewsDetail} />
              <Route path="/jobs" component={Jobs} />
              <Route path="/auth/confirm-phone" component={ConfirmPhone} />
              <Route component={NotFound} />
            </Switch>
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DndProvider backend={HTML5Backend}>
        <Auth0Provider
          domain={auth0Config.domain}
          clientId={auth0Config.clientId}
          authorizationParams={{
            redirectUri: auth0Config.redirectUri,
            audience: auth0Config.audience,
            scope: auth0Config.scope
          }}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <HybridAuthProvider>
              <ChatProvider>
                <DataProvider>
                  <ShopProvider>
                    <Router />
                  </ShopProvider>
                  <Toaster />
                </DataProvider>
              </ChatProvider>
            </HybridAuthProvider>
          </ThemeProvider>
        </Auth0Provider>
      </DndProvider>
    </QueryClientProvider>
  );
}

export default App;
