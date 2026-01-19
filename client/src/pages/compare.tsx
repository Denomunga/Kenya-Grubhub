import { useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/data";
import { useShop } from "@/lib/shop";
import { formatPriceKSHS } from "@/lib/format";
import { GitCompare, ShoppingBag } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function ComparePage() {
  const { menu } = useData();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { compare, toggleCompare, addToCart, clearCompare } = useShop();

  const items = useMemo(() => {
    return menu.filter((p) => compare.has(p.id));
  }, [menu, compare]);

  return (
    <Sheet open={true} onOpenChange={(open) => !open && setLocation("/menu")}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Compare</SheetTitle>
          <SheetDescription>Side-by-side comparison shortlist.</SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={items.length === 0}
              onClick={() => clearCompare()}
            >
              Clear
            </Button>
            <Button type="button" size="sm" onClick={() => setLocation("/menu")}>Browse Products</Button>
          </div>
        </div>

        <div className="mt-6 space-y-4 flex-1 overflow-y-auto max-h-[60vh]">
          {items.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <GitCompare className="h-6 w-6" />
              </div>
              <div className="text-lg font-semibold mb-2">No products to compare</div>
              <div className="text-sm text-muted-foreground mb-4">Tap the compare icon on products to add them here.</div>
              <Button type="button" size="sm" onClick={() => setLocation("/menu")}>Go to Products</Button>
            </div>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="h-20 w-20 bg-muted overflow-hidden rounded-md shrink-0">
                      <img
                        src={item.image || item.images?.[0] || ""}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{item.name}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">{item.description}</div>
                        </div>
                        <div className="font-bold tabular-nums text-primary shrink-0">{formatPriceKSHS(item.price)}</div>
                      </div>

                      <div className="mt-2 space-y-1 text-xs">
                        <div><span className="font-medium">Availability:</span> {item.available ? "In stock" : "Out of stock"}</div>
                        <div><span className="font-medium">Category:</span> {item.category || "—"}</div>
                        <div><span className="font-medium">Brand:</span> {item.brand || "—"}</div>
                        <div><span className="font-medium">Condition:</span> {item.condition || "—"}</div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1"
                          disabled={!item.available}
                          onClick={() => {
                            addToCart(item, 1);
                            toast({ title: "Added to cart", description: `${item.name} added.` });
                          }}
                        >
                          <ShoppingBag className="mr-2 h-3 w-3" />
                          Add to Cart
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            toggleCompare(item.id);
                            toast({ title: "Removed", description: `${item.name} removed from compare.` });
                          }}
                          aria-label={`Remove ${item.name} from compare`}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
