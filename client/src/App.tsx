import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/data";
import { ChatProvider } from "@/lib/chatApi";
import { ChristmasProvider } from "@/lib/christmas";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import { Suspense, lazy, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageLoader } from "@/components/ui/LoadingStates";
import { CSRFTokenManager } from "@/lib/csrf";
import { useAuth } from "@/lib/auth";

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Hide 429 errors from console
const originalError = console.error;
const originalLog = console.log;

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('429') || message.includes('Too Many Requests')) {
    return; // Don't log 429 errors
  }
  originalError(...args);
};

console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('429') || message.includes('Too Many Requests')) {
    return; // Don't log 429 errors
  }
  originalLog(...args);
};

// Lazy load components for code splitting
const Home = lazy(() => import("@/pages/home"));
const Menu = lazy(() => import("@/pages/menu"));
const Login = lazy(() => import("@/pages/login"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Chat = lazy(() => import("@/pages/chat"));
const Profile = lazy(() => import("@/pages/profile"));
const ConfirmPassword = lazy(() => import("@/pages/confirm-password"));
const NewsDetail = lazy(() => import("@/pages/news-detail"));
const ConfirmPhone = lazy(() => import("@/pages/confirm-phone"));

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
              <Route path="/login" component={Login} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/chat" component={Chat} />
              <Route path="/profile" component={Profile} />
              <Route path="/auth/confirm-password" component={ConfirmPassword} />
              <Route path="/news/:id" component={NewsDetail} />
              <Route path="/auth/confirm-phone" component={ConfirmPhone} />
              <Route component={NotFound} />
            </Switch>
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </Layout>
  );
}

// Component to initialize CSRF after authentication
function CSRFInitializer() {
  const { user, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated && user) {
      CSRFTokenManager.initializeToken();
    }
  }, [isAuthenticated, user]);
  
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DndProvider backend={HTML5Backend}>
        <AuthProvider>
          <ChristmasProvider>
            <ChatProvider>
              <DataProvider>
                <CSRFInitializer />
                <Router />
                <Toaster />
              </DataProvider>
            </ChatProvider>
          </ChristmasProvider>
        </AuthProvider>
      </DndProvider>
    </QueryClientProvider>
  );
}

export default App;
