import React from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { User, Clock, Package } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { orders } = useData();

  if (!user) return null;

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
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>@{user.username}</CardDescription>
              <Badge className="mx-auto mt-2 w-fit" variant="secondary">{user.role}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Member since 2024</span>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-bold text-sm">Preferences</h4>
                <p className="text-sm text-muted-foreground">Newsletter Subscribed</p>
                <p className="text-sm text-muted-foreground">SMS Notifications On</p>
              </div>
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
                      <div key={order.id} className="border rounded-lg p-4">
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
