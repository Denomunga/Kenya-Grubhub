import { useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/data";
import { useShop } from "@/lib/shop";
import { formatPriceKSHS } from "@/lib/format";
import { Heart, ShoppingBag } from "lucide-react";

export default function FavoritesPage() {
  const { menu } = useData();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { wishlist, toggleWishlist, addToCart, clearWishlist } = useShop();

  const favorites = useMemo(() => {
    return menu.filter((p) => wishlist.has(p.id));
  }, [menu, wishlist]);

  return (
    <Sheet
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setLocation("/menu");
      }}
    >
      <SheetContent side="right" className="w-[95vw] sm:max-w-3xl">
        <div className="h-full overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-8">
            <SheetHeader>
              <SheetTitle>Favorites</SheetTitle>
              <SheetDescription>Products you’ve saved for later.</SheetDescription>
            </SheetHeader>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={favorites.length === 0}
                onClick={() => clearWishlist()}
              >
                Clear
              </Button>
              <Button type="button" onClick={() => setLocation("/menu")}>Browse Products</Button>
            </div>
          </div>

          {favorites.length === 0 ? (
            <Card>
              <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Heart className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-lg font-semibold">No favorites yet</div>
                  <div className="text-sm text-muted-foreground">Tap the heart icon on a product to save it here.</div>
                </div>
                <Button type="button" onClick={() => setLocation("/menu")}>Go to Products</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {favorites.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="h-44 bg-muted overflow-hidden">
                    <img
                      src={item.image || item.images?.[0] || ""}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{item.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">{item.description}</div>
                      </div>
                      <div className="font-bold tabular-nums text-primary">{formatPriceKSHS(item.price)}</div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{item.category || "Product"}</Badge>
                      {item.brand && <Badge variant="secondary">{item.brand}</Badge>}
                      {item.condition && <Badge variant="outline">{item.condition}</Badge>}
                    </div>

                    <div className="mt-5 flex items-center gap-2">
                      <Button
                        type="button"
                        className="flex-1"
                        disabled={!item.available}
                        onClick={() => {
                          addToCart(item, 1);
                          toast({ title: "Added to cart", description: `${item.name} added.` });
                        }}
                      >
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Add to Cart
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          toggleWishlist(item.id);
                          toast({ title: "Removed", description: `${item.name} removed from favorites.` });
                        }}
                        aria-label={`Remove ${item.name} from favorites`}
                      >
                        Remove
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setLocation(`/menu?product=${item.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
