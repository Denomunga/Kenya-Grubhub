import React, { useState } from "react";
import { useData, MenuItem } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";

export default function Menu() {
  const { menu, placeOrder } = useData();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);

  const categories = ["All", "Main", "Starter", "Drinks", "Dessert"];

  const filteredMenu = activeCategory === "All" 
    ? menu 
    : menu.filter(item => item.category === activeCategory);

  const addToCart = (item: MenuItem) => {
    if (!isAuthenticated) {
      toast({ title: "Please login", description: "You need to be logged in to order.", variant: "destructive" });
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
    toast({ title: "Added to cart", description: `${item.name} added.` });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === itemId) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : i;
      }
      return i;
    }));
  };

  const handleCheckout = () => {
    placeOrder(cart);
    setCart([]);
    toast({ title: "Order Placed!", description: "Your food is being prepared." });
  };

  const cartTotal = cart.reduce((sum, i) => sum + (i.item.price * i.quantity), 0);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-heading font-bold text-primary mb-2">Our Menu</h1>
          <p className="text-muted-foreground">Explore our wide selection of authentic Kenyan dishes.</p>
        </div>

        <div className="flex items-center gap-4">
          <Tabs defaultValue="All" className="w-full md:w-auto" onValueChange={setActiveCategory}>
            <TabsList className="bg-muted">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="data-[state=active]:bg-white data-[state=active]:text-primary">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Cart Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button className="relative">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Cart
                {cart.length > 0 && (
                  <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-accent text-accent-foreground">
                    {cart.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Your Order</SheetTitle>
                <SheetDescription>Review your items before checkout.</SheetDescription>
              </SheetHeader>
              
              <div className="mt-8 space-y-4 flex-1 overflow-y-auto max-h-[60vh]">
                {cart.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Your cart is empty.
                  </div>
                ) : (
                  cart.map(({ item, quantity }) => (
                    <div key={item.id} className="flex items-center gap-4 border-b pb-4">
                      <img src={item.image} alt={item.name} className="h-16 w-16 rounded-md object-cover" />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">{item.price} KSHS</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs font-bold w-4 text-center">{quantity}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.id)}>
                        <span className="sr-only">Remove</span>
                        <Plus className="h-4 w-4 rotate-45" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <SheetFooter className="mt-auto border-t pt-4">
                <div className="w-full space-y-4">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span>{cartTotal} KSHS</span>
                  </div>
                  <Button className="w-full h-12 text-lg" disabled={cart.length === 0} onClick={handleCheckout}>
                    Checkout
                  </Button>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredMenu.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="h-full flex flex-col overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300">
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                  {!item.available && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl backdrop-blur-sm">
                      SOLD OUT
                    </div>
                  )}
                </div>
                <CardContent className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold font-heading">{item.name}</h3>
                    <span className="font-bold text-primary whitespace-nowrap">{item.price} KSHS</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">{item.description}</p>
                  <Badge variant="outline" className="bg-muted/50">{item.category}</Badge>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <Button 
                    className="w-full group" 
                    disabled={!item.available}
                    onClick={() => addToCart(item)}
                  >
                    Add to Order
                    <ShoppingBag className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-1" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
