import { useState, useContext, useEffect } from "react";
import { DataContext } from "../lib/data";
import type { MenuItem, Review } from "../lib/data";
import { useHybridAuth } from "@/lib/hybrid-auth";
import { useLocation, useSearchParams } from "wouter";
import ProductSearch from "@/components/search/ProductSearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Plus, Minus, Trash, MapPin } from "lucide-react";
import { formatPriceKSHS, formatPrice } from "@/lib/format";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ProductImageViewer, { ProductImage } from "@/components/ui/ProductImageViewer";
import LocationPicker from '@/components/ui/LocationPicker';
import OrderConfirmation from '@/components/ui/OrderConfirmation';

// Helper small form component to post a review for the currently open product
function ReviewForm({ itemId, reviewRating, setReviewRating, addReviewForProduct }: { 
  itemId: string; 
  reviewRating: number; 
  setReviewRating: (rating: number) => void; 
  addReviewForProduct: (itemId: string, review: Omit<Review, "id" | "productId" | "date" | "userId"> & { userId?: string }) => Promise<Review>;
}) {
  const { user } = useHybridAuth();
  const { toast } = useToast();
  const [reviewComment, setReviewComment] = useState("");
  const [isRatingOnly, setIsRatingOnly] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Please login", description: "You must be logged in to post a review.", variant: "destructive" });
      return;
    }

    // If not rating-only, validate comment
    if (!isRatingOnly) {
      const comment = reviewComment.trim();
      if (!comment) {
        toast({ title: "Write a comment", description: "Please enter a short comment before submitting.", variant: "destructive" });
        return;
      }
    }

    try {
      const reviewData: any = {
        userId: user.id,
        user: user.name,
        rating: reviewRating
      };
      
      // Only add comment if not rating-only or if comment exists
      if (!isRatingOnly && reviewComment.trim()) {
        reviewData.comment = reviewComment.trim();
      }

      await addReviewForProduct(itemId, reviewData);
      setReviewComment("");
      setReviewRating(5);
      setIsRatingOnly(false);
      toast({ title: "Thank you", description: "Your review has been submitted." });
    } catch (error) {
      toast({ title: "Error", description: `Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <label className="text-sm font-medium">Your rating</label>
      <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="w-full rounded-md border px-3 py-2">
        {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} star{n>1?"s":""}</option>)}
      </select>

      {/* Rating Only Toggle */}
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
        <input 
          type="checkbox" 
          id="ratingOnly"
          checked={isRatingOnly}
          onChange={(e) => setIsRatingOnly(e.target.checked)}
          className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
        />
        <label htmlFor="ratingOnly" className="text-sm font-medium cursor-pointer">
          ⭐ Rating only (no comment required)
        </label>
      </div>

      {/* Comment field - only show if not rating-only */}
      {!isRatingOnly && (
        <>
          <label className="text-sm font-medium">Comment</label>
          <Textarea 
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Share your experience..." 
            className="min-h-20"
          />
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} className="mt-2">
          {isRatingOnly ? "Submit Rating" : "Submit Review"}
        </Button>
      </div>
    </div>
  );
}
//
//
//
export default function Menu() {
  const { menu, placeOrder, getReviewsForProduct, addReviewForProduct, removeReview, reviews } = useContext(DataContext)!;
  const { user, isAuthenticated, isAdmin, isStaff } = useHybridAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchedProducts, setSearchedProducts] = useState<MenuItem[]>([]);
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
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<MenuItem | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);

  // Handle product ID from URL parameter
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && menu.length > 0) {
      const product = menu.find(item => item.id === productId);
      if (product) {
        setSelectedProductForDetail(product);
        setProductDetailOpen(true);
        // Clear the URL parameter after opening the modal
        setLocation('/menu');
      }
    }
  }, [searchParams, menu, setLocation]);

  const handleProductClick = (product: MenuItem) => {
    setSelectedProductForDetail(product);
    setProductDetailOpen(true);
  };

  const handleChatAboutProduct = (product: MenuItem) => {
    if (!isAuthenticated) {
      toast({ 
        title: "Please login", 
        description: "You need to be logged in to chat about products.", 
        variant: "destructive" 
      });
      setLocation('/login');
      return;
    }

    // Navigate to chat with product context
    setLocation('/chat');
    
    // Store the product in sessionStorage to be picked up by chat component
    sessionStorage.setItem('chatProduct', JSON.stringify({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || product.images?.[0]
    }));
  };

  const handleQuickRating = async (productId: string, rating: number) => {
    if (!isAuthenticated || !user) {
      toast({ 
        title: "Please login", 
        description: "You need to be logged in to rate products.", 
        variant: "destructive" 
      });
      setLocation('/login');
      return;
    }

    try {
      await addReviewForProduct(productId, {
        userId: user.id,
        user: user.name,
        rating
        // No comment - rating only
      });
      toast({ 
        title: "Thank you!", 
        description: `Your ${rating}-star rating has been submitted.` 
      });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: `Failed to submit rating: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        variant: "destructive" 
      });
    }
  };

  // Get unique categories from menu items
  const categories = ["All", ...Array.from(new Set(menu.map((item: MenuItem) => item.category)))];

  // Use searched products if available, otherwise use category filtering
  const displayProducts = searchedProducts.length > 0 ? searchedProducts : 
    (activeCategory === "All" ? menu : menu.filter((item: MenuItem) => item.category === activeCategory));

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

  const handleImageClick = (item: MenuItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
    <div className="min-h-screen w-full particle-container gradient-mesh">
      <div className="container mx-auto px-6 py-14">
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold text-primary mb-2">Our Products</h1>
            <p className="text-muted-foreground">Explore our wide selection of Comfy Wears.</p>
          </div>

          {/* Search Component */}
          <div className="mt-6">
            <ProductSearch 
              products={menu}
              onFilteredProducts={setSearchedProducts}
            />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-end gap-4 mt-6">
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
                        onImageClick={(e) => handleImageClick(item, e)}
                        enableSlideshow={false}
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">{formatPriceKSHS(item.price)}</p>
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
                    <span>{formatPriceKSHS(cartTotal)}</span>
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
          {displayProducts.map((item: MenuItem) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="h-full flex flex-col overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => handleProductClick(item)}>
                {/* Colored header accent */}
                <div className="h-1 bg-linear-to-r from-primary to-primary/60"></div>
                
                <div className="h-48 overflow-hidden relative bg-linear-to-br from-gray-50 to-gray-100">
                  <ProductImage
                    images={item.images || (item.image ? [item.image] : [])}
                    productName={item.name}
                    className="w-full h-full"
                    onImageClick={(e) => handleImageClick(item, e)}
                    enableSlideshow={true}
                  />
                  {!item.available && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl backdrop-blur-sm">
                      SOLD OUT
                    </div>
                  )}
                </div>
                <CardContent className="p-6 flex-1 bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold font-heading group-hover:text-primary transition-colors">{item.name}</h3>
                    <span className="font-bold text-primary whitespace-nowrap text-lg">{formatPriceKSHS(item.price)}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{item.description}</p>
                  
                  {/* Additional Product Information */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="bg-muted/50">{item.category}</Badge>
                    {item.subcategory && (
                      <Badge variant="secondary" className="text-xs">{item.subcategory}</Badge>
                    )}
                    {item.brand && (
                      <Badge variant="outline" className="text-xs">{item.brand}</Badge>
                    )}
                    {item.condition && (
                      <Badge 
                        variant={item.condition === 'new' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {item.condition}
                      </Badge>
                    )}
                    {item.year && (
                      <Badge variant="outline" className="text-xs">{item.year}</Badge>
                    )}
                    {item.size && (
                      <Badge variant="outline" className="text-xs">{item.size}</Badge>
                    )}
                    {item.color && (
                      <Badge variant="outline" className="text-xs">{item.color}</Badge>
                    )}
                    {item.stock !== undefined && item.stock <= 5 && (
                      <Badge variant="destructive" className="text-xs">
                        Only {item.stock} left
                      </Badge>
                    )}
                  </div>
                  
                  {/* Location for vehicles and real estate */}
                  {item.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </div>
                  )}
                  
                  {/* Material for fashion/furniture */}
                  {item.material && (
                    <div className="text-xs text-muted-foreground mb-2">
                      Material: {item.material}
                    </div>
                  )}
                  
                  {/* Dimensions for shipping/furniture */}
                  {item.dimensions && (
                    <div className="text-xs text-muted-foreground mb-2">
                      Dimensions: {item.dimensions.length}L × {item.dimensions.width}W × {item.dimensions.height}H cm
                    </div>
                  )}
                  
                  {/* Weight for shipping */}
                  {item.weight && (
                    <div className="text-xs text-muted-foreground mb-2">
                      Weight: {item.weight} kg
                    </div>
                  )}
                  
                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{item.tags.length - 3} more</span>
                      )}
                    </div>
                  )}
                  
                  {/* Key Specifications - Show 2-3 most important specs */}
                  {item.specifications && Object.keys(item.specifications).length > 0 && (
                    <div className="space-y-1 mb-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Key Specs:</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(item.specifications)
                          .slice(0, 3)
                          .map(([key, value]) => {
                            // Format key for display
                            const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
                            // Show only important specs with short values
                            if (String(value).length > 20) return null;
                            return (
                              <span key={key} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                                <span className="font-medium capitalize">{formattedKey}:</span> {String(value)}
                              </span>
                            );
                          })}
                        {Object.keys(item.specifications).length > 3 && (
                          <span className="text-xs text-blue-600">+{Object.keys(item.specifications).length - 3} more specs</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Stock status for all items */}
                  {item.stock !== undefined && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Stock: {item.stock} units</span>
                      {item.stock <= 5 && (
                        <span className="text-orange-600 font-medium">Low stock!</span>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-6 pt-0 flex gap-3 items-center bg-gray-50/30 border-t border-gray-100">
                  <div className="flex-1">
                    <Button 
                      className="w-full group" 
                      disabled={!item.available}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                    >
                      Add to Order
                      <ShoppingBag className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-1" />
                    </Button>
                  </div>

                  <div className="w-44 text-right">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center justify-end gap-1">
                      {getReviewsForProduct(item.id).length > 0 && (
                        <>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-3 h-3 ${i < Math.round(getReviewsForProduct(item.id).reduce((acc, r) => acc + r.rating, 0) / getReviewsForProduct(item.id).length) ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span>({getReviewsForProduct(item.id).length})</span>
                        </>
                      )}
                      {getReviewsForProduct(item.id).length === 0 && (
                        <span>No reviews yet</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => {
                          setSelectedProductForDetail(item);
                          setProductDetailOpen(true);
                        }}
                      >
                        View Details
                      </Button>
                      
                      {/* Quick 5★ button - placed here to avoid ruining layout */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickRating(item.id, 5);
                        }}
                        className="text-xs whitespace-nowrap hover:bg-yellow-50 hover:border-yellow-200 transition-colors"
                        title="Quick 5-star rating"
                      >
                        ⭐
                      </Button>
                    </div>
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
                        {r.comment && (
                          <div className="mt-2 p-3 rounded border bg-muted/30">{r.comment}</div>
                        )}
                        {!r.comment && (
                          <div className="mt-2 p-3 rounded border bg-muted/30 italic text-muted-foreground">Rating only - no comment provided</div>
                        )}
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

      {/* Product Detail Sheet */}
      <Sheet open={productDetailOpen} onOpenChange={setProductDetailOpen}>
        <SheetContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">
              {selectedProductForDetail?.name}
            </SheetTitle>
            <SheetDescription>
              {selectedProductForDetail?.description}
            </SheetDescription>
          </SheetHeader>
          
          {/* Rating and Action Buttons */}
          {selectedProductForDetail && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
              {/* Average Star Rating */}
              <div className="flex items-center gap-3">
                {(() => {
                  const reviews = getReviewsForProduct(selectedProductForDetail.id);
                  const averageRating = reviews.length > 0 
                    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
                    : 0;
                  return (
                    <>
                      <div className="flex items-center gap-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-5 h-5 ${i < Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="font-medium text-lg">
                          {averageRating.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground">
                          ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Ask About Price Button */}
              <Button
                onClick={() => {
                  handleChatAboutProduct(selectedProductForDetail);
                  setProductDetailOpen(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                💬 Ask About Price
              </Button>
            </div>
          )}
          
          {selectedProductForDetail && (
            <div className="space-y-6">
              {/* Product Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProductForDetail.images?.slice(0, 4).map((image, index) => (
                  <div key={index} className="relative overflow-hidden rounded-lg">
                    <img
                      src={image}
                      alt={`${selectedProductForDetail.name} ${index + 1}`}
                      className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct({
                          images: selectedProductForDetail.images || [],
                          name: selectedProductForDetail.name
                        });
                        setIsViewerOpen(true);
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Price:</span> {formatPrice(selectedProductForDetail.price)}</p>
                    <p><span className="font-medium">Category:</span> {selectedProductForDetail.category}</p>
                    {selectedProductForDetail.subcategory && (
                      <p><span className="font-medium">Subcategory:</span> {selectedProductForDetail.subcategory}</p>
                    )}
                    {selectedProductForDetail.brand && (
                      <p><span className="font-medium">Brand:</span> {selectedProductForDetail.brand}</p>
                    )}
                    {selectedProductForDetail.condition && (
                      <p><span className="font-medium">Condition:</span> 
                        <span className={`ml-1 px-2 py-1 rounded text-xs ${
                          selectedProductForDetail.condition === 'new' ? 'bg-green-100 text-green-800' :
                          selectedProductForDetail.condition === 'used' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedProductForDetail.condition}
                        </span>
                      </p>
                    )}
                    <p><span className="font-medium">Availability:</span> 
                      <span className={`ml-1 px-2 py-1 rounded text-xs ${
                        selectedProductForDetail.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedProductForDetail.available ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </p>
                    {selectedProductForDetail.stock !== undefined && (
                      <p><span className="font-medium">Stock Level:</span> 
                        <span className={`ml-1 ${
                          selectedProductForDetail.stock <= 5 ? 'text-orange-600 font-medium' : 'text-green-600'
                        }`}>
                          {selectedProductForDetail.stock} units
                          {selectedProductForDetail.stock <= 5 && ' (Low)'}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Physical Attributes</h3>
                  <div className="space-y-2">
                    {selectedProductForDetail.size && (
                      <p><span className="font-medium">Size:</span> {selectedProductForDetail.size}</p>
                    )}
                    {selectedProductForDetail.color && (
                      <p><span className="font-medium">Color:</span> {selectedProductForDetail.color}</p>
                    )}
                    {selectedProductForDetail.year && (
                      <p><span className="font-medium">Year:</span> {selectedProductForDetail.year}</p>
                    )}
                    {selectedProductForDetail.material && (
                      <p><span className="font-medium">Material:</span> {selectedProductForDetail.material}</p>
                    )}
                    {selectedProductForDetail.weight && (
                      <p><span className="font-medium">Weight:</span> {selectedProductForDetail.weight} kg</p>
                    )}
                    {selectedProductForDetail.dimensions && (
                      <p><span className="font-medium">Dimensions:</span> {selectedProductForDetail.dimensions.length}L × {selectedProductForDetail.dimensions.width}W × {selectedProductForDetail.dimensions.height}H cm</p>
                    )}
                    {selectedProductForDetail.location && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium">Location:</span>
                        <span>{selectedProductForDetail.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Product Metadata</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Product ID:</span> {selectedProductForDetail.id}</p>
                    <p><span className="font-medium">Image Count:</span> {(selectedProductForDetail.images || []).length} images</p>
                    {selectedProductForDetail.image && !selectedProductForDetail.images && (
                      <p><span className="font-medium">Legacy Image:</span> Available</p>
                    )}
                    <p><span className="font-medium">Last Updated:</span> {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Specifications */}
              {selectedProductForDetail.specifications && Object.keys(selectedProductForDetail.specifications).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedProductForDetail.specifications).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p><span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span> {String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedProductForDetail.tags && selectedProductForDetail.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProductForDetail.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Customer Reviews</h3>
                <div className="space-y-4">
                  {getReviewsForProduct(selectedProductForDetail.id).length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No reviews yet — be the first!</div>
                  ) : (
                    getReviewsForProduct(selectedProductForDetail.id).map((r: Review) => (
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
                        {r.comment ? (
                          <div className="text-sm text-muted-foreground mt-2">{r.comment}</div>
                        ) : (
                          <div className="text-sm text-muted-foreground mt-2 italic">Rating only - no comment provided</div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add Review Form */}
                {isAuthenticated && selectedProductForDetail && (
                  <div className="mt-6">
                    <ReviewForm 
                      itemId={selectedProductForDetail.id} 
                      reviewRating={reviewRating}
                      setReviewRating={setReviewRating}
                      addReviewForProduct={addReviewForProduct}
                    />
                  </div>
                )}

                <div className="mt-4 text-right">
                  <div className="text-xs text-muted-foreground">Reviews are moderated</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t">
                <Button
                  onClick={() => {
                    addToCart(selectedProductForDetail);
                  }}
                  disabled={!selectedProductForDetail.available}
                  className="flex-1"
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
                <Button variant="outline" onClick={() => setProductDetailOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      </div>
    </div>
  );
}
