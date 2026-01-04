import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed, ArrowRight, Shield, MapPin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthPage() {
  const { loginWithRedirect, isLoading } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup', // Show signup by default, users can switch to login
      }
    });
  };

  const handleLoginOnly = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login',
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-900 via-purple-900 to-indigo-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
        />
      </div>
    );
  }

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
              <h1 className="text-4xl font-bold font-serif">KENYAN-HUB</h1>
            </div>
            
            <h2 className="text-5xl font-serif font-bold mb-6 leading-tight">
              Experience Authentic <span className="text-transparent bg-clip-text bg-linear-to-r from-yellow-400 to-orange-400">Kenyan Style</span>
            </h2>
            
            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Discover premium Kenyan designs and craftsmanship that blend tradition with modern elegance. 
              Join thousands who trust KENYAN-HUB for authentic cultural experiences.
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

      {/* Right Side - Auth Form */}
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
                <h1 className="text-2xl font-bold font-serif">KENYAN-HUB</h1>
              </div>
              
              <CardTitle className="text-3xl font-serif font-bold text-gray-900">
                Get Started
              </CardTitle>
              <CardDescription className="text-gray-600 text-lg">
                Join KENYAN-HUB and experience authentic Kenyan style
              </CardDescription>
              
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-full border border-green-200">
                <Shield className="h-4 w-4" />
                <span>Secure Auth0 Authentication</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Button 
                onClick={handleLogin}
                className="w-full! h-12! bg-blue-600! hover:bg-blue-700! text-white! font-medium! transition-all! duration-300! group! shadow-lg! hover:shadow-xl! border-0!"
                style={{
                  background: 'linear-gradient(to right, #2563eb, #7c3aed) !important',
                  color: 'white !important'
                }}
                size="lg"
              >
                Create Account or Login
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={handleLoginOnly}
                  className="text-sm border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
                >
                  Already have an account? Login
                </Button>
              </div>
              
              <div className="text-center text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p>Secure authentication powered by Auth0</p>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Hero Section */}
          <div className="lg:hidden mt-8 text-center">
            <div className="bg-linear-to-r from-blue-600 to-purple-600 text-white p-6 rounded-2xl">
              <h3 className="text-xl font-bold font-serif mb-2">Experience Kenyan Style</h3>
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
