import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Clock, Package, Edit, Mail, Hash, X } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email is required").optional(),
  avatar: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export default function Profile() {
  const { user, updateProfile, requestPasswordChange, requestPhoneChange } = useAuth();
  const { orders, cancelOrder, modifyOrder } = useData();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [modifyCart, setModifyCart] = useState<{ item: any; quantity: number }[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isModifying, setIsModifying] = useState(false);

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
    const payload: any = { name: values.name, avatar: values.avatar || undefined };
    // Only include email for admin users (server also enforces this)
    if (user?.role === 'admin' && values.email) {
      payload.email = values.email;
    }
    const success = await updateProfile(payload);
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

  const handleCancelOrder = async (orderId: string) => {
    setIsCancelling(true);
    const success = await cancelOrder(orderId);
    if (success) {
      toast({
        title: "Order Cancelled",
        description: "Your order has been successfully cancelled.",
      });
    } else {
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel order. Please try again.",
        variant: "destructive",
      });
    }
    setIsCancelling(false);
  };

  const handleModifyOrder = (order: any) => {
    setSelectedOrder(order);
    setModifyCart(order.items.map((item: any) => ({ item: item.item, quantity: item.quantity })));
    setModifyDialogOpen(true);
  };

  const handleSaveModification = async () => {
    if (!selectedOrder || modifyCart.length === 0) return;
    
    setIsModifying(true);
    const success = await modifyOrder(selectedOrder.id, modifyCart);
    if (success) {
      toast({
        title: "Order Modified",
        description: "Your order has been successfully updated.",
      });
      setModifyDialogOpen(false);
      setSelectedOrder(null);
      setModifyCart([]);
    } else {
      toast({
        title: "Modification Failed",
        description: "Failed to modify order. Please try again.",
        variant: "destructive",
      });
    }
    setIsModifying(false);
  };

  const canCancelOrder = (order: any) => {
    return ['Pending', 'Preparing'].includes(order.status);
  };

  const canModifyOrder = (order: any) => {
    return order.status === 'Pending';
  };

  return (
    <div className="container mx-auto px-4 py-12 particle-container gradient-mesh">
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <Card className="card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-2xl bg-blue-600 text-white">
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
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                <span className="text-sm font-medium">Phone:</span>
                <span data-testid="text-profile-phone">{user.phone || 'Not added'}</span>
              </div>
              {user?.pendingPhone && (
                <div className="text-sm text-muted-foreground/80 mt-1">Pending change to {user.pendingPhone} — check your email to confirm.</div>
              )}
              {user?.role !== 'admin' && (
                <div className="text-xs text-muted-foreground/80 mt-1">
                  To change your email, please contact support or an administrator.
                </div>
              )}
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
                      {user?.role === 'admin' && (
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
                      )}
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

              <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full mt-2">Change Password</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>We'll send a confirmation link to your email so you can set a new password securely.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm">Click the button below and check your email for the confirmation link to complete your password change.</p>
                    <div className="flex gap-2">
                      <Button onClick={async () => {
                        const ok = await requestPasswordChange("");
                        if (ok) setPasswordDialogOpen(false);
                      }} className="flex-1">Send confirmation link</Button>
                      <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full mt-2">Change Phone</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Phone</DialogTitle>
                    <DialogDescription>Enter your new phone number. We'll send a confirmation link to your registered email to confirm the change.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="e.g. +254700000000" className="w-full rounded-md border px-3 py-2" />
                    <div className="flex gap-2">
                      <Button onClick={async () => {
                        if (!newPhone || newPhone.trim().length < 7) return;
                        const ok = await requestPhoneChange(newPhone.trim());
                        if (ok) setPhoneDialogOpen(false);
                      }} className="flex-1">Request Change</Button>
                      <Button variant="outline" onClick={() => setPhoneDialogOpen(false)}>Cancel</Button>
                    </div>
                  </div>
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
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">{order.total} KSHS</span>
                            <div className="flex gap-1">
                              {canModifyOrder(order) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleModifyOrder(order)}
                                  className="text-xs h-8 px-2"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Modify
                                </Button>
                              )}
                              {canCancelOrder(order) && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancelOrder(order.id)}
                                  disabled={isCancelling}
                                  className="text-xs h-8 px-2"
                                >
                                  {isCancelling ? 'Cancelling...' : 'Cancel'}
                                </Button>
                              )}
                            </div>
                          </div>
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

      {/* Order Modification Dialog */}
      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modify Order #{selectedOrder?.id?.slice(-6)}</DialogTitle>
            <DialogDescription>
              Update your order items and quantities. Only pending orders can be modified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Order Items</h4>
              {modifyCart.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.item.name}</span>
                    <span className="text-sm text-muted-foreground">KSHS {item.item.price} each</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (item.quantity > 1) {
                          setModifyCart(prev => prev.map((i, idx) => 
                            idx === index ? { ...i, quantity: i.quantity - 1 } : i
                          ));
                        }
                      }}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setModifyCart(prev => prev.map((i, idx) => 
                          idx === index ? { ...i, quantity: i.quantity + 1 } : i
                        ));
                      }}
                    >
                      +
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setModifyCart(prev => prev.filter((_, idx) => idx !== index));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {modifyCart.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No items in order. Add items to continue.
                </p>
              )}
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className="font-bold text-lg">
                  KSHS {modifyCart.reduce((sum, item) => sum + (item.item.price * item.quantity), 0)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveModification}
              disabled={isModifying || modifyCart.length === 0}
            >
              {isModifying ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
