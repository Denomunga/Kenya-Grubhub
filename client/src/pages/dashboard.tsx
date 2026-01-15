import React from "react";
import { useHybridAuth, Role } from "@/lib/hybrid-auth";
import { formatPriceKSHS } from "@/lib/format";
import { useData } from "@/lib/data";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Bell, Check, DollarSign, LayoutGrid, Mail, MapPin, MapPinned, MoreHorizontal, Newspaper, Phone, Pin, PinOff, Plus, Search, Settings, ShoppingBag, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NewsletterManager from "@/components/admin/NewsletterManager";
import NewsManager from "@/components/admin/NewsManager";
import DragDropMenuManager from "@/components/admin/DragDropMenuManager";
import AnimatedCharts from "@/components/admin/AnimatedCharts";
import OrderLocationView from "@/components/admin/OrderLocationView";
import BusinessLocationManager from "@/components/admin/BusinessLocationManager";
import POSSystem from "@/components/admin/POSSystem";
import SocialLinksManager from "@/components/admin/SocialLinksManager";

function playBeep() {
  try {
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 900;
    g.gain.value = 0.03;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => { try { o.stop(); ctx.close(); } catch (e) {} }, 120);
  } catch (e) {}
}

export default function Dashboard() {
  const { user, isAdmin, isStaff, allUsers, updateUserRole, refreshAllUsers } = useHybridAuth();
  const [, setLocation] = useLocation();
  const { 
    orders, menu, updateOrderStatus, serverHealth, kpis
  } = useData();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<string>("overview");
  const [opm, setOpm] = React.useState<number>(0); // orders per minute
  const orderTimestampsRef = React.useRef<number[]>([]);
  const [posTotalRevenue, setPosTotalRevenue] = React.useState<number>(0); // Add POS total revenue state
  const [posTodayRevenue, setPosTodayRevenue] = React.useState<number>(0);
  const [posDailyRevenue, setPosDailyRevenue] = React.useState<Record<string, number>>({});
  const [posTodayCount, setPosTodayCount] = React.useState<number>(0);
  const [kpiRange, setKpiRange] = React.useState<"today" | "7d" | "30d">("today");
  const [posRangeRevenue, setPosRangeRevenue] = React.useState<number>(0);
  const [serverHealthUpdatedAt, setServerHealthUpdatedAt] = React.useState<number | null>(null);

  const rangeDays = kpiRange === "today" ? 1 : kpiRange === "7d" ? 7 : 30;
  const rangeStart = React.useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (rangeDays - 1));
    return start;
  }, [rangeDays]);

  const [commandOpen, setCommandOpen] = React.useState(false);
  const [commandQuery, setCommandQuery] = React.useState("");

  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [notificationsSeenAt, setNotificationsSeenAt] = React.useState<number>(() => Date.now());

  type PinnedAction = {
    kind: "tab" | "action" | "order" | "product";
    value: string;
    label: string;
    tab?: string;
  };
  const [pinnedActions, setPinnedActions] = React.useState<PinnedAction[]>([]);
  const [pinLoading, setPinLoading] = React.useState(false);

  const [orderDetailOpen, setOrderDetailOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);
  const [productDetailOpen, setProductDetailOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<any | null>(null);

  type ActivityItem = { id: string; ts: number; label: string; meta?: string; tone?: "info" | "success" | "warning" };
  const [activity, setActivity] = React.useState<ActivityItem[]>([]);

  const unreadCount = React.useMemo(() => {
    return activity.filter((a) => a.ts > notificationsSeenAt).length;
  }, [activity, notificationsSeenAt]);

  React.useEffect(() => {
    const loadPins = async () => {
      try {
        const res = await apiFetch("/api/pos/settings");
        if (!res.ok) return;
        const data = await res.json();
        const pins = Array.isArray(data?.pinnedActions) ? data.pinnedActions : [];
        setPinnedActions(pins);
      } catch {
        setPinnedActions([]);
      }
    };

    loadPins();
  }, []);

  const savePins = React.useCallback(async (nextPins: PinnedAction[]) => {
    setPinLoading(true);
    try {
      const res = await apiFetch("/api/pos/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedActions: nextPins }),
      });
      if (!res.ok) throw new Error("Failed to save pinned actions");
      setPinnedActions(nextPins);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to save pinned actions",
        variant: "destructive",
      });
    } finally {
      setPinLoading(false);
    }
  }, [toast]);

  const isPinned = React.useCallback((kind: PinnedAction["kind"], value: string) => {
    return pinnedActions.some((p) => p.kind === kind && p.value === value);
  }, [pinnedActions]);

  const togglePin = React.useCallback(async (pin: PinnedAction) => {
    const exists = pinnedActions.some((p) => p.kind === pin.kind && p.value === pin.value);
    const next = exists
      ? pinnedActions.filter((p) => !(p.kind === pin.kind && p.value === pin.value))
      : [pin, ...pinnedActions].slice(0, 12);
    await savePins(next);
  }, [pinnedActions, savePins]);

  const openPinned = React.useCallback((pin: PinnedAction) => {
    if (pin.kind === "tab") {
      if (pin.tab) setActiveTab(pin.tab);
      return;
    }
    if (pin.kind === "order") {
      const o = (orders || []).find((x: any) => String(x.id) === String(pin.value));
      if (o) {
        setSelectedOrder(o);
        setOrderDetailOpen(true);
        setActiveTab("orders");
      }
      return;
    }
    if (pin.kind === "product") {
      const p = (menu || []).find((x: any) => String(x.id) === String(pin.value));
      if (p) {
        setSelectedProduct(p);
        setProductDetailOpen(true);
        setActiveTab("menu");
      }
      return;
    }
    if (pin.kind === "action") {
      if (pin.value === "open_pos") setActiveTab("pos");
      if (pin.value === "open_orders") setActiveTab("orders");
      if (pin.value === "open_menu") setActiveTab("menu");
      if (pin.value === "open_settings") setActiveTab("settings");
      return;
    }
  }, [menu, orders]);

  React.useEffect(() => {
    if (!isAdmin && !isStaff) {
      setLocation("/login");
    }
  }, [isAdmin, isStaff, setLocation]);

  const isTodayLocal = React.useCallback((value: string) => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return d >= start && d < end;
  }, []);

  React.useEffect(() => {
    if (kpiRange === "today") {
      setPosRangeRevenue(0);
      return;
    }

    const loadPosRangeRevenue = async () => {
      try {
        const res = await apiFetch(`/api/pos/reports/trends?days=${rangeDays}`);
        if (!res.ok) return;
        const data = await res.json();
        const daily = Array.isArray(data?.dailySales) ? data.dailySales : [];
        const total = daily.reduce((sum: number, d: any) => sum + (d?.total || 0), 0);
        setPosRangeRevenue(total || 0);
      } catch {
        setPosRangeRevenue(0);
      }
    };

    loadPosRangeRevenue();
  }, [kpiRange, rangeDays]);

  React.useEffect(() => {
    const loadPosDailyRevenue = async () => {
      try {
        const res = await apiFetch(`/api/pos/reports/trends?days=${rangeDays}`);
        if (!res.ok) {
          setPosDailyRevenue({});
          return;
        }
        const data = await res.json();
        const daily = Array.isArray(data?.dailySales) ? data.dailySales : [];
        const next: Record<string, number> = {};
        daily.forEach((d: any) => {
          const key = String(d?._id || "").slice(0, 10);
          if (!key) return;
          next[key] = (next[key] || 0) + (Number(d?.total) || 0);
        });
        setPosDailyRevenue(next);
      } catch {
        setPosDailyRevenue({});
      }
    };

    loadPosDailyRevenue();
  }, [rangeDays]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isK = key === "k";
      if (!isK) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      setCommandOpen((v) => !v);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    const add = (label: string, meta?: string, tone: ActivityItem["tone"] = "info") => {
      setActivity((prev) => {
        const next: ActivityItem[] = [{ id: `${Date.now()}-${Math.random()}`, ts: Date.now(), label, meta, tone }, ...prev];
        return next.slice(0, 20);
      });
    };

    const onOrderNew = (e: any) => {
      const p = e.detail;
      add(`New order #${p?.id}`, p?.total ? formatPriceKSHS(p.total) : undefined, "success");
    };
    const onOrderUpdate = (e: any) => {
      const p = e.detail;
      add(`Order #${p?.id} updated`, p?.status ? `Status: ${p.status}` : undefined, "info");
    };
    const onPosSale = (e: any) => {
      const p = e.detail;
      add("POS sale completed", p?.total ? formatPriceKSHS(p.total) : undefined, "success");
    };
    const onAuditReview = (e: any) => {
      const p = e.detail;
      add("Review audit", p?.action ? `Action: ${p.action}` : undefined, "warning");
    };
    const onAuditNews = (e: any) => {
      const p = e.detail;
      add("News audit", p?.action ? `Action: ${p.action}` : undefined, "info");
    };
    const onAuditUser = (e: any) => {
      const p = e.detail;
      add("User audit", p?.action ? `Action: ${p.action}` : undefined, "info");
    };
    const onHealth = (_e: any) => {
      setServerHealthUpdatedAt(Date.now());
    };

    window.addEventListener("orders:new", onOrderNew as any);
    window.addEventListener("orders:update", onOrderUpdate as any);
    window.addEventListener("pos:sale-completed", onPosSale as any);
    window.addEventListener("audit:review", onAuditReview as any);
    window.addEventListener("audit:news", onAuditNews as any);
    window.addEventListener("audit:user", onAuditUser as any);
    window.addEventListener("server:health", onHealth as any);

    return () => {
      window.removeEventListener("orders:new", onOrderNew as any);
      window.removeEventListener("orders:update", onOrderUpdate as any);
      window.removeEventListener("pos:sale-completed", onPosSale as any);
      window.removeEventListener("audit:review", onAuditReview as any);
      window.removeEventListener("audit:news", onAuditNews as any);
      window.removeEventListener("audit:user", onAuditUser as any);
      window.removeEventListener("server:health", onHealth as any);
    };
  }, []);

  const searchedOrders = React.useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return [];
    const list = (orders || []).filter((o) => {
      const inId = String(o.id || "").toLowerCase().includes(q);
      const inUser = String(o.user || "").toLowerCase().includes(q);
      const inEmail = String((o as any).userEmail || "").toLowerCase().includes(q);
      return inId || inUser || inEmail;
    });
    return list.slice(0, 8);
  }, [orders, commandQuery]);

  const searchedProducts = React.useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return [];
    const list = (menu || []).filter((p) => {
      const inName = String(p.name || "").toLowerCase().includes(q);
      const inBrand = String((p as any).brand || "").toLowerCase().includes(q);
      const inCat = String(p.category || "").toLowerCase().includes(q);
      return inName || inBrand || inCat;
    });
    return list.slice(0, 8);
  }, [menu, commandQuery]);

  const todayOrderRevenue = React.useMemo(() => {
    return (orders || [])
      .filter((o) => o.status !== "Cancelled" && isTodayLocal(o.date))
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders, isTodayLocal]);

  const orderRangeRevenue = React.useMemo(() => {
    const startMs = rangeStart.getTime();
    return (orders || [])
      .filter((o) => o.status !== "Cancelled")
      .filter((o) => {
        const d = new Date(o.date);
        if (isNaN(d.getTime())) return false;
        return d.getTime() >= startMs;
      })
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders, rangeStart]);

  const totalRangeRevenue = orderRangeRevenue + (kpiRange === "today" ? posTodayRevenue : posRangeRevenue);

  // Fetch POS sales for total + today's revenue
  React.useEffect(() => {
    const fetchPOSRevenue = async () => {
      try {
        const [totalRes, summaryRes] = await Promise.all([
          apiFetch('/api/pos/sales/total'),
          apiFetch('/api/pos/sales/summary'),
        ]);

        if (totalRes.ok) {
          const data = await totalRes.json();
          setPosTotalRevenue(data.totalRevenue || 0);
        } else {
          console.error('POS total revenue fetch failed:', totalRes.status, totalRes.statusText);
        }

        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setPosTodayRevenue(data?.today?.total || 0);
          setPosTodayCount(data?.today?.count || 0);
        } else {
          console.error('POS today revenue fetch failed:', summaryRes.status, summaryRes.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch POS revenue:', error);
      }
    };

    fetchPOSRevenue();
    
    // Refresh POS revenue every 5 minutes to ensure current data
    const interval = setInterval(fetchPOSRevenue, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const handleNew = (e: any) => {
      const payload = e.detail;
      toast({ title: 'New Order', description: `Order #${payload.id} for ${formatPriceKSHS(payload.total)}` });
      try {
        const now = Date.now();
        orderTimestampsRef.current.push(now);
        const cutoff = now - 60_000;
        orderTimestampsRef.current = orderTimestampsRef.current.filter(x => x >= cutoff);
        setOpm(orderTimestampsRef.current.length);
        // Trigger particle effect
        createParticleBurst();
      } catch (err) {}
      playBeep();
    };
    const handleUpdate = (e: any) => {
      const payload = e.detail;
      toast({ title: 'Order Updated', description: `Order #${payload.id} status: ${payload.status}` });
    };
    const onChat = (e: any) => {
      const payload = e.detail;
      toast({ title: `Message from ${payload.message.senderName}`, description: payload.message.text });
      playBeep();
    };
    const onPOSSale = (e: any) => {
      const payload = e.detail;
      toast({ title: 'POS Sale Completed', description: `Sale for ${formatPriceKSHS(payload.total)}` });
      // Add the new sale amount to existing POS total revenue
      setPosTotalRevenue(prev => prev + payload.total);
      setPosTodayRevenue(prev => prev + payload.total);
      setPosTodayCount(prev => prev + 1);
      try {
        const key = new Date().toISOString().slice(0, 10);
        setPosDailyRevenue(prev => ({ ...prev, [key]: (prev[key] || 0) + (payload.total || 0) }));
      } catch (err) {}
    };
    
    window.addEventListener('orders:new', handleNew);
    window.addEventListener('orders:update', handleUpdate);
    window.addEventListener('chat:message', onChat);
    window.addEventListener('pos:sale-completed', onPOSSale);
    
    return () => { 
      window.removeEventListener('orders:new', handleNew); 
      window.removeEventListener('orders:update', handleUpdate); 
      window.removeEventListener('chat:message', onChat);
      window.removeEventListener('pos:sale-completed', onPOSSale);
    };
  }, [toast]);

  // Particle burst effect for order confirmations
  const createParticleBurst = () => {
    const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(280 70% 50%)'];
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.backgroundColor = colors[i % colors.length];
      particle.style.setProperty('--tx', `${(Math.random() - 0.5) * 200}px`);
      particle.style.setProperty('--ty', `${(Math.random() - 0.5) * 200}px`);
      
      const container = document.querySelector('.particle-container') || document.body;
      container.appendChild(particle);
      
      setTimeout(() => particle.remove(), 1000);
    }
  };

  // Scroll-based font weight animation (currently unused)
  // const [scrollY, setScrollY] = React.useState(0);
  // React.useEffect(() => {
  //   const handleScroll = () => setScrollY(window.scrollY);
  //   window.addEventListener('scroll', handleScroll);
  //   return () => window.removeEventListener('scroll', handleScroll);
  // }, []);
  // const fontWeight = Math.min(900, Math.max(400, 400 + scrollY / 10));

  if (!user || (!isAdmin && !isStaff)) return null;

  return (
    <div className="container mx-auto px-4 py-8 particle-container">
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput
          placeholder="Search orders, products, or run an action…"
          value={commandQuery}
          onValueChange={setCommandQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => { setActiveTab("orders"); setCommandOpen(false); }}>
              <ShoppingBag className="h-4 w-4" />
              Orders
              <CommandShortcut>O</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { setActiveTab("pos"); setCommandOpen(false); }}>
              <DollarSign className="h-4 w-4" />
              POS
              <CommandShortcut>P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { setActiveTab("menu"); setCommandOpen(false); }}>
              <Mail className="h-4 w-4" />
              Menu
              <CommandShortcut>M</CommandShortcut>
            </CommandItem>
            {(isAdmin || isStaff) && (
              <CommandItem onSelect={() => { setActiveTab("news"); setCommandOpen(false); }}>
                <Newspaper className="h-4 w-4" />
                News
                <CommandShortcut>N</CommandShortcut>
              </CommandItem>
            )}
            <CommandItem onSelect={() => { setActiveTab("settings"); setCommandOpen(false); }}>
              <Settings className="h-4 w-4" />
              Settings
              <CommandShortcut>S</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Pin shortcuts">
            <CommandItem
              onSelect={() => {
                void togglePin({ kind: "action", value: "open_pos", label: "Open POS", tab: "pos" });
              }}
            >
              {isPinned("action", "open_pos") ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned("action", "open_pos") ? "Unpin Open POS" : "Pin Open POS"}
            </CommandItem>
            <CommandItem
              onSelect={() => {
                void togglePin({ kind: "action", value: "open_orders", label: "Open Orders", tab: "orders" });
              }}
            >
              {isPinned("action", "open_orders") ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned("action", "open_orders") ? "Unpin Open Orders" : "Pin Open Orders"}
            </CommandItem>
            <CommandItem
              onSelect={() => {
                void togglePin({ kind: "action", value: "open_menu", label: "Open Menu", tab: "menu" });
              }}
            >
              {isPinned("action", "open_menu") ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned("action", "open_menu") ? "Unpin Open Menu" : "Pin Open Menu"}
            </CommandItem>
            {(isAdmin || isStaff) && (
              <CommandItem
                onSelect={() => {
                  void togglePin({ kind: "action", value: "open_news", label: "Open News", tab: "news" });
                }}
              >
                {isPinned("action", "open_news") ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                {isPinned("action", "open_news") ? "Unpin Open News" : "Pin Open News"}
              </CommandItem>
            )}
            <CommandItem
              onSelect={() => {
                void togglePin({ kind: "action", value: "open_settings", label: "Open Settings", tab: "settings" });
              }}
            >
              {isPinned("action", "open_settings") ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned("action", "open_settings") ? "Unpin Open Settings" : "Pin Open Settings"}
            </CommandItem>
          </CommandGroup>

          {pinnedActions.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Pinned">
                {pinnedActions.map((p) => (
                  <CommandItem
                    key={`${p.kind}:${p.value}`}
                    onSelect={() => {
                      setCommandOpen(false);
                      openPinned(p);
                    }}
                  >
                    <Pin className="h-4 w-4" />
                    {p.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />

          <CommandGroup heading="Quick actions">
            {(isAdmin || isStaff) && (
              <CommandItem onSelect={() => { setActiveTab("news"); setCommandOpen(false); toast({ title: "Tip", description: "Use News tab to create a post." }); }}>
                <Plus className="h-4 w-4" />
                Create News
              </CommandItem>
            )}
            <CommandItem onSelect={() => { setActiveTab("pos"); setCommandOpen(false); }}>
              <DollarSign className="h-4 w-4" />
              Open POS
            </CommandItem>
            {isAdmin && (
              <CommandItem onSelect={() => { setActiveTab("menu"); setCommandOpen(false); toast({ title: "Tip", description: "Use Menu tab to add products." }); }}>
                <Plus className="h-4 w-4" />
                Add product
              </CommandItem>
            )}
            <CommandItem onSelect={() => { setActiveTab("orders"); setCommandOpen(false); }}>
              <Search className="h-4 w-4" />
              View today’s orders
            </CommandItem>
          </CommandGroup>

          {(searchedOrders.length > 0 || searchedProducts.length > 0) && <CommandSeparator />}

          {searchedOrders.length > 0 && (
            <CommandGroup heading="Orders">
              {searchedOrders.map((o) => (
                <CommandItem
                  key={o.id}
                  onSelect={() => {
                    setActiveTab("orders");
                    setCommandOpen(false);
                    setSelectedOrder(o);
                    setOrderDetailOpen(true);
                  }}
                >
                  <ShoppingBag className="h-4 w-4" />
                  #{o.id}
                  <span className="ml-2 text-muted-foreground truncate">{o.user}</span>
                  <span className="ml-auto font-mono text-muted-foreground">{formatPriceKSHS(o.total)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {searchedProducts.length > 0 && (
            <CommandGroup heading="Products">
              {searchedProducts.map((p) => (
                <CommandItem
                  key={p.id}
                  onSelect={() => {
                    setActiveTab("menu");
                    setCommandOpen(false);
                    setSelectedProduct(p);
                    setProductDetailOpen(true);
                  }}
                >
                  <Mail className="h-4 w-4" />
                  {p.name}
                  <span className="ml-auto font-mono text-muted-foreground">{formatPriceKSHS(p.price)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      <Dialog open={orderDetailOpen} onOpenChange={(open) => { setOrderDetailOpen(open); if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>Order #{selectedOrder?.id}</span>
              {selectedOrder?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={pinLoading}
                  onClick={() => {
                    void togglePin({
                      kind: "order",
                      value: String(selectedOrder.id),
                      label: `Order #${selectedOrder.id}`,
                      tab: "orders",
                    });
                  }}
                >
                  {isPinned("order", String(selectedOrder.id)) ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                  {isPinned("order", String(selectedOrder.id)) ? "Unpin" : "Pin"}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="text-sm"><span className="text-muted-foreground">Customer:</span> {selectedOrder.user}</div>
                <div className="text-sm"><span className="text-muted-foreground">Status:</span> {selectedOrder.status}</div>
                <div className="text-sm"><span className="text-muted-foreground">Total:</span> {formatPriceKSHS(selectedOrder.total)}</div>
                <div className="text-sm"><span className="text-muted-foreground">Date:</span> {new Date(selectedOrder.date).toLocaleString()}</div>
              </div>

              {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 border-b bg-muted/30 text-sm font-medium">Items</div>
                  <div className="divide-y">
                    {selectedOrder.items.slice(0, 12).map((it: any, idx: number) => (
                      <div key={idx} className="px-4 py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{it?.item?.name || it?.name || "Item"}</div>
                          <div className="text-xs text-muted-foreground">Qty: {it?.quantity ?? "—"}</div>
                        </div>
                        <div className="text-sm font-mono text-muted-foreground">{it?.item?.price ? formatPriceKSHS(it.item.price) : ""}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No order selected.</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={productDetailOpen} onOpenChange={(open) => { setProductDetailOpen(open); if (!open) setSelectedProduct(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>{selectedProduct?.name || "Product"}</span>
              {selectedProduct?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={pinLoading}
                  onClick={() => {
                    void togglePin({
                      kind: "product",
                      value: String(selectedProduct.id),
                      label: selectedProduct.name || `Product ${selectedProduct.id}`,
                      tab: "menu",
                    });
                  }}
                >
                  {isPinned("product", String(selectedProduct.id)) ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                  {isPinned("product", String(selectedProduct.id)) ? "Unpin" : "Pin"}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="text-sm"><span className="text-muted-foreground">Category:</span> {selectedProduct.category || "—"}</div>
                <div className="text-sm"><span className="text-muted-foreground">Price:</span> {formatPriceKSHS(selectedProduct.price)}</div>
                <div className="text-sm"><span className="text-muted-foreground">Stock:</span> {selectedProduct.stock ?? "—"}</div>
                <div className="text-sm"><span className="text-muted-foreground">Status:</span> {selectedProduct.available ? "Available" : "Unavailable"}</div>
              </div>
              {selectedProduct.description && (
                <div className="text-sm text-muted-foreground leading-relaxed">{selectedProduct.description}</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No product selected.</div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="mb-6 border shadow-sm overflow-hidden">
        <div className="bg-linear-to-r from-primary/10 via-background to-secondary/10">
          <CardContent className="py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-4xl font-heading font-bold text-foreground mb-2">Admin Dashboard</h1>
                <p className="text-muted-foreground text-lg">Welcome back, {user.name}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                    {user.role.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary" className="gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Online
                  </Badge>
                  <Badge variant="outline" className="gap-2">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Today Orders: {(orders || []).filter((o) => o.status !== "Cancelled" && isTodayLocal(o.date)).length}
                  </Badge>
                  <Badge variant="outline" className="gap-2">
                    <DollarSign className="h-3.5 w-3.5" />
                    Today POS: {posTodayCount}
                  </Badge>
                  <Badge variant="outline" className="gap-2">
                    <DollarSign className="h-3.5 w-3.5" />
                    Today: {formatPriceKSHS(todayOrderRevenue + posTodayRevenue)}
                  </Badge>
                  <Badge variant="outline" className="gap-2">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Active: {kpis?.activeOrders ?? orders.filter(o => o.status !== 'Delivered').length}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Button
                  variant="outline"
                  className="h-11 px-4"
                  onClick={() => setCommandOpen(true)}
                  aria-label="Open command palette"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                  <span className="ml-2 text-xs text-muted-foreground">Ctrl/⌘ K</span>
                </Button>

                <Popover
                  open={notificationsOpen}
                  onOpenChange={(open) => {
                    setNotificationsOpen(open);
                    if (open) setNotificationsSeenAt(Date.now());
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-11 px-4 relative"
                      aria-label="Notifications"
                    >
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-96 p-0">
                    <div className="p-4 border-b flex items-center justify-between">
                      <div>
                        <div className="font-semibold">Notifications</div>
                        <div className="text-xs text-muted-foreground">Recent activity and audits</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setNotificationsSeenAt(Date.now())}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark read
                      </Button>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-4 space-y-3">
                      {activity.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No notifications yet.</div>
                      ) : (
                        activity.slice(0, 15).map((a) => (
                          <div key={a.id} className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{a.label}</div>
                              {a.meta && <div className="text-xs text-muted-foreground">{a.meta}</div>}
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0">{new Date(a.ts).toLocaleTimeString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {pinnedActions.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    {pinnedActions
                      .filter((p) => p.kind === "tab" || p.kind === "action")
                      .slice(0, 3)
                      .map((p) => (
                        <Button
                          key={`${p.kind}:${p.value}`}
                          variant="outline"
                          className="h-11 px-4"
                          onClick={() => openPinned(p)}
                          aria-label={p.label}
                        >
                          <Pin className="h-4 w-4 mr-2" />
                          {p.label}
                        </Button>
                      ))}
                  </div>
                )}

                <Button className="h-11 px-5" onClick={() => setActiveTab("pos")}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Open POS
                </Button>
                <Button variant="outline" className="h-11 px-5" onClick={() => setActiveTab("orders")}>
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Orders
                </Button>
                <Button variant="outline" className="h-11 px-5" onClick={() => setActiveTab("menu")}>
                  <Mail className="h-4 w-4 mr-2" />
                  Menu
                </Button>
                <Button variant="outline" className="h-11 px-5" onClick={() => setActiveTab("settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="sticky top-16 z-20 -mx-4 px-4 py-3 bg-background/80 backdrop-blur-xl border-b supports-backdrop-filter:bg-background/60">
          <TabsList className="w-full flex flex-nowrap gap-2 p-1 bg-muted/50 rounded-xl border overflow-x-auto overscroll-x-contain snap-x snap-mandatory">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm snap-start shrink-0">
              <span className="inline-flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Overview
              </span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm snap-start shrink-0">
              <span className="inline-flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm snap-start shrink-0">
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Orders
              </span>
            </TabsTrigger>
            <TabsTrigger value="pos" className="data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm snap-start shrink-0">
              <span className="inline-flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                POS
              </span>
            </TabsTrigger>
            <TabsTrigger value="menu" className="data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm snap-start shrink-0">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Menu
              </span>
            </TabsTrigger>
            <TabsTrigger value="location" className="data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm snap-start shrink-0">
              <span className="inline-flex items-center gap-2">
                <MapPinned className="h-4 w-4" />
                Location
              </span>
            </TabsTrigger>
            <TabsTrigger value="news" className="data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm snap-start shrink-0">
              <span className="inline-flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                News
              </span>
            </TabsTrigger>
            <TabsTrigger value="newsletter" className="data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm snap-start shrink-0">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Newsletter
              </span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm snap-start shrink-0">
              <span className="inline-flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </span>
            </TabsTrigger>

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="sm:hidden inline-flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg text-sm border bg-background/70 hover:bg-background transition-colors snap-start shrink-0"
                    aria-label="More admin tabs"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    More
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setActiveTab("users")}>Users</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setActiveTab("audit")}>Audit</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setActiveTab("user-audit")}>User Audit</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isAdmin && (
              <TabsTrigger value="users" className="hidden sm:inline-flex data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm snap-start shrink-0">
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </span>
              </TabsTrigger>
            )}
            {isAdmin && <TabsTrigger value="audit" className="hidden sm:inline-flex data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm snap-start shrink-0">Audit</TabsTrigger>}
            {isAdmin && <TabsTrigger value="user-audit" className="hidden sm:inline-flex data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm snap-start shrink-0">User Audit</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-muted-foreground">KPIs</div>
              <div className="flex gap-2">
                <Button variant={kpiRange === "today" ? "default" : "outline"} className="h-9 px-4" onClick={() => setKpiRange("today")}>Today</Button>
                <Button variant={kpiRange === "7d" ? "default" : "outline"} className="h-9 px-4" onClick={() => setKpiRange("7d")}>7d</Button>
                <Button variant={kpiRange === "30d" ? "default" : "outline"} className="h-9 px-4" onClick={() => setKpiRange("30d")}>30d</Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-2">
                Orders: {formatPriceKSHS(orderRangeRevenue)}
              </Badge>
              <Badge variant="outline" className="gap-2">
                POS: {formatPriceKSHS(kpiRange === "today" ? posTodayRevenue : posRangeRevenue)}
              </Badge>
              <Badge variant="secondary" className="gap-2">
                Total: {formatPriceKSHS(totalRangeRevenue)}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPriceKSHS(
                    (kpis?.totalRevenue && kpis.totalRevenue > 0)
                      ? kpis.totalRevenue
                      : (orders.reduce((sum, o) => sum + o.total, 0) + posTotalRevenue)
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPriceKSHS(todayOrderRevenue + posTodayRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Resets daily at midnight</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Server Health</CardTitle>
                <div className={`w-3 h-3 rounded-full ${serverHealth && serverHealthUpdatedAt && Date.now() - serverHealthUpdatedAt < 60_000 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
              </CardHeader>
              <CardContent>
                {serverHealth ? (
                  <div>
                    <div className="text-sm">Memory: {(serverHealth.memory.rss / (1024*1024)).toFixed(1)} MB</div>
                    <div className="text-sm">Load: {serverHealth.load[0].toFixed(2)}</div>
                    <div className="text-sm">Uptime: {Math.floor(serverHealth.uptime/60)} mins</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Last update: {serverHealthUpdatedAt ? new Date(serverHealthUpdatedAt).toLocaleTimeString() : '—'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {orders.filter(o => o.status !== "Delivered").length}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <p className="text-xs text-muted-foreground">Live updates</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allUsers.length}</div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">+12% this month</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <Card className="border shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>Live feed from orders, POS, and audits</CardDescription>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No activity yet.</div>
                ) : (
                  <div className="space-y-3">
                    {activity.map((a) => (
                      <div key={a.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{a.label}</div>
                          {a.meta && <div className="text-xs text-muted-foreground">{a.meta}</div>}
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">{new Date(a.ts).toLocaleTimeString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Revenue Sparkline</CardTitle>
                <CardDescription>{kpiRange === "today" ? "Today" : `Last ${rangeDays} days`}</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const startMs = rangeStart.getTime();
                  const buckets: Record<string, number> = {};
                  for (let i = 0; i < rangeDays; i++) {
                    const d = new Date(rangeStart);
                    d.setDate(d.getDate() + i);
                    const key = d.toISOString().slice(0, 10);
                    buckets[key] = 0;
                  }
                  (orders || []).forEach((o) => {
                    if (o.status === "Cancelled") return;
                    const d = new Date(o.date);
                    if (isNaN(d.getTime())) return;
                    if (d.getTime() < startMs) return;
                    const key = d.toISOString().slice(0, 10);
                    if (!(key in buckets)) return;
                    buckets[key] += o.total || 0;
                  });

                  Object.keys(buckets).forEach((key) => {
                    buckets[key] += posDailyRevenue[key] || 0;
                  });

                  if (kpiRange === "today") {
                    const todayKey = rangeStart.toISOString().slice(0, 10);
                    if (todayKey in buckets) {
                      buckets[todayKey] = todayOrderRevenue + posTodayRevenue;
                    }
                  }
                  const points = Object.values(buckets);
                  const max = Math.max(1, ...points);
                  return (
                    <div className="h-16 flex items-end gap-1">
                      {points.map((v, idx) => (
                        <div
                          key={idx}
                          className="flex-1 rounded-sm bg-primary/30"
                          style={{ height: `${Math.max(2, Math.round((v / max) * 64))}px` }}
                        />
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <AnimatedCharts posTotalRevenue={posTotalRevenue} />
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <SocialLinksManager />
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Orders / min</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{opm}</div>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis?.activeOrders ?? orders.filter(o => o.status !== 'Delivered').length}</div>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPriceKSHS((kpis?.totalRevenue && kpis.totalRevenue > 0) ? kpis.totalRevenue : (orders.reduce((sum, o) => sum + o.total, 0) + posTotalRevenue))}</div>
                </CardContent>
              </Card>
            </div>

            {/* Active Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Active Orders</CardTitle>
                <CardDescription>Manage incoming orders and update their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {orders.filter(o => o.status !== 'Delivered').slice(0, 6).map((order) => (
                    <OrderLocationView
                      key={order.id}
                      order={{
                        ...order,
                        createdAt: order.date || new Date().toISOString()
                      }}
                      onUpdateStatus={(orderId: string, status: string) => updateOrderStatus(orderId, status as any)}
                      onContactCustomer={(customerName) => {
                        toast({
                          title: "Contact Customer",
                          description: `Opening contact options for ${customerName}`,
                        });
                      }}
                    />
                  ))}
                </div>
                {orders.filter(o => o.status !== 'Delivered').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No active orders</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>Complete order history and management</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id.slice(-6)}</TableCell>
                        <TableCell>{order.user}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {order.userPhone && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(`tel:${order.userPhone}`, '_self')}
                                className="h-7 px-2 text-xs"
                              >
                                <Phone className="h-3 w-3 mr-1" />
                                {order.userPhone}
                              </Button>
                            )}
                            {order.userEmail && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => window.open(`mailto:${order.userEmail}`, '_blank')}
                                className="h-7 px-2 text-xs"
                              >
                                <Mail className="h-3 w-3 mr-1" />
                                Email
                              </Button>
                            )}
                            {!order.userPhone && !order.userEmail && (
                              <span className="text-xs text-muted-foreground">No contact</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{order.items.length} items</TableCell>
                        <TableCell>{formatPriceKSHS(order.total)}</TableCell>
                        <TableCell>
                          {order.location ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 text-primary" />
                                <span className="truncate max-w-[200px]">{order.location.address}</span>
                              </div>
                              {order.location.instructions && (
                                <div className="text-xs text-muted-foreground italic">
                                  "{order.location.instructions}"
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No location</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={order.status === "Delivered" ? "secondary" : "outline"}
                            className={order.status === "Pending" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : ""}
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select 
                            defaultValue={order.status} 
                            onValueChange={(val: any) => {
                              if (isAdmin || isStaff) {
                                updateOrderStatus(order.id, val);
                              } else {
                                toast({
                                  title: "Permission Denied",
                                  description: "Only staff and admin can update order status",
                                  variant: "destructive"
                                });
                              }
                            }}
                            disabled={!isAdmin && !isStaff}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Preparing">Preparing</SelectItem>
                              <SelectItem value="OnRoute">OnRoute</SelectItem>
                              <SelectItem value="Delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pos">
          <POSSystem />
        </TabsContent>

        <TabsContent value="menu">
          <DragDropMenuManager />
        </TabsContent>

        <TabsContent value="location">
          <BusinessLocationManager />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User & Staff Management</CardTitle>
                <CardDescription>Manage roles and permissions for all users.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>Change Role</TableHead>
                      <TableHead>Phone Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.name}
                          {u.jobTitle && <span className="text-xs text-muted-foreground block">{u.jobTitle}</span>}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{u.phone || '-'}</div>
                          {u.phone && !u.phoneVerified && <div className="text-xs text-muted-foreground">Not verified</div>}
                          {u.phone && u.phoneVerified && <div className="text-xs text-muted-foreground">Verified</div>}
                        </TableCell>
                        <TableCell>@{u.username}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select 
                            defaultValue={u.role} 
                            onValueChange={(val: Role) => updateUserRole(u.id, val)}
                            disabled={u.username === "admin"} // Prevent locking out admin
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="flex gap-2 items-center justify-end">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm">Change Phone</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Change Phone for {u.name}</DialogTitle>
                                <div className="text-sm text-muted-foreground">Provide a new phone and optional reason to be logged.</div>
                              </DialogHeader>
                              <ChangePhoneForm user={u} onDone={async () => { await refreshAllUsers(); }} />
                            </DialogContent>
                          </Dialog>
                          {u.phone && !u.phoneVerified && (
                            <Button size="sm" variant="secondary" onClick={async () => {
                              // verify phone
                              try {
                                const resp = await apiFetch(`/api/users/${u.id}/phone/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Admin verified', note: '' }) });
                                if (resp.ok) {
                                  toast({ title: 'Verified', description: `${u.name}'s phone verified.` });
                                  // Refresh users
                                  await refreshAllUsers();
                                } else {
                                  const d = await resp.json();
                                  toast({ title: 'Error', description: d.message || 'Could not verify phone', variant: 'destructive' });
                                }
                              } catch (err) { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
                            }}>Verify</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Review Audit Log</CardTitle>
                <CardDescription>Recent moderation actions related to reviews.</CardDescription>
              </CardHeader>
              <CardContent>
                <AuditViewer />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        <TabsContent value="news">
          <NewsManager />
        </TabsContent>
        <TabsContent value="newsletter">
          <NewsletterManager />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="user-audit">
            <Card>
              <CardHeader>
                <CardTitle>User Audit Log</CardTitle>
                <CardDescription>Recent actions for user audits (phone changes, verifications)</CardDescription>
              </CardHeader>
              <CardContent>
                <UserAuditViewer />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}


function ChangePhoneForm({ user, onDone }: { user: any; onDone?: () => void }) {
  const { refreshAllUsers } = useHybridAuth();
  const { toast } = useToast();
  const [phone, setPhone] = React.useState(user.phone || '');
  const [verify, setVerify] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [note, setNote] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm block mb-1">New phone</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +254700000000" />
      </div>
      <div>
        <label className="text-sm block mb-1">Reason (optional)</label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for change" />
      </div>
      <div>
        <label className="text-sm block mb-1">Notes (optional)</label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional notes" />
      </div>
      <div className="flex gap-2 items-center">
        <input id={`verify-${user.id}`} type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} />
        <label htmlFor={`verify-${user.id}`} className="text-sm">Mark as verified</label>
      </div>
      <div className="flex gap-2 justify-end">
        <Button onClick={async () => {
          if (!phone || phone.trim().length < 7) return toast({ title: 'Invalid phone', description: 'Enter a valid phone number', variant: 'destructive' });
          setLoading(true);
          try {
            const resp = await apiFetch(`/api/users/${user.id}/phone`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, reason, note, verify }) });
            if (resp.ok) {
              toast({ title: 'Phone updated', description: 'User phone updated.' });
              await refreshAllUsers();
              if (onDone) onDone();
            } else {
              const d = await resp.json();
              toast({ title: 'Failed', description: d.message || 'Could not change phone', variant: 'destructive' });
            }
          } catch (err) {
            toast({ title: 'Network error', description: 'Could not change phone', variant: 'destructive' });
          } finally {
            setLoading(false);
          }
        }} disabled={loading} className="ml-auto">{loading ? 'Saving…' : 'Save'}</Button>
      </div>
    </div>
  );
}




function AuditViewer() {
  const { fetchReviewAudits, restoreReview } = useData();
  const { toast } = useToast();
  const [audits, setAudits] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState({ action: '', byName: '', reviewId: '', start: '', end: '', page: 1, pageSize: 25, sort: 'desc', exportAll: false });
  const [reviewTotal, setReviewTotal] = React.useState<number>(0);
  const [restoringIds, setRestoringIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const resp = await fetchReviewAudits({ action: filters.action || undefined, byName: filters.byName || undefined, reviewId: filters.reviewId || undefined, start: filters.start || undefined, end: filters.end || undefined, page: filters.page, pageSize: filters.pageSize, sort: filters.sort as "desc" | "asc", exportAll: filters.exportAll });
      if (mounted) {
        setAudits(resp.audits || []);
        setReviewTotal(resp.total || 0);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [fetchReviewAudits, filters]);

  React.useEffect(() => {
    const onAudit = (e: any) => {
      const payload = e.detail;
      // Prepend to audit list to show latest
      setAudits(prev => [payload, ...prev]);
    };
    window.addEventListener('audit:review', onAudit);
    return () => window.removeEventListener('audit:review', onAudit);
  }, []);

  const handleRestore = async (reviewId: string) => {
    setRestoringIds(prev => new Set(prev).add(reviewId));
    const ok = await restoreReview(reviewId);
    if (ok) {
      toast({ title: 'Restored', description: 'Review restored successfully.' });
      // Remove the restored audit entry from the list
      setAudits(prev => prev.filter(a => a.reviewId !== reviewId));
      setReviewTotal(prev => Math.max(0, prev - 1));
    } else {
      toast({ title: 'Error', description: 'Could not restore review', variant: 'destructive' });
    }
    setRestoringIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(reviewId);
      return newSet;
    });
  };

  if (loading) return <div>Loading audit entries…</div>;

  if (!audits.length) return <div className="text-sm text-muted-foreground">No audit activity found.</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
        <div className="flex gap-2 items-center">
          <label className="text-sm">Action</label>
          <select value={filters.action} onChange={(e) => setFilters(f => ({ ...f, action: e.target.value, page: 1 }))} className="rounded border px-2 py-1">
            <option value="">Any</option>
            <option value="deleted">deleted</option>
            <option value="restored">restored</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm">By</label>
          <input value={filters.byName} onChange={(e) => setFilters(f => ({ ...f, byName: e.target.value, page: 1 }))} placeholder="Username" className="rounded border px-2 py-1"/>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm">Review ID</label>
          <input value={filters.reviewId} onChange={(e) => setFilters(f => ({ ...f, reviewId: e.target.value, page: 1 }))} placeholder="review id" className="rounded border px-2 py-1"/>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm">From</label>
          <input type="date" value={filters.start} onChange={(e) => setFilters(f => ({ ...f, start: e.target.value }))} className="rounded border px-2 py-1" />
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm">To</label>
          <input type="date" value={filters.end} onChange={(e) => setFilters(f => ({ ...f, end: e.target.value }))} className="rounded border px-2 py-1" />
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm">Sort</label>
          <select value={filters.sort} onChange={(e) => setFilters(f => ({ ...f, sort: e.target.value as any, page: 1 }))} className="rounded border px-2 py-1">
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm">Page Size</label>
          <select value={filters.pageSize} onChange={(e) => setFilters(f => ({ ...f, pageSize: Number(e.target.value), page: 1 }))} className="rounded border px-2 py-1">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm">Export All</label>
          <input type="checkbox" checked={filters.exportAll} onChange={(e) => setFilters(f => ({ ...f, exportAll: e.target.checked }))} />
        </div>

        <div className="ml-auto flex gap-2 items-center">
          <Button size="sm" onClick={async () => {
            // export CSV
            const resp = await fetchReviewAudits({ ...filters, exportCsv: true, sort: filters.sort as "desc" | "asc", exportAll: filters.exportAll });
            if ((resp as any).csv) {
              const blob = new Blob([(resp as any).csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'review_audit.csv'; a.click();
              URL.revokeObjectURL(url);
            } else {
              toast({ title: 'Export failed', variant: 'destructive' });
            }
          }}>Export CSV</Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Review ID</TableHead>
            <TableHead>By</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {audits.map(a => (
            <TableRow key={a.id}>
              <TableCell className="text-xs">
            {(() => {
              const date = new Date(a.timestamp);
              const isValid = !isNaN(date.getTime());
              return isValid ? date.toLocaleString() : 'Invalid time';
            })()}
          </TableCell>
              <TableCell>{a.action}</TableCell>
              <TableCell className="text-xs">{a.reviewId}</TableCell>
              <TableCell>{a.byName || a.byId}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{a.reason || '-'}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{a.note || '-'}</TableCell>
              <TableCell>
                {a.action === 'deleted' && !restoringIds.has(a.reviewId) && (
                  <Button size="sm" onClick={() => handleRestore(a.reviewId)}>Restore</Button>
                )}
                {restoringIds.has(a.reviewId) && (
                  <Button size="sm" disabled>Restoring...</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      
      
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">Showing {Math.min(filters.pageSize * (filters.page - 1) + 1, reviewTotal)}–{Math.min(filters.page * filters.pageSize, reviewTotal)} of {reviewTotal} (Sorted {filters.sort})</div>
        <div className="flex gap-2">
          <Button size="sm" onClick={async () => {
            if (filters.page <= 1) return;
            const next = filters.page - 1;
            setFilters(f => ({ ...f, page: next }));
            const resp = await fetchReviewAudits({ ...filters, page: next, sort: filters.sort as "desc" | "asc" });
            setAudits(resp.audits || []);
            setReviewTotal(resp.total || 0);
          }} disabled={filters.page <= 1}>Prev</Button>
          <Button size="sm" onClick={async () => {
            const maxPage = Math.max(1, Math.ceil((reviewTotal || 0) / filters.pageSize));
            if (filters.page >= maxPage) return;
            const next = filters.page + 1;
            setFilters(f => ({ ...f, page: next }));
            const resp = await fetchReviewAudits({ ...filters, page: next, sort: filters.sort as "desc" | "asc" });
            setAudits(resp.audits || []);
            setReviewTotal(resp.total || 0);
          }} disabled={filters.page >= Math.max(1, Math.ceil((reviewTotal || 0) / filters.pageSize))}>Next</Button>
        </div>
      </div>

      

      
    </div>
  );
}

function UserAuditViewer() {
  const { toast } = useToast();
  const [audits, setAudits] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState({ action: '', byName: '', userId: '', start: '', end: '', page: 1, pageSize: 25, sort: 'desc', exportAll: false });
  const [, setTotal] = React.useState<number>(0);

  const fetchUserAudits = async (opts: any = {}) => {
    const params = new URLSearchParams();
    if (opts.action) params.set('action', opts.action);
    if (opts.byName) params.set('byName', opts.byName);
    if (opts.userId) params.set('userId', opts.userId);
    if (opts.start) params.set('start', opts.start);
    if (opts.end) params.set('end', opts.end);
    if (opts.page) params.set('page', String(opts.page));
    if (opts.pageSize) params.set('pageSize', String(opts.pageSize));
    if (opts.sort) params.set('sort', opts.sort);
    if (opts.exportAll) params.set('exportAll', 'true');
    if (opts.exportCsv) params.set('export', 'csv');
    const url = `/api/users/audit?${params.toString()}`;
    const resp = await apiFetch(url);
    if (!resp.ok) throw new Error(await resp.text());
    const ct = resp.headers.get('content-type') || '';
    if (opts.exportCsv || ct.includes('text/csv')) {
      const text = await resp.text();
      return { audits: [], total: 0, page: 1, pageSize: 0, csv: text } as any;
    }
    const d = await resp.json();
    return { audits: d.audits || [], total: d.total, page: d.page, pageSize: d.pageSize };
  };

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchUserAudits(filters);
        if (mounted) { setAudits(r.audits || []); setTotal(r.total || 0); }
      } catch (err) { toast({ title: 'Error', description: 'Could not fetch audits', variant: 'destructive' }); }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [filters]);

  React.useEffect(() => {
    const onAudit = (e: any) => {
      const payload = e.detail;
      setAudits(prev => [payload, ...prev]);
      setTotal(prev => prev + 1);
    };
    window.addEventListener('audit:user', onAudit);
    return () => window.removeEventListener('audit:user', onAudit);
  }, []);

  if (loading) return <div>Loading audits…</div>;
  if (!audits.length) return <div className="text-sm text-muted-foreground">No user audit activity found.</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <label>Action</label>
        <select value={filters.action} onChange={(e) => setFilters(f => ({ ...f, action: e.target.value, page: 1 }))} className="rounded border px-2 py-1">
          <option value="">Any</option>
          <option value="phone_changed">phone_changed</option>
          <option value="phone_verified">phone_verified</option>
          <option value="phone_confirmed">phone_confirmed</option>
        </select>
        <label>By</label><input value={filters.byName} onChange={(e) => setFilters(f => ({ ...f, byName: e.target.value, page: 1 }))} className="rounded border px-2 py-1" />
        <label>User ID</label><input value={filters.userId} onChange={(e) => setFilters(f => ({ ...f, userId: e.target.value, page: 1 }))} className="rounded border px-2 py-1" />
        <div className="ml-auto flex gap-2">
          <Button onClick={async () => {
            const r = await fetchUserAudits({ ...filters, exportCsv: true, exportAll: filters.exportAll });
            if ((r as any).csv) {
              const blob = new Blob([(r as any).csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'user_audit.csv'; a.click(); URL.revokeObjectURL(url);
            } else { toast({ title: 'Export failed', variant: 'destructive' }); }
          }}>Export CSV</Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>By</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {audits.map(a => (
            <TableRow key={a.id}>
              <TableCell className="text-xs">
            {(() => {
              const date = new Date(a.timestamp);
              const isValid = !isNaN(date.getTime());
              return isValid ? date.toLocaleString() : 'Invalid time';
            })()}
          </TableCell>
              <TableCell>{a.action}</TableCell>
              <TableCell className="text-xs">{a.userId}</TableCell>
              <TableCell>{a.byName || a.byId}</TableCell>
              <TableCell>{a.newValue || '-'}</TableCell>
              <TableCell>{a.reason || '-'}</TableCell>
              <TableCell>{a.note || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );


}
