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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ComparePage() {
  const { menu } = useData();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { compare, toggleCompare, addToCart, clearCompare } = useShop();

  const items = useMemo(() => {
    return menu.filter((p) => compare.has(p.id));
  }, [menu, compare]);

  const renderText = (value: unknown) => {
    if (value === undefined || value === null || value === "") return "—";
    return String(value);
  };

  const renderDimensions = (value: any) => {
    if (!value) return "—";
    const { length, width, height } = value;
    if ([length, width, height].every((v) => v === undefined || v === null || v === "")) return "—";
    return `${renderText(length)}L × ${renderText(width)}W × ${renderText(height)}H cm`;
  };

  const renderTags = (tags: any) => {
    if (!Array.isArray(tags) || tags.length === 0) return "—";
    return tags.slice(0, 6).join(", ");
  };

  const renderKeySpecs = (specs: any) => {
    if (!specs || typeof specs !== "object") return "—";
    const entries = Object.entries(specs).slice(0, 6);
    if (entries.length === 0) return "—";
    return (
      <div className="space-y-1">
        {entries.map(([k, v]) => {
          const label = k.replace(/([A-Z])/g, " $1").trim();
          return (
            <div key={k} className="text-xs">
              <span className="font-medium capitalize">{label}:</span> {renderText(v)}
            </div>
          );
        })}
      </div>
    );
  };

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
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Feature</TableHead>
                  {items.map((item) => (
                    <TableHead key={item.id} className="min-w-60 align-top">
                      <div className="space-y-3">
                        <div className="h-20 w-full bg-muted overflow-hidden rounded-md">
                          <img
                            src={item.image || item.images?.[0] || ""}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-semibold leading-snug">{item.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{item.description}</div>
                        </div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Price</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id} className="font-bold text-primary tabular-nums">
                      {formatPriceKSHS(item.price)}
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Availability</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{item.available ? "In stock" : "Out of stock"}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Stock</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{item.stock === undefined ? "—" : renderText(item.stock)}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Category</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{renderText(item.category)}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Brand</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{renderText(item.brand)}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Condition</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{renderText(item.condition)}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Year</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{renderText(item.year)}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Size</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{renderText(item.size)}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Color</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{renderText(item.color)}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Material</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{renderText(item.material)}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Location</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{renderText(item.location)}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Weight</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{item.weight === undefined ? "—" : `${renderText(item.weight)} kg`}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Dimensions</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{renderDimensions((item as any).dimensions)}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Tags</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id} className="text-xs text-muted-foreground">
                      {renderTags((item as any).tags)}
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Key Specs</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>{renderKeySpecs((item as any).specifications)}</TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Actions</TableCell>
                  {items.map((item) => (
                    <TableCell key={item.id}>
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          disabled={!item.available}
                          onClick={() => {
                            addToCart(item, 1);
                            toast({ title: "Added to cart", description: `${item.name} added.` });
                          }}
                        >
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          Add to Cart
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setLocation(`/menu?product=${item.id}`)}
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
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
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
