import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth";
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
  const { login, register, isAuthenticated } = useAuth();
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
  const { user } = useAuth();
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
