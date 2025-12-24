import { useState } from "react";
import { DataContext } from "../lib/data";
import type { MenuItem, Review } from "../lib/data";
import { useContext } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Plus, Minus, Trash, MapPin } from "lucide-react";
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ProductImageViewer, { ProductImage } from "@/components/ui/ProductImageViewer";
import LocationPicker from '@/components/ui/LocationPicker';
import OrderConfirmation from '@/components/ui/OrderConfirmation';

export default function Menu() {
  const { menu, placeOrder, getReviewsForProduct, addReviewForProduct, removeReview, reviews } = useContext(DataContext)!;
  const { user, isAuthenticated, isAdmin, isStaff } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [orderConfirmationOpen, setOrderConfirmationOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  // Deletion confirmation state for reviews
  const [confirmDeleteReviewId, setConfirmDeleteReviewId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState<string>('spam');
  const [deleteNote, setDeleteNote] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<{ images: string[]; name: string } | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Helper small form component to post a review for the currently open product
  function ReviewForm({ itemId }: { itemId: string }) {
    const { user } = useAuth();
    const [rating, setRating] = useState<number>(5);
    const [comment, setComment] = useState<string>("");

    const submit = async () => {
      if (!user) {
        toast({ title: "Please login", description: "You must be logged in to post a review.", variant: "destructive" });
        return;
      }

      if (!comment.trim()) {
        toast({ title: "Write a comment", description: "Please enter a short comment before submitting.", variant: "destructive" });
        return;
      }

      await addReviewForProduct(itemId, { userId: user.id, user: user.name, rating, comment });
      setComment("");
      setRating(5);
      toast({ title: "Thank you", description: "Your review has been submitted." });
    };

    return (
      <div className="mt-6 space-y-3">
        <label className="text-sm font-medium">Your rating</label>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full rounded-md border px-3 py-2">
          {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} star{n>1?"s":""}</option>)}
        </select>

        <label className="text-sm font-medium">Comment</label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience..." />

        <div className="flex justify-end">
          <Button onClick={submit} className="mt-2">Submit Review</Button>
        </div>
      </div>
    );
  }

  const categories = ["All", "Main", "Starter", "Drinks", "Dessert"];

  const filteredMenu = activeCategory === "All" 
    ? menu 
    : menu.filter((item: MenuItem) => item.category === activeCategory);

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

  const handleImageClick = (item: MenuItem) => {
    const images = item.images || (item.image ? [item.image] : []);
    if (images.length > 0) {
      setSelectedProduct({ images, name: item.name });
      setIsViewerOpen(true);
    }
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
    if (!selectedLocation) {
      toast({ 
        title: "Location Required", 
        description: "Please select a delivery location before checkout.",
        variant: "destructive" 
      });
      setLocationDialogOpen(true);
      return;
    }
    
    // Create the order
    const newOrder = {
      id: Date.now().toString(),
      items: cart,
      total: cart.reduce((sum, i) => sum + (i.item.price * i.quantity), 0),
      status: "Pending",
      user: user?.name || "CurrentUser",
      userEmail: user?.email || undefined,
      userPhone: user?.phone || undefined,
      date: new Date().toISOString(),
      location: selectedLocation,
    };
    
    // Place the order
    placeOrder(cart, selectedLocation);
    
    // Set the last order for confirmation
    setLastOrder(newOrder);
    setOrderConfirmationOpen(true);
    
    // Clear cart and location
    setCart([]);
    setSelectedLocation(null);
  };

  const cartTotal = cart.reduce((sum, i) => sum + (i.item.price * i.quantity), 0);

  return (
    <div className="container mx-auto px-4 py-12 particle-container gradient-mesh">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-heading font-bold text-primary mb-2">Our Products</h1>
          <p className="text-muted-foreground">Explore our wide selection of Comfy Wears.</p>
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
                      <ProductImage
                        images={item.images || (item.image ? [item.image] : [])}
                        productName={item.name}
                        className="h-16 w-16 rounded-md object-cover cursor-pointer"
                        onImageClick={() => handleImageClick(item)}
                        enableSlideshow={false}
                      />
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
                  {/* Location Display */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Delivery Location:</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setLocationDialogOpen(true)}
                      >
                        {selectedLocation ? 'Change' : 'Select'}
                      </Button>
                    </div>
                    {selectedLocation ? (
                      <div className="bg-muted p-2 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="truncate">{selectedLocation.address}</span>
                        </div>
                        {selectedLocation.instructions && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Instructions: {selectedLocation.instructions}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-muted/50 p-2 rounded text-sm text-muted-foreground text-center">
                        No delivery location selected
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span>{cartTotal} KSHS</span>
                  </div>
                  <Button 
                    className="w-full h-12 text-lg" 
                    disabled={cart.length === 0 || !selectedLocation} 
                    onClick={handleCheckout}
                  >
                    Checkout {selectedLocation ? '' : '(Location Required)'}
                  </Button>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredMenu.map((item: MenuItem) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="h-full flex flex-col overflow-hidden card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow">
                <div className="h-48 overflow-hidden relative">
                  <ProductImage
                    images={item.images || (item.image ? [item.image] : [])}
                    productName={item.name}
                    className="w-full h-full"
                    onImageClick={() => handleImageClick(item)}
                    enableSlideshow={true}
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
                <CardFooter className="p-6 pt-0 flex gap-3 items-center">
                  <div className="flex-1">
                    <Button 
                      className="w-full group" 
                      disabled={!item.available}
                      onClick={() => addToCart(item)}
                    >
                      Add to Order
                      <ShoppingBag className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-1" />
                    </Button>
                  </div>

                  <div className="w-44 text-right">
                    <div className="text-xs text-muted-foreground mb-1">{getReviewsForProduct(item.id).length} reviews</div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">View Reviews</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{item.name} — Reviews</DialogTitle>
                          <DialogDescription>Read what customers are saying and add your own review.</DialogDescription>
                        </DialogHeader>

                        <div className="mt-4 space-y-4 max-h-[40vh] overflow-y-auto">
                          {getReviewsForProduct(item.id).length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">No reviews yet — be the first!</div>
                          ) : (
                            getReviewsForProduct(item.id).map((r: Review) => (
                              <div key={r.id} className="border-b pb-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-medium">{r.user}</div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span>{new Date(r.date).toLocaleDateString()}</span>
                                    {(isAdmin || isStaff) && (
                                      <button
                                        className="text-destructive hover:text-destructive/90 ml-2 text-xs"
                                        onClick={() => {
                                          setConfirmDeleteReviewId(r.id);
                                          setDeleteOpen(true);
                                        }}
                                        title="Delete review"
                                      >
                                        <Trash className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="text-sm text-yellow-400 mt-1">{Array(r.rating).fill("★").join("")}</div>
                                <div className="text-sm text-muted-foreground mt-2">{r.comment}</div>
                              </div>
                            ))
                          )}
                        </div>

                        <ReviewForm itemId={item.id} />

                        <DialogFooter className="mt-4 text-right">
                          <div className="text-xs text-muted-foreground mr-2">Reviews are moderated</div>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm delete dialog for admin/staff */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>This action will permanently remove the review. Are you sure?</DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {confirmDeleteReviewId ? (
              (() => {
                const r = reviews.find((rr: Review) => rr.id === confirmDeleteReviewId);
                return (
                  <div className="space-y-2">
                    {r ? (
                      <>
                        <div className="text-sm font-medium">By: {r.user}</div>
                        <div className="text-sm text-muted-foreground">{new Date(r.date).toLocaleString()}</div>
                        <div className="mt-2 p-3 rounded border bg-muted/30">{r.comment}</div>
                        <div className="mt-2">
                          <label className="text-sm font-medium block mb-1">Reason</label>
                          <select value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="w-full rounded-md border px-3 py-2">
                            <option value="spam">Spam/Advertising</option>
                            <option value="abusive">Abusive or Harassing</option>
                            <option value="irrelevant">Irrelevant to product</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="mt-2">
                          <label className="text-sm font-medium block mb-1">Notes (optional)</label>
                          <Textarea value={deleteNote} onChange={(e) => setDeleteNote(e.target.value)} placeholder="Optional notes for moderation audit" />
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">Review will be removed.</div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="text-sm text-muted-foreground">No review selected.</div>
            )}
          </div>

          <DialogFooter>
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => { setDeleteOpen(false); setConfirmDeleteReviewId(null); setDeleteReason('spam'); setDeleteNote(''); }}>Cancel</Button>
              <Button variant="destructive" onClick={async () => {
                if (!confirmDeleteReviewId) return;
                setIsDeleting(true);
                const ok = await removeReview(confirmDeleteReviewId, deleteReason, deleteNote);
                setIsDeleting(false);
                setDeleteOpen(false);
                setConfirmDeleteReviewId(null);
                setDeleteReason('spam');
                setDeleteNote('');
                if (ok) toast({ title: "Deleted", description: "Review was removed." });
              }} disabled={isDeleting}>{isDeleting ? 'Deleting…' : 'Delete Review'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Order Confirmation Dialog */}
      <Dialog open={orderConfirmationOpen} onOpenChange={setOrderConfirmationOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {lastOrder && (
            <OrderConfirmation
              order={lastOrder}
              onClose={() => setOrderConfirmationOpen(false)}
              onTrackOrder={() => {
                toast({
                  title: "Order Tracking",
                  description: "Order tracking feature coming soon!",
                });
              }}
              onContactSupport={() => {
                toast({
                  title: "Contact Support",
                  description: "Support contact options coming soon!",
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Product Image Viewer */}
      {selectedProduct && (
        <ProductImageViewer
          images={selectedProduct.images}
          productName={selectedProduct.name}
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Location Selection Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Delivery Location</DialogTitle>
            <DialogDescription>
              Choose where you want your order delivered. You can search for an address, use your current location, or click on the map.
            </DialogDescription>
          </DialogHeader>
          
          <LocationPicker
            onLocationSelect={(location) => {
              setSelectedLocation(location);
              setLocationDialogOpen(false);
            }}
            initialLocation={selectedLocation}
            placeholder="Search for delivery address..."
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
