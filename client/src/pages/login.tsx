import React, { useState } from "react";
import { useHybridAuth } from "@/lib/hybrid-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Laptop, ArrowRight, Loader2, CheckCircle, AlertCircle, Shield, MapPin, Clock, Mail, Eye, EyeOff, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

export default function Login() {
  const { loginWithGoogle, login, register, forgotPassword, isAuthenticated } = useHybridAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [authState, setAuthState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ username: '', email: '', name: '', password: '', confirmPassword: '', phone: '' });
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotState, setForgotState] = useState<'idle' | 'loading' | 'sent'>('idle');

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

  const handleGoogleLogin = async () => {
    setAuthState('loading');
    setErrorMessage('');
    try {
      await loginWithGoogle();
      setAuthState('success');
    } catch (error) {
      setAuthState('error');
      setErrorMessage('Google authentication failed. Please try again.');
      setTimeout(() => { setAuthState('idle'); setErrorMessage(''); }, 3000);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email.trim() || !loginForm.password) { setErrorMessage('Please fill in all fields'); setAuthState('error'); return; }
    if (loginForm.password.length > 128) { setErrorMessage('Password too long'); setAuthState('error'); return; }
    setAuthState('loading'); setErrorMessage('');
    const success = await login(loginForm.email.trim(), loginForm.password);
    if (success) { setAuthState('success'); } else { setAuthState('error'); setErrorMessage('Invalid email or password. If locked, wait 15 minutes.'); setTimeout(() => setAuthState('idle'), 5000); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.username.trim() || !signupForm.email.trim() || !signupForm.name.trim() || !signupForm.password) { setErrorMessage('Please fill in all required fields'); setAuthState('error'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(signupForm.username.trim())) { setErrorMessage('Username can only contain letters, numbers, and underscores'); setAuthState('error'); return; }
    if (signupForm.username.trim().length < 3 || signupForm.username.trim().length > 30) { setErrorMessage('Username must be 3-30 characters'); setAuthState('error'); return; }
    if (signupForm.name.trim().length < 2 || signupForm.name.trim().length > 50) { setErrorMessage('Name must be 2-50 characters'); setAuthState('error'); return; }
    if (signupForm.password !== signupForm.confirmPassword) { setErrorMessage('Passwords do not match'); setAuthState('error'); return; }
    if (signupForm.password.length < 8) { setErrorMessage('Password must be at least 8 characters'); setAuthState('error'); return; }
    if (signupForm.password.length > 128) { setErrorMessage('Password must be 128 characters or less'); setAuthState('error'); return; }
    if (!/[A-Z]/.test(signupForm.password)) { setErrorMessage('Password must contain at least one uppercase letter'); setAuthState('error'); return; }
    if (!/[a-z]/.test(signupForm.password)) { setErrorMessage('Password must contain at least one lowercase letter'); setAuthState('error'); return; }
    if (!/\d/.test(signupForm.password)) { setErrorMessage('Password must contain at least one number'); setAuthState('error'); return; }
    if (signupForm.phone && (signupForm.phone.trim().length < 7 || signupForm.phone.trim().length > 20)) { setErrorMessage('Phone must be 7-20 characters if provided'); setAuthState('error'); return; }
    setAuthState('loading'); setErrorMessage('');
    const success = await register(signupForm.username.trim(), signupForm.email.trim(), signupForm.password, signupForm.name.trim(), signupForm.phone?.trim() || undefined);
    if (success) { setAuthState('success'); } else { setAuthState('error'); setErrorMessage('Registration failed. Username or email may already exist.'); setTimeout(() => setAuthState('idle'), 3000); }
  };

  const switchMode = (newMode: 'login' | 'signup') => { setMode(newMode); setAuthState('idle'); setErrorMessage(''); };

  const getPasswordStrength = (pw: string) => {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Fair', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const pwStrength = getPasswordStrength(signupForm.password);
  const passwordsMatch = signupForm.confirmPassword && signupForm.password === signupForm.confirmPassword;

  return (
    <div className="min-h-screen flex">
      {/* Left Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-blue-900 via-purple-900 to-indigo-900">
          <div className="absolute inset-0 bg-black/20" />
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
                <Laptop className="h-8 w-8 text-yellow-400" />
              </div>
              <h1 className="text-4xl font-bold font-serif">MS-COMPUTERS</h1>
            </div>

            <h2 className="text-5xl font-serif font-bold mb-6 leading-tight">
              Experience Authentic <span className="text-transparent bg-clip-text bg-linear-to-r from-yellow-400 to-orange-400">MS-SOLUTIONS</span>
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

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          <Card className="border shadow-2xl bg-background/70 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4 pb-6">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
                <div className="bg-blue-600 p-3 rounded-full">
                  <Laptop className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold font-serif">MS-COMPUTERS</h1>
              </div>

              <CardTitle className="text-3xl font-serif font-bold text-foreground">
                {mode === 'login' ? 'Welcome Back' : 'Get Started'}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-lg">
                {mode === 'login' ? 'Sign in to your MS-COMPUTERS account' : 'Join MS-COMPUTERS and experience authentic MS Solutions'}
              </CardDescription>

              <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-500/10 px-3 py-2 rounded-full border border-green-500/20">
                <Shield className="h-4 w-4" />
                <span>Secure Authentication</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Login / Signup Forms */}
              <AnimatePresence mode="wait">
                {mode === 'login' ? (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleLogin}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        disabled={authState === 'loading'}
                        maxLength={100}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          disabled={authState === 'loading'}
                          className="pr-10"
                          maxLength={128}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" variant="link" className="px-0 h-auto text-xs text-blue-600 hover:text-blue-700" onClick={() => { setForgotOpen(true); setForgotState('idle'); setForgotEmail(''); }}>Forgot password?</Button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-300 group shadow-lg hover:shadow-xl"
                      disabled={authState === 'loading'}
                    >
                      {authState === 'loading' ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Signing in...</>
                      ) : (
                        <><Mail className="w-5 h-5 mr-2" />Sign In<ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>
                      )}
                    </Button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleSignup}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input id="signup-name" placeholder="Enter full name" value={signupForm.name} onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} disabled={authState === 'loading'} maxLength={50} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-username">Username</Label>
                        <Input id="signup-username" placeholder="Letters, numbers, _" value={signupForm.username} onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })} disabled={authState === 'loading'} maxLength={30} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="Enter Email" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} disabled={authState === 'loading'} maxLength={100} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Phone (Optional)</Label>
                      <Input id="signup-phone" placeholder="Enter Phone no." value={signupForm.phone} onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} disabled={authState === 'loading'} maxLength={20} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type={showPassword ? "text" : "password"} placeholder="Min 8 chars, Aa1!" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} disabled={authState === 'loading'} maxLength={128} required />
                      {signupForm.password && (
                        <div className="space-y-1">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= pwStrength.score ? pwStrength.color : 'bg-muted'}`} />
                            ))}
                          </div>
                          <p className={`text-xs font-medium ${pwStrength.label === 'Weak' ? 'text-red-500' : pwStrength.label === 'Fair' ? 'text-yellow-600' : 'text-green-600'}`}>
                            {pwStrength.label}
                            {pwStrength.label === 'Weak' && ' — add uppercase, numbers & symbols'}
                            {pwStrength.label === 'Fair' && ' — add more variety for strength'}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirm Password</Label>
                      <Input id="signup-confirm" type="password" placeholder="Confirm password" value={signupForm.confirmPassword} onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })} disabled={authState === 'loading'} maxLength={128} required />
                      {signupForm.confirmPassword && (
                        <p className={`text-xs font-medium ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                          {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-300 group shadow-lg hover:shadow-xl"
                      disabled={authState === 'loading'}
                    >
                      {authState === 'loading' ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Creating account...</>
                      ) : (
                        <><UserPlus className="w-5 h-5 mr-2" />Create Account<ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-background text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Google Login Button */}
              <Button
                onClick={handleGoogleLogin}
                variant="outline"
                className="w-full h-12 border-border hover:border-primary/40 hover:bg-muted transition-all duration-300 group"
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

              {/* Mode Switch & Footer */}
              <div className="text-center space-y-4 pt-4">
                <div className="text-sm text-muted-foreground">
                  {mode === 'login' ? (
                    <>Don't have an account?{' '}
                      <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700 font-medium" onClick={() => switchMode('signup')}>
                        Sign up for free
                      </Button>
                    </>
                  ) : (
                    <>Already have an account?{' '}
                      <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700 font-medium" onClick={() => switchMode('login')}>
                        Sign in
                      </Button>
                    </>
                  )}
                </div>
                
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                  <span>•</span>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Hero */}
          <div className="lg:hidden mt-8 text-center">
            <div className="bg-linear-to-r from-blue-600 to-purple-600 text-white p-6 rounded-2xl">
              <h3 className="text-xl font-bold font-serif mb-2">MS-COMPUTERS</h3>
              <p className="text-sm text-white/90">
                Authentic designs, premium quality, secure shopping
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter your email and we'll send you a link to reset your password.</DialogDescription>
          </DialogHeader>
          {forgotState === 'sent' ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-center text-muted-foreground">If that email is registered, a reset link has been sent. Check your inbox.</p>
            </div>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!forgotEmail) return;
              setForgotState('loading');
              const success = await forgotPassword(forgotEmail);
              setForgotState(success ? 'sent' : 'idle');
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={forgotState === 'loading'}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={forgotState === 'loading'}>
                  {forgotState === 'loading' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : 'Send Reset Link'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}