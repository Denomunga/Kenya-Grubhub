import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Clock, Package, Edit, Mail, Hash } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email is required"),
  avatar: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { orders } = useData();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      avatar: user?.avatar || "",
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        avatar: user.avatar || "",
      });
    }
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    const success = await updateProfile({
      name: values.name,
      email: values.email,
      avatar: values.avatar || undefined,
    });
    if (success) {
      setEditDialogOpen(false);
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  // Filter orders for this user (mock logic)
  const myOrders = orders.filter(o => o.user === "CurrentUser" || o.user === user.username);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle data-testid="text-profile-name">{user.name}</CardTitle>
              <CardDescription data-testid="text-profile-username">@{user.username}</CardDescription>
              <Badge className="mx-auto mt-2 w-fit" variant="secondary" data-testid="badge-role">
                {user.role}
                {user.jobTitle && ` - ${user.jobTitle}`}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span data-testid="text-profile-email">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span data-testid="text-profile-id">{user.id}</span>
              </div>
              <Separator />
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline" data-testid="button-edit-profile">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                      Update your profile information below
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} data-testid="input-edit-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} data-testid="input-edit-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="avatar"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Avatar URL (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/avatar.jpg" {...field} data-testid="input-edit-avatar" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1" data-testid="button-save-profile">Save Changes</Button>
                        <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Orders History */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>Track your past and current orders</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {myOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No orders yet. Time to eat!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {myOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4" data-testid={`order-card-${order.id}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold">Order #{order.id.slice(-6)}</span>
                              <Badge 
                                variant={order.status === "Delivered" ? "secondary" : "default"}
                                className={order.status === "Pending" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                              >
                                {order.status}
                              </Badge>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(order.date).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="font-bold text-primary">{order.total} KSHS</span>
                        </div>
                        
                        <div className="space-y-2">
                          {order.items.map((line, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {line.quantity}x {line.item.name}
                              </span>
                              <span>{line.item.price * line.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
