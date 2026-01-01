import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useHybridAuth } from "@/lib/hybrid-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UtensilsCrossed, Eye, EyeOff } from "lucide-react";
import PasswordStrengthChecker, { validatePasswordStrength } from "@/components/ui/PasswordStrengthChecker";
import { PasswordInput } from "@/components/ui/PasswordInput";

const loginSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  password: z.string().min(2, "Password must be at least 2 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required").refine((email) => {
    // Basic client-side validation for common issues
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    
    // Check for common disposable email providers
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'yopmail.com', 'temp-mail.org',
      'throwaway.email', 'fakeemail.com', 'tempmail.org',
      'maildrop.cc', 'tempmail.de', 'tempmail.net'
    ];
    
    if (disposableDomains.includes(domain)) return false;
    
    // Check for common typos
    const commonTypos = ['gamil.com', 'gmial.com', 'gmail.co', 'yahoo.co', 'yahho.com', 'outlok.com', 'hotmial.com', 'gnail.com'];
    if (commonTypos.includes(domain)) return false;
    
    return true;
  }, "Please use a real email address. Disposable or temporary emails are not allowed."),
  username: z.string().min(2, "Username must be at least 2 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .refine((password) => {
      const validation = validatePasswordStrength(password);
      return validation.isValid;
    }, "Password must include at least 8 characters, one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  phone: z.string().min(7, "Phone is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Login() {
  const { login, register, isAuthenticated, loginWithGoogle, loginWithGitHub } = useHybridAuth();
  const [, setLocation] = useLocation();
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", username: "", password: "", confirmPassword: "", phone: "" },
  });

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

  async function onLogin(values: z.infer<typeof loginSchema>) {
    // Login function now handles redirect based on role
    await login(values.username, values.password);
  }

  async function onRegister(values: z.infer<typeof registerSchema>) {
    // Additional client-side validation before submission
    if (!isPasswordValid) {
      return;
    }
    console.log('Register form values:', values);
    await register(values.username, values.email, values.password, values.name, values.phone);
    // No redirect needed here as register function handles it
  }

  const handlePasswordStrengthChange = (strength: number, isValid: boolean) => {
    setPasswordStrength(strength);
    setIsPasswordValid(isValid);
  };

  const isFormValid = isPasswordValid && registerForm.watch('password') === registerForm.watch('confirmPassword');

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-muted/30 px-4 particle-container gradient-mesh">
      <Card className="w-full max-w-md card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto bg-blue-600 p-3 rounded-full w-fit mb-2">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-heading">WATHII</CardTitle>
          <CardDescription>
            Login or Create an account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ADD Social Login Section */}
          <div className="space-y-3 mb-6">
            <Button 
              onClick={loginWithGoogle}
              variant="outline" 
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            
            <Button 
              onClick={loginWithGitHub}
              variant="outline" 
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. admin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="••••••"
                            showPassword={showLoginPassword}
                            onToggleVisibility={() => setShowLoginPassword(!showLoginPassword)}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-11">Login</Button>
                </form>
              </Form>
              <div className="text-center text-xs text-muted-foreground mt-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="font-bold mb-1">First Time? 
                  please register first
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-left pl-4">
                  {/* <span>Admin:</span> <span className="font-mono">admin / admin</span>
                  <span>Manager:</span> <span className="font-mono">manager / manager</span>
                  <span>Staff:</span> <span className="font-mono">staff / staff</span>
                  <span>User:</span> <span className="font-mono">user / user</span> */}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">
                          Please use a real email address. Temporary/disposable emails are not allowed.
                        </p>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Choose a strong password"
                            showPassword={showPassword}
                            onToggleVisibility={() => setShowPassword(!showPassword)}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <PasswordStrengthChecker 
                          password={field.value || ''} 
                          onStrengthChange={handlePasswordStrengthChange}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Re-enter your password"
                            showPassword={showConfirmPassword}
                            onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. +254700000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-11" 
                    disabled={!isFormValid}
                  >
                    Create Account
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
