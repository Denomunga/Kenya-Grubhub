import React, { useState } from "react";
import { useHybridAuth } from "@/lib/hybrid-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, ArrowRight, Loader2, CheckCircle, AlertCircle, Shield, MapPin, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

export default function Login() {
  const { loginWithGoogle, loginWithGitHub, loginWithRedirect, isAuthenticated } = useHybridAuth();
  const [, setLocation] = useLocation();
  const [authState, setAuthState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // If already logged in, redirect based on role
  const { user } = useHybridAuth();
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "admin" || user.role === "staff") {
        setLocation("/dashboard");
      } else {
        setLocation("/");
      }
    }
  }, [isAuthenticated, user, setLocation]);

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setAuthState('loading');
    setErrorMessage('');
    
    try {
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithGitHub();
      }
      setAuthState('success');
    } catch (error) {
      setAuthState('error');
      setErrorMessage('Authentication failed. Please try again.');
      setTimeout(() => {
        setAuthState('idle');
        setErrorMessage('');
      }, 3000);
    }
  };

  const handleUniversalLogin = () => {
    setAuthState('loading');
    loginWithRedirect();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-blue-900 via-purple-900 to-indigo-900">
          <div className="absolute inset-0 bg-black/20" />
          {/* Animated background elements */}
          <motion.div
            className="absolute top-20 left-20 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/20">
                <UtensilsCrossed className="h-8 w-8 text-yellow-400" />
              </div>
              <h1 className="text-4xl font-bold font-serif">MS-COMPUTERS</h1>
            </div>
            
            <h2 className="text-5xl font-serif font-bold mb-6 leading-tight">
              Ms-Computers <span className="text-transparent bg-clip-text bg-linear-to-r from-yellow-400 to-orange-400"> And Repairs</span>
            </h2>
            
            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Discover premium MS Solutions, designs and craftsmanship that blend functionality with elegance. 
              Join thousands who trust MS-COMPUTERS for authentic technological experiences.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/80">
                <Shield className="h-5 w-5 text-green-400" />
                <span>Secure authentication powered by Auth0</span>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <MapPin className="h-5 w-5 text-blue-400" />
                <span>Locally sourced, globally recognized</span>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <Clock className="h-5 w-5 text-purple-400" />
                <span>24/7 customer support</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-linear-to-br from-slate-50 to-slate-100">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
                <div className="bg-blue-600 p-3 rounded-full">
                  <UtensilsCrossed className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold font-serif">MS-COMPUTERS</h1>
              </div>
              
              <CardTitle className="text-3xl font-serif font-bold text-gray-900">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-gray-600 text-lg">
                Sign in to your MS-COMPUTERS account
              </CardDescription>
              
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-full border border-green-200">
                <Shield className="h-4 w-4" />
                <span>Secure Auth0 Login</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Social Login Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={() => handleSocialLogin('google')}
                  variant="outline"
                  className="w-full h-12 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group"
                  disabled={authState === 'loading'}
                >
                  <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
                
                <Button
                  onClick={() => handleSocialLogin('github')}
                  variant="outline"
                  className="w-full h-12 border-gray-300 hover:border-gray-700 hover:bg-gray-50 transition-all duration-300 group"
                  disabled={authState === 'loading'}
                >
                  <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Continue with GitHub
                </Button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with email</span>
                </div>
              </div>

              {/* Universal Login Button */}
              <button
                onClick={handleUniversalLogin}
                className="w-full h-12 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-300 group shadow-lg hover:shadow-xl border-0 rounded-lg flex items-center justify-center"
                type="button"
                disabled={authState === 'loading'}
              >
                {authState === 'loading' ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in with Email
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {/* Status Messages */}
              <AnimatePresence>
                {authState === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm">Authentication successful! Redirecting...</span>
                  </motion.div>
                )}
                
                {authState === 'error' && errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200"
                  >
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer Links */}
              <div className="text-center space-y-4 pt-4">
                <div className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700 font-medium">
                    Sign up for free
                  </Button>
                </div>
                
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <Link href="/privacy" className="hover:text-gray-700 transition-colors">
                    Privacy Policy
                  </Link>
                  <span>•</span>
                  <Link href="/terms" className="hover:text-gray-700 transition-colors">
                    Terms of Service
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Hero Section */}
          <div className="lg:hidden mt-8 text-center">
            <div className="bg-linear-to-r from-blue-600 to-purple-600 text-white p-6 rounded-2xl">
              <h3 className="text-xl font-bold font-serif mb-2">Ms-Computers And Repairs</h3>
              <p className="text-sm text-white/90">
                Authentic designs, premium quality, secure shopping
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
