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
import { BarChart3, Bell, Check, CreditCard, DollarSign, LayoutGrid, Mail, MapPin, MapPinned, MoreHorizontal, Newspaper, Phone, Pin, PinOff, Plus, Search, Settings, ShoppingBag, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NewsletterManager from "@/components/admin/NewsletterManager";
import NewsManager from "@/components/admin/NewsManager";
import DragDropMenuManager from "@/components/admin/DragDropMenuManager";
import AnimatedCharts from "@/components/admin/AnimatedCharts";
import OrderLocationView from "@/components/admin/OrderLocationView";
import BusinessLocationManager from "@/components/admin/BusinessLocationManager";
import POSSystem from "@/components/admin/POSSystem";
import SocialLinksManager from "@/components/admin/SocialLinksManager";
import OverviewDashboard from "@/components/admin/OverviewDashboard";
import HRDashboard from "@/components/admin/HRDashboard";
import AccountingDashboard from "@/components/admin/AccountingDashboard";

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
  const { user, isAdmin, isStaff, isAccountant, allUsers, updateUserRole, refreshAllUsers } = useHybridAuth();
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
  const [kpiRange, setKpiRange] = React.useState<"today" | "7d" | "30d" | "custom">("today");
  const [customStart, setCustomStart] = React.useState<string>("");
  const [customEnd, setCustomEnd] = React.useState<string>("");
  const [_serverHealthUpdatedAt, setServerHealthUpdatedAt] = React.useState<number | null>(null);

  const [posTopSelling, setPosTopSelling] = React.useState<any[]>([]);
  const [_posCategoryTrends, setPosCategoryTrends] = React.useState<any[]>([]);
  const [posTrendsDaily2x, setPosTrendsDaily2x] = React.useState<Record<string, number>>({});

  const [drillOpen, setDrillOpen] = React.useState(false);
  const [drillDateKey, setDrillDateKey] = React.useState<string | null>(null);
  const [drillPosSales, setDrillPosSales] = React.useState<any[]>([]);
  const [drillPosSummary, setDrillPosSummary] = React.useState<any | null>(null);

  const [saleDetailOpen, setSaleDetailOpen] = React.useState(false);
  const [selectedSaleId, setSelectedSaleId] = React.useState<string>("");
  const [selectedSale, setSelectedSale] = React.useState<any | null>(null);

  const rangeDays = React.useMemo(() => {
    if (kpiRange === "today") return 1;
    if (kpiRange === "7d") return 7;
    if (kpiRange === "30d") return 30;
    const s = customStart ? new Date(`${customStart}T00:00:00`) : null;
    const e = customEnd ? new Date(`${customEnd}T00:00:00`) : null;
    if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 7;
    const diffDays = Math.floor((e.getTime() - s.getTime()) / 86_400_000) + 1;
    return Math.min(90, Math.max(1, diffDays));
  }, [kpiRange, customStart, customEnd]);

  const rangeStart = React.useMemo(() => {
    if (kpiRange === "custom" && customStart) {
      const d = new Date(`${customStart}T00:00:00`);
      if (!isNaN(d.getTime())) return d;
    }
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (rangeDays - 1));
    return start;
  }, [kpiRange, customStart, rangeDays]);

  const rangeEnd = React.useMemo(() => {
    if (kpiRange === "custom" && customEnd) {
      const d = new Date(`${customEnd}T23:59:59`);
      if (!isNaN(d.getTime())) return d;
    }
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [kpiRange, customEnd]);

  const [commandOpen, setCommandOpen] = React.useState(false);
  const [commandQuery, setCommandQuery] = React.useState("");

  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [notificationReadIds, setNotificationReadIds] = React.useState<Set<string>>(() => new Set());

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

  type ActivityItem = { id: string; ts: number; label: string; meta?: string; tone?: "info" | "success" | "warning"; tab?: string; orderId?: string };
  const [activity, setActivity] = React.useState<ActivityItem[]>([]);

  const unreadCount = React.useMemo(() => {
    return activity.filter((a) => !notificationReadIds.has(a.id)).length;
  }, [activity, notificationReadIds]);

  React.useEffect(() => {
    setNotificationReadIds((prev) => {
      if (prev.size === 0) return prev;
      const current = new Set(activity.map((a) => a.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (current.has(id)) next.add(id);
      });
      return next;
    });
  }, [activity]);

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

    if (!user) return;
    loadPins();
  }, [user]);

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

  React.useEffect(() => {
    if (!drillOpen || !drillDateKey) return;

    const load = async () => {
      try {
        const res = await apiFetch(`/api/pos/reports/daily?date=${encodeURIComponent(drillDateKey)}`);
        if (!res.ok) {
          setDrillPosSales([]);
          setDrillPosSummary(null);
          return;
        }
        const data = await res.json();
        setDrillPosSales(Array.isArray(data?.sales) ? data.sales : []);
        setDrillPosSummary(data?.summary || null);
      } catch {
        setDrillPosSales([]);
        setDrillPosSummary(null);
      }
    };

    load();
  }, [drillOpen, drillDateKey]);

  React.useEffect(() => {
    if (!saleDetailOpen || !selectedSaleId) return;

    const load = async () => {
      try {
        const res = await apiFetch(`/api/pos/sales/${encodeURIComponent(selectedSaleId)}`);
        if (!res.ok) {
          setSelectedSale(null);
          return;
        }
        const data = await res.json();
        setSelectedSale(data);
      } catch {
        setSelectedSale(null);
      }
    };

    load();
  }, [saleDetailOpen, selectedSaleId]);

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

  const toLocalDateKey = React.useCallback((value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

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

    if (!user) return;
    loadPosDailyRevenue();
  }, [user, rangeDays]);

  React.useEffect(() => {
    const loadPosOverviewAnalytics = async () => {
      try {
        const days2x = Math.min(180, Math.max(2, rangeDays * 2));
        const categoryDays = Math.max(30, rangeDays);
        const [invRes, trendsRes, trends2xRes] = await Promise.all([
          apiFetch('/api/pos/reports/inventory'),
          apiFetch(`/api/pos/reports/trends?days=${categoryDays}`),
          apiFetch(`/api/pos/reports/trends?days=${days2x}`),
        ]);

        if (invRes.ok) {
          const inv = await invRes.json();
          const topSelling = Array.isArray(inv?.topSelling) ? inv.topSelling : [];
          setPosTopSelling(topSelling);
        } else {
          setPosTopSelling([]);
        }

        if (trendsRes.ok) {
          const d = await trendsRes.json();
          setPosCategoryTrends(Array.isArray(d?.categoryTrends) ? d.categoryTrends : []);
        } else {
          setPosCategoryTrends([]);
        }

        if (trends2xRes.ok) {
          const d2 = await trends2xRes.json();
          const daily = Array.isArray(d2?.dailySales) ? d2.dailySales : [];
          const next: Record<string, number> = {};
          daily.forEach((x: any) => {
            const key = String(x?._id || '').slice(0, 10);
            if (!key) return;
            next[key] = (next[key] || 0) + (Number(x?.total) || 0);
          });
          setPosTrendsDaily2x(next);
        } else {
          setPosTrendsDaily2x({});
        }
      } catch {
        setPosTopSelling([]);
        setPosCategoryTrends([]);
        setPosTrendsDaily2x({});
      }
    };

    if (!user) return;
    loadPosOverviewAnalytics();
    const interval = setInterval(loadPosOverviewAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, rangeDays]);

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
    const add = (label: string, meta?: string, tone: ActivityItem["tone"] = "info", nextTab?: string, orderId?: string) => {
      setActivity((prev) => {
        const next: ActivityItem[] = [{ id: `${Date.now()}-${Math.random()}`, ts: Date.now(), label, meta, tone, tab: nextTab, orderId }, ...prev];
        return next.slice(0, 20);
      });
    };

    const onOrderNew = (e: any) => {
      const p = e.detail;
      add(`New order #${p?.id}`, p?.total ? formatPriceKSHS(p.total) : undefined, "success", "orders", p?.id ? String(p.id) : undefined);
    };
    const onOrderUpdate = (e: any) => {
      const p = e.detail;
      add(`Order #${p?.id} updated`, p?.status ? `Status: ${p.status}` : undefined, "info", "orders", p?.id ? String(p.id) : undefined);
    };
    const onPosSale = (e: any) => {
      const p = e.detail;
      add("POS sale completed", p?.total ? formatPriceKSHS(p.total) : undefined, "success", "pos");
    };
    const onAuditReview = (e: any) => {
      const p = e.detail;
      add("Review audit", p?.action ? `Action: ${p.action}` : undefined, "warning", "audit");
    };
    const onAuditNews = (e: any) => {
      const p = e.detail;
      add("News audit", p?.action ? `Action: ${p.action}` : undefined, "info", "news");
    };
    const onAuditUser = (e: any) => {
      const p = e.detail;
      add("User audit", p?.action ? `Action: ${p.action}` : undefined, "info", "user-audit");
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

  const rangeOrderRevenue = React.useMemo(() => {
    const startMs = rangeStart.getTime();
    const endMs = rangeEnd.getTime();
    return (orders || [])
      .filter((o) => o.status !== "Cancelled")
      .filter((o) => {
        const d = new Date(o.date);
        if (isNaN(d.getTime())) return false;
        const ms = d.getTime();
        return ms >= startMs && ms <= endMs;
      })
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders, rangeStart, rangeEnd]);

  const rangePosRevenue = React.useMemo(() => {
    const startKey = rangeStart.toISOString().slice(0, 10);
    const endKey = rangeEnd.toISOString().slice(0, 10);
    return Object.entries(posDailyRevenue)
      .filter(([k]) => k >= startKey && k <= endKey)
      .reduce((sum, [, v]) => sum + (Number(v) || 0), 0);
  }, [posDailyRevenue, rangeStart, rangeEnd]);

  const currentRangeRevenue = React.useMemo(() => {
    if (kpiRange === "today") return todayOrderRevenue + posTodayRevenue;
    return rangeOrderRevenue + rangePosRevenue;
  }, [kpiRange, todayOrderRevenue, posTodayRevenue, rangeOrderRevenue, rangePosRevenue]);

  const previousRangeRevenue = React.useMemo(() => {
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    start.setDate(start.getDate() - rangeDays);
    end.setDate(end.getDate() - rangeDays);
    const startMs = start.getTime();
    const endMs = end.getTime();

    const prevOrders = (orders || [])
      .filter((o) => o.status !== "Cancelled")
      .filter((o) => {
        const d = new Date(o.date);
        if (isNaN(d.getTime())) return false;
        const ms = d.getTime();
        return ms >= startMs && ms <= endMs;
      })
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const startKey = start.toISOString().slice(0, 10);
    const endKey = end.toISOString().slice(0, 10);
    const prevPos = Object.entries(posTrendsDaily2x)
      .filter(([k]) => k >= startKey && k <= endKey)
      .reduce((sum, [, v]) => sum + (Number(v) || 0), 0);

    return prevOrders + prevPos;
  }, [orders, rangeStart, rangeEnd, rangeDays, posTrendsDaily2x]);

  const revenueDeltaPct = React.useMemo(() => {
    if (!Number.isFinite(currentRangeRevenue) || !Number.isFinite(previousRangeRevenue)) return 0;
    if (previousRangeRevenue === 0) return currentRangeRevenue > 0 ? 100 : 0;
    return ((currentRangeRevenue - previousRangeRevenue) / previousRangeRevenue) * 100;
  }, [currentRangeRevenue, previousRangeRevenue]);

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

    if (!user) return; // Wait for auth before fetching
    fetchPOSRevenue();
    
    // Refresh POS revenue every 5 minutes to ensure current data
    const interval = setInterval(fetchPOSRevenue, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

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
                Add Product
              </CommandItem>
            )}
            {(isAdmin || isStaff) && (
              <CommandItem onSelect={() => { setActiveTab("orders"); setCommandOpen(false); toast({ title: "Tip", description: "Use Orders tab to create a new order." }); }}>
                <Plus className="h-4 w-4" />
                Create Order
              </CommandItem>
            )}
            {isAdmin && (
              <CommandItem onSelect={() => { setActiveTab("hr"); setCommandOpen(false); toast({ title: "Tip", description: "Use HR tab to manage payroll and payslips." }); }}>
                <CreditCard className="h-4 w-4" />
                Pay Supplier
              </CommandItem>
            )}
            <CommandItem onSelect={() => { setActiveTab("orders"); setCommandOpen(false); }}>
              <Search className="h-4 w-4" />
              View today's orders
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

      <Dialog open={drillOpen} onOpenChange={(open) => { setDrillOpen(open); if (!open) { setDrillDateKey(null); setDrillPosSales([]); setDrillPosSummary(null); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {drillDateKey ? `Details for ${drillDateKey}` : "Details"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Online orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const list = (orders || []).filter((o) => {
                      if (o.status === "Cancelled") return false;
                      const d = new Date(o.date);
                      if (isNaN(d.getTime())) return false;
                      return d.toISOString().slice(0, 10) === drillDateKey;
                    });
                    if (list.length === 0) return <div className="text-sm text-muted-foreground">No online orders.</div>;
                    return (
                      <div className="space-y-2">
                        {list.slice(0, 10).map((o) => (
                          <button
                            key={o.id}
                            className="w-full text-left rounded-md border px-3 py-2 hover:bg-muted/30"
                            onClick={() => {
                              setSelectedOrder(o);
                              setOrderDetailOpen(true);
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium truncate">Order #{o.id}</div>
                              <div className="text-sm font-mono text-muted-foreground">{formatPriceKSHS(o.total || 0)}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">{o.user}</div>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">POS sales</CardTitle>
                </CardHeader>
                <CardContent>
                  {drillPosSummary ? (
                    <div className="text-xs text-muted-foreground mb-3">
                      Total: <span className="font-mono">{formatPriceKSHS(drillPosSummary?.totalSales || 0)}</span>
                      <span className="ml-3">Count: <span className="font-mono">{drillPosSummary?.count || 0}</span></span>
                    </div>
                  ) : null}

                  {drillPosSales.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No POS sales.</div>
                  ) : (
                    <div className="space-y-2">
                      {drillPosSales.slice(0, 10).map((s: any) => (
                        <button
                          key={s?._id || s?.id || Math.random()}
                          className="w-full text-left rounded-md border px-3 py-2 hover:bg-muted/30"
                          onClick={() => {
                            const id = String(s?._id || "");
                            if (!id) return;
                            setSelectedSaleId(id);
                            setSaleDetailOpen(true);
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium truncate">Sale {String(s?._id || "").slice(-6)}</div>
                            <div className="text-sm font-mono text-muted-foreground">{formatPriceKSHS(s?.total || 0)}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{new Date(s?.createdAt || Date.now()).toLocaleTimeString()}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={saleDetailOpen}
        onOpenChange={(open) => {
          setSaleDetailOpen(open);
          if (!open) {
            setSelectedSaleId("");
            setSelectedSale(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSaleId ? `Sale ${selectedSaleId.slice(-6)}` : "Sale"}
            </DialogTitle>
          </DialogHeader>

          {!selectedSale ? (
            <div className="text-sm text-muted-foreground">Loading sale…</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="text-sm"><span className="text-muted-foreground">Total:</span> {formatPriceKSHS(selectedSale.total || 0)}</div>
                <div className="text-sm"><span className="text-muted-foreground">Status:</span> {selectedSale.status || "—"}</div>
                <div className="text-sm"><span className="text-muted-foreground">Payment:</span> {selectedSale.paymentMethod || "—"}</div>
                <div className="text-sm"><span className="text-muted-foreground">Created:</span> {selectedSale.createdAt ? new Date(selectedSale.createdAt).toLocaleString() : "—"}</div>
              </div>

              {Array.isArray(selectedSale.items) && selectedSale.items.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 border-b bg-muted/30 text-sm font-medium">Items</div>
                  <div className="divide-y">
                    {selectedSale.items.slice(0, 20).map((it: any, idx: number) => (
                      <div key={idx} className="px-4 py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{it?.name || "Item"}</div>
                          <div className="text-xs text-muted-foreground">Qty: {it?.quantity ?? "—"}</div>
                        </div>
                        <div className="text-sm font-mono text-muted-foreground">{typeof it?.price === 'number' ? formatPriceKSHS(it.price) : ""}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No items.</div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab("pos");
                    setSaleDetailOpen(false);
                  }}
                >
                  Open POS
                </Button>
              </div>
            </div>
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
                    Range: {formatPriceKSHS(currentRangeRevenue)}
                    <span className={revenueDeltaPct >= 0 ? "text-green-600" : "text-red-600"}>
                      ({revenueDeltaPct >= 0 ? "+" : ""}{revenueDeltaPct.toFixed(1)}%)
                    </span>
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
                        onClick={() => {
                          setNotificationReadIds(new Set(activity.map((a) => a.id)));
                        }}
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
                          <div
                            key={a.id}
                            className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/30"
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setNotificationReadIds((prev) => {
                                const next = new Set(prev);
                                next.add(a.id);
                                return next;
                              });
                              setNotificationsOpen(false);

                              if (a.tab) setActiveTab(a.tab);
                              if (a.tab === "orders" && a.orderId) {
                                const o = (orders || []).find((x: any) => String(x.id) === String(a.orderId));
                                if (o) {
                                  setSelectedOrder(o);
                                  setOrderDetailOpen(true);
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setNotificationReadIds((prev) => {
                                  const next = new Set(prev);
                                  next.add(a.id);
                                  return next;
                                });
                                setNotificationsOpen(false);

                                if (a.tab) setActiveTab(a.tab);
                                if (a.tab === "orders" && a.orderId) {
                                  const o = (orders || []).find((x: any) => String(x.id) === String(a.orderId));
                                  if (o) {
                                    setSelectedOrder(o);
                                    setOrderDetailOpen(true);
                                  }
                                }
                              }
                            }}
                          >
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
        <div className="sticky top-16 z-20 -mx-4 px-4 py-4 bg-background/95 backdrop-blur-xl border-b shadow-sm supports-backdrop-filter:bg-background/80">
          <div className="flex items-center gap-3">
            <TabsList className="flex-1 flex gap-2 bg-transparent p-0 h-auto">
              {[
                { value: "overview", icon: LayoutGrid, label: "Overview" },
                { value: "analytics", icon: BarChart3, label: "Analytics" },
                { value: "orders", icon: ShoppingBag, label: "Orders" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 min-w-20 max-w-[180px] data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent hover:border-border/60 hover:bg-muted/40 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 h-auto"
                >
                  <span className="inline-flex items-center justify-center gap-2 w-full">
                    <tab.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="group flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium border bg-linear-to-br from-background to-muted shadow-sm hover:shadow-md hover:from-muted hover:to-muted/80 transition-all duration-200 snap-start shrink-0"
                  aria-label="More navigation links"
                >
                  <div className="relative">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                  </div>
                  <span className="hidden sm:inline text-muted-foreground group-hover:text-foreground transition-colors">Links</span>
                  <svg className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl border bg-popover">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Navigation</div>
                <DropdownMenuItem onSelect={() => setActiveTab("pos")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors">
                  <div className="p-1.5 rounded-md bg-green-500/10 text-green-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <span className="font-medium">POS</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActiveTab("menu")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors">
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Menu</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActiveTab("location")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors">
                  <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-600">
                    <MapPinned className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Location</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActiveTab("news")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors">
                  <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600">
                    <Newspaper className="h-4 w-4" />
                  </div>
                  <span className="font-medium">News</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActiveTab("newsletter")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors">
                  <div className="p-1.5 rounded-md bg-pink-500/10 text-pink-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Newsletter</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActiveTab("settings")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors">
                  <div className="p-1.5 rounded-md bg-gray-500/10 text-gray-600">
                    <Settings className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActiveTab("hr")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors">
                  <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="font-medium">HR</span>
                </DropdownMenuItem>
                {(isAdmin || isAccountant) && (
                  <DropdownMenuItem onSelect={() => setActiveTab("accounting")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors">
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Accounting</span>
                    {(isAdmin || isAccountant) && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">PRO</span>}
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <>
                    <div className="h-px bg-border my-1.5" />
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Only</div>
                    <DropdownMenuItem onSelect={() => setActiveTab("audit")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors">
                      <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
                        <LayoutGrid className="h-4 w-4" />
                      </div>
                      <span className="font-medium">Audit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setActiveTab("user-audit")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors">
                      <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-600">
                        <Users className="h-4 w-4" />
                      </div>
                      <span className="font-medium">User Audit</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <TabsContent value="overview">
          <OverviewDashboard
            orders={orders}
            menu={menu}
            allUsers={allUsers}
            activity={activity}
            kpis={kpis}
            serverHealth={serverHealth}
            todayOrderRevenue={todayOrderRevenue}
            posTodayRevenue={posTodayRevenue}
            posTodayCount={posTodayCount}
            posTotalRevenue={posTotalRevenue}
            currentRangeRevenue={currentRangeRevenue}
            revenueDeltaPct={revenueDeltaPct}
            posDailyRevenue={posDailyRevenue}
            posTopSelling={posTopSelling}
            rangeDays={rangeDays}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            kpiRange={kpiRange}
            setKpiRange={setKpiRange}
            customStart={customStart}
            customEnd={customEnd}
            setCustomStart={setCustomStart}
            setCustomEnd={setCustomEnd}
            setActiveTab={setActiveTab}
            onOrderClick={(order) => {
              setSelectedOrder(order);
              setOrderDetailOpen(true);
            }}
            onDrillDate={(dateKey) => {
              setDrillDateKey(dateKey);
              setDrillOpen(true);
            }}
            isTodayLocal={isTodayLocal}
            toLocalDateKey={toLocalDateKey}
          />
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
        <TabsContent value="hr">
          <HRDashboard />
        </TabsContent>
        {(isAdmin || isAccountant) && (
          <TabsContent value="accounting">
            <AccountingDashboard />
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
