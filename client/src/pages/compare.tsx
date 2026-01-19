import { useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/data";
import { useShop } from "@/lib/shop";
import { formatPriceKSHS } from "@/lib/format";
import { GitCompare, ShoppingBag } from "lucide-react";

export default function ComparePage() {
  const { menu } = useData();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { compare, toggleCompare, addToCart, clearCompare } = useShop();

  const items = useMemo(() => {
    return menu.filter((p) => compare.has(p.id));
  }, [menu, compare]);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Compare</h1>
          <p className="text-muted-foreground">Side-by-side comparison shortlist.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={items.length === 0}
            onClick={() => clearCompare()}
          >
            Clear
          </Button>
          <Button type="button" onClick={() => setLocation("/menu")}>Browse Products</Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <GitCompare className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold">No products to compare</div>
              <div className="text-sm text-muted-foreground">Tap the compare icon on products to add them here.</div>
            </div>
            <Button type="button" onClick={() => setLocation("/menu")}>Go to Products</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {items.map((item) => (
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
                  {item.stock !== undefined && (
                    <Badge variant={item.stock > 0 ? "outline" : "destructive"}>
                      Stock: {item.stock}
                    </Badge>
                  )}
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
                      toggleCompare(item.id);
                      toast({ title: "Removed", description: `${item.name} removed from compare.` });
                    }}
                    aria-label={`Remove ${item.name} from compare`}
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
  );
}
