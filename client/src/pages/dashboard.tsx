import React from "react";
import { useAuth, Role } from "@/lib/auth";
import { useData } from "@/lib/data";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash, DollarSign, Users, ShoppingBag, Mail, TrendingUp, Newspaper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NewsletterManager from "@/components/admin/NewsletterManager";
import NewsManager from "@/components/admin/NewsManager";
import DragDropMenuManager from "@/components/admin/DragDropMenuManager";
import AnimatedCharts from "@/components/admin/AnimatedCharts";

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
  const { user, isAdmin, isStaff, allUsers, updateUserRole, refreshAllUsers } = useAuth();
  const [, setLocation] = useLocation();
  const { 
    
    orders, updateOrderStatus, news, deleteNews,
    serverHealth, kpis
  } = useData();
  const { toast } = useToast();
  const [opm, setOpm] = React.useState<number>(0); // orders per minute
  const orderTimestampsRef = React.useRef<number[]>([]);
  // News deletion state
  const [confirmDeleteNewsId, setConfirmDeleteNewsId] = React.useState<string | null>(null);
  const [deleteNewsOpen, setDeleteNewsOpen] = React.useState(false);
  const [isDeletingNews, setIsDeletingNews] = React.useState(false);
  const [deleteNewsReason, setDeleteNewsReason] = React.useState<string>('');
  const [deleteNewsNote, setDeleteNewsNote] = React.useState<string>('');

  React.useEffect(() => {
    if (!isAdmin && !isStaff) {
      setLocation("/login");
    }
  }, [isAdmin, isStaff, setLocation]);

  React.useEffect(() => {
    const handleNew = (e: any) => {
      const payload = e.detail;
      toast({ title: 'New Order', description: `Order #${payload.id} for ${payload.total} KSHS` });
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
    window.addEventListener('orders:new', handleNew);
    window.addEventListener('orders:update', handleUpdate);
    window.addEventListener('chat:message', onChat);
    return () => { window.removeEventListener('orders:new', handleNew); window.removeEventListener('orders:update', handleUpdate); window.removeEventListener('chat:message', onChat); };
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

  // Scroll-based font weight animation
  const [scrollY, setScrollY] = React.useState(0);
  React.useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fontWeight = Math.min(900, Math.max(400, 400 + scrollY / 10));

  if (!user || (!isAdmin && !isStaff)) return null;

  return (
    <div className="container mx-auto px-4 py-8 particle-container gradient-mesh">
      <div className="flex justify-between items-center mb-8 liquid-transition">
        <div className="text-reveal-mask">
          <h1 
            className="text-4xl font-heading font-bold text-holographic hover-letter-spacing font-scroll-responsive"
            style={{ '--font-weight': fontWeight } as React.CSSProperties}
          >
            YOU ARE MY WORLD WALI!
          </h1>
          <p className="text-muted-foreground text-lg">Welcome back, {user.name}</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1 border-animated-gradient luminous-glow magnetic">
          {user.role.toUpperCase()}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-2 border-animated-gradient p-1">
          <TabsTrigger value="overview" className="magnetic hover-letter-spacing">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="magnetic hover-letter-spacing">Analytics</TabsTrigger>
          <TabsTrigger value="orders" className="magnetic hover-letter-spacing">Orders</TabsTrigger>
          <TabsTrigger value="menu" className="magnetic hover-letter-spacing">Menu</TabsTrigger>
          <TabsTrigger value="news" className="magnetic hover-letter-spacing"><Newspaper className="h-4 w-4 mr-2" />News</TabsTrigger>
          <TabsTrigger value="newsletter" className="magnetic hover-letter-spacing"><Mail className="h-4 w-4 mr-2" />Newsletter</TabsTrigger>
          {isAdmin && <TabsTrigger value="users" className="magnetic hover-letter-spacing">Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="support" className="magnetic hover-letter-spacing">Support</TabsTrigger>}
          {isAdmin && <TabsTrigger value="user-audit" className="magnetic hover-letter-spacing">Audits</TabsTrigger>}
          {isAdmin && <TabsTrigger value="audit" className="magnetic hover-letter-spacing">Audit</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-primary animate-float" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-gradient">
                  {kpis?.totalRevenue ?? orders.reduce((sum, o) => sum + o.total, 0)} KSHS
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                </div>
              </CardContent>
            </Card>
            <Card className="card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse-glow"></div>
              </CardHeader>
              <CardContent>
                {serverHealth ? (
                  <div>
                    <div className="text-sm">Memory: {(serverHealth.memory.rss / (1024*1024)).toFixed(1)} MB</div>
                    <div className="text-sm">Load: {serverHealth.load[0].toFixed(2)}</div>
                    <div className="text-sm">Uptime: {Math.floor(serverHealth.uptime/60)} mins</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>
            <Card className="card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-primary animate-float" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gradient">
                  {orders.filter(o => o.status !== "Delivered").length}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-coral-500 rounded-full animate-pulse"></div>
                  <p className="text-xs text-muted-foreground">Live updates</p>
                </div>
              </CardContent>
            </Card>
            <Card className="card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-primary animate-float" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gradient">{allUsers.length}</div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">+12% this month</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <AnimatedCharts />
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Manage incoming orders and update their status.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Live Orders KPI */}
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-white/5 rounded p-3">
                  <div className="text-sm text-muted-foreground">Orders / min</div>
                  <div className="text-xl font-bold">{opm}</div>
                </div>
                <div className="bg-white/5 rounded p-3">
                  <div className="text-sm text-muted-foreground">Active Orders</div>
                  <div className="text-xl font-bold">{kpis?.activeOrders ?? orders.filter(o => o.status !== 'Delivered').length}</div>
                </div>
                <div className="bg-white/5 rounded p-3">
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                  <div className="text-xl font-bold">{kpis?.totalRevenue ?? orders.reduce((sum, o) => sum + o.total, 0)} KSHS</div>
                </div>
              </div>
              {/* Live Orders feed */}
              <div className="mb-4">
                <h3 className="text-md font-medium mb-2">Live Orders Feed</h3>
                <div className="space-y-2 max-h-44 overflow-y-auto border rounded p-2">
                  {orders.slice(0, 10).map(o => (
                    <div key={o.id} className="flex justify-between items-center p-2 bg-background/50 rounded">
                      <div>
                          <div className="text-sm font-medium">#{o.id.slice(-6)} — {o.user}</div>
                        <div className="text-xs text-muted-foreground">{o.items.length} items • {o.total} KSHS</div>
                      </div>
                      <div>
                        <Badge variant="outline">{o.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id.slice(-6)}</TableCell>
                      <TableCell>{order.user}</TableCell>
                      <TableCell>{order.items.length} items</TableCell>
                      <TableCell>{order.total} KSHS</TableCell>
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
                          onValueChange={(val: any) => updateOrderStatus(order.id, val)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Preparing">Preparing</SelectItem>
                            <SelectItem value="Ready">Ready</SelectItem>
                            <SelectItem value="Delivered">Delivered</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-8">
                <h3 className="text-xl font-heading font-bold mb-3">News Management</h3>
                {news.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No news posts yet.</div>
                ) : (
                  <div className="space-y-3">
                    {news.map(n => (
                      <div key={n.id} className="flex items-center justify-between gap-4 border p-3 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{n.title}</div>
                          <div className="text-xs text-muted-foreground">Posted {n.date} by {n.author} • {n.views ?? 0} views</div>
                        </div>
                        <div className="flex gap-2">
                          {(isAdmin || isStaff) && (
                            <>
                              <Dialog open={deleteNewsOpen && confirmDeleteNewsId === n.id} onOpenChange={setDeleteNewsOpen}>
                                <DialogTrigger asChild>
                                  <Button variant="destructive" size="sm" onClick={() => { setConfirmDeleteNewsId(n.id); setDeleteNewsOpen(true); setDeleteNewsReason(''); setDeleteNewsNote(''); }}>
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete News</DialogTitle>
                                    <div className="text-sm text-muted-foreground">This will remove the news post from public view. Provide a reason for audit purposes.</div>
                                  </DialogHeader>
                                  <div className="mt-4 space-y-2">
                                    <label className="text-sm block">Reason</label>
                                    <select value={deleteNewsReason} onChange={(e) => setDeleteNewsReason(e.target.value)} className="w-full rounded border px-2 py-1">
                                      <option value="outdated">Outdated</option>
                                      <option value="incorrect">Incorrect information</option>
                                      <option value="policy">Policy violation</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>
                                  <div className="mt-4">
                                    <label className="text-sm block mb-1">Notes (optional)</label>
                                    <Textarea value={deleteNewsNote} onChange={(e) => setDeleteNewsNote(e.target.value)} placeholder="Optional clarification for audit logs" />
                                  </div>
                                  <div className="mt-4 flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => { setDeleteNewsOpen(false); setConfirmDeleteNewsId(null); setDeleteNewsReason(''); setDeleteNewsNote(''); }}>Cancel</Button>
                                    <Button variant="destructive" onClick={async () => {
                                      if (!confirmDeleteNewsId) return;
                                      setIsDeletingNews(true);
                                      const ok = await deleteNews(confirmDeleteNewsId, deleteNewsReason, deleteNewsNote);
                                      setIsDeletingNews(false);
                                      setDeleteNewsOpen(false);
                                      setConfirmDeleteNewsId(null);
                                      setDeleteNewsReason('');
                                      setDeleteNewsNote('');
                                      if (ok) toast({ title: 'Deleted', description: 'News was removed.' });
                                    }} disabled={isDeletingNews}>{isDeletingNews ? 'Deleting…' : 'Delete News'}</Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              {isAdmin && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">Edit Views</Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Edit View Count</DialogTitle>
                                    </DialogHeader>
                                    <EditViewsForm news={n} onDone={async () => { await refreshAllUsers(); /* just refresh admin data after edit, though news refreshed separately */ }} />
                                  </DialogContent>
                                </Dialog>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
        
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Moderation Stream</CardTitle>
              <CardDescription>Real-time moderation actions</CardDescription>
            </CardHeader>
            <CardContent>
              <ModerationStream />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu">
          <DragDropMenuManager />
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
        {isAdmin && (
          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle>Support Chat</CardTitle>
                <CardDescription>Live customer support chat (real-time)</CardDescription>
              </CardHeader>
              <CardContent>
                <SupportPanel />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function SupportPanel() {
  const { getThreads, messages, sendMessage, markThreadAsRead } = useData();
  const threads = getThreads();
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(threads?.[0]?.id ?? null);
  const [messageText, setMessageText] = React.useState('');
  React.useEffect(() => { if (threads.length && !selectedThreadId) setSelectedThreadId(threads[0].id); }, [threads]);
  const currentMessages = selectedThreadId ? messages.filter(m => m.threadId === selectedThreadId) : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1">
        <div className="space-y-2">
          {threads.map(t => (
            <div key={t.id} className={`p-2 rounded cursor-pointer ${selectedThreadId === t.id ? 'bg-accent/10' : 'bg-background/50'}`} onClick={() => { setSelectedThreadId(t.id); markThreadAsRead(t.id, 'admin'); }}>
              <div className="font-medium">{t.userName}</div>
              <div className="text-xs text-muted-foreground">{t.lastMessage?.text || 'No messages yet'}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="md:col-span-2 flex flex-col gap-2">
        <div className="flex-1 overflow-y-auto rounded border p-2 space-y-3">
          {!currentMessages.length && <div className="text-sm text-muted-foreground">No messages</div>}
          {currentMessages.map(m => (
            <div key={m.id} className={`p-2 rounded ${m.senderRole === 'user' ? 'bg-white/5 self-start' : 'bg-accent/20 self-end'}`}>
              <div className="text-xs text-muted-foreground">{m.senderName}</div>
              <div className="text-sm">{m.text}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input value={messageText} onChange={(e) => setMessageText(e.target.value)} className="flex-1 rounded border px-3 py-2" placeholder="Type a message..." />
          <Button onClick={() => { if (!selectedThreadId || !messageText.trim()) return; sendMessage(selectedThreadId, { id: 'admin', name: 'Admin', role: 'admin' }, messageText.trim()); setMessageText(''); }}>Send</Button>
        </div>
      </div>
    </div>
  )
}

function ModerationStream() {
  const [items, setItems] = React.useState<any[]>([]);
  React.useEffect(() => {
    const listener = (e: any) => {
      const payload = e.detail;
      setItems(prev => [payload, ...prev].slice(0, 20));
    };
    window.addEventListener('audit:review', listener);
    window.addEventListener('audit:news', listener);
    window.addEventListener('audit:user', listener);
    return () => {
      window.removeEventListener('audit:review', listener);
      window.removeEventListener('audit:news', listener);
      window.removeEventListener('audit:user', listener);
    };
  }, []);

  if (!items.length) return <div className="text-sm text-muted-foreground">No moderation activity</div>;
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {items.map((i, idx) => (
        <div key={i._id || i.id || idx} className="flex justify-between items-center p-2 rounded bg-background/50">
          <div className="text-sm">
            <div className="font-medium">{i.action} — {i.byName || i.byId || 'system'}</div>
            <div className="text-xs text-muted-foreground">{i.note || i.reason || ''}</div>
          </div>
          <div className="text-xs text-muted-foreground">{new Date(i.timestamp || i.createdAt || Date.now()).toLocaleTimeString()}</div>
        </div>
      ))}
    </div>
  );
}

function ChangePhoneForm({ user, onDone }: { user: any; onDone?: () => void }) {
  const { refreshAllUsers } = useAuth();
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



function EditViewsForm({ news, onDone }: { news: any; onDone?: () => void }) {
  const { updateNewsViews } = useData();
  const [views, setViews] = React.useState(news.views ?? 0);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm block mb-1">Views</label>
        <input type="number" className="w-full rounded border px-2 py-1" value={views} onChange={(e) => setViews(Number(e.target.value))} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onDone && onDone()}>Cancel</Button>
        <Button onClick={async () => {
          setLoading(true);
          const ok = await updateNewsViews(news.id, views);
          setLoading(false);
          if (ok) {
            toast({ title: 'Updated', description: 'View count updated.' });
            if (onDone) onDone();
          } else {
            toast({ title: 'Error', description: 'Could not update view count', variant: 'destructive' });
          }
        }} disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
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
              <TableCell className="text-xs">{new Date(a.timestamp).toLocaleString()}</TableCell>
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
              <TableCell className="text-xs">{new Date(a.timestamp).toLocaleString()}</TableCell>
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
