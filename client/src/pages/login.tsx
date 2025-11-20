import React from "react";
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
import { UtensilsCrossed } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  password: z.string().min(2, "Password must be at least 2 characters"),
});

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // If already logged in, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const success = await login(values.username, values.password);
    if (success) {
      setLocation("/dashboard");
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <UtensilsCrossed className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-heading">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-lg h-12">
                Login
              </Button>
              <div className="text-center text-xs text-muted-foreground mt-4">
                <p>Demo Credentials:</p>
                <p>Admin: admin / admin</p>
                <p>Staff: staff / staff</p>
                <p>User: user / user</p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
