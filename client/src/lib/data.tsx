import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { io } from "socket.io-client";
import { apiFetch } from "./api";
import nyamaImage from "@assets/generated_images/nyama_choma_with_kachumbari.png";
import ugaliImage from "@assets/generated_images/ugali_and_sukuma_wiki.png";
import chapatiImage from "@assets/generated_images/chapati_and_madondo.png";
import samosaImage from "@assets/generated_images/crispy_samosas.png";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // in KSHS
  category: "Main" | "Starter" | "Drinks" | "Dessert";
  images?: string[];
  image?: string;
  available: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  image?: string;
  views?: number;
}

export interface Review {
  id: string;
  productId: string;
  userId?: string; // optional for mock data
  user: string; // display name
  rating: number;
  comment: string;
  date: string;
  deletedReason?: string;
  deletedNote?: string;
}

export interface Order {
  id: string;
  items: { item: MenuItem; quantity: number }[];
  total: number;
  status: "Pending" | "Preparing" | "Ready" | "Delivered";
  user: string;
  date: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

// Chat Interfaces
export interface ChatMessage {
  id: string;
  threadId: string; // Usually userId
  senderId: string;
  senderName: string;
  senderRole: "admin" | "staff" | "user";
  text: string;
  timestamp: string;
  isRead: boolean;
  encrypted: boolean; // UI flag for E2EE simulation
}

export interface ChatThread {
  id: string; // userId
  userName: string;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  typing: boolean; // Is the OTHER party typing?
}

interface DataContextType {
  menu: MenuItem[];
  addMenuItem: (item: MenuItem) => Promise<MenuItem | void>;
  deleteMenuItem: (id: string) => void;
  updateMenuItem: (item: MenuItem) => Promise<void>;

  news: NewsItem[];
  getNewsById: (id: string) => Promise<NewsItem | null>;
  updateNewsViews: (id: string, views: number) => Promise<boolean>;
  addNews: (news: NewsItem) => Promise<NewsItem | void>;
  deleteNews: (newsId: string, reason?: string, note?: string) => Promise<boolean>;

  reviews: Review[];
  getReviewsForProduct: (productId: string) => Review[];
  addReviewForProduct: (productId: string, review: Omit<Review, "id" | "productId" | "date" | "userId"> & { userId?: string }) => Promise<Review>;
  removeReview: (reviewId: string, reason?: string, note?: string) => Promise<boolean>;

  orders: Order[];
  placeOrder: (items: { item: MenuItem; quantity: number }[]) => void;
  updateOrderStatus: (id: string, status: Order["status"]) => void;

  staff: Staff[];
  addStaff: (staff: Staff) => void;
  removeStaff: (id: string) => void;

  // Chat Methods
  messages: ChatMessage[];
  sendMessage: (threadId: string, sender: { id: string, name: string, role: "admin" | "staff" | "user" }, text: string) => void;
  markThreadAsRead: (threadId: string, readerRole: "admin" | "staff" | "user") => void;
  setTypingStatus: (threadId: string, isTyping: boolean) => void;
  getThreads: () => ChatThread[];
  // Review audit methods (admin)
  fetchReviewAudits: (opts?: { action?: string; byName?: string; reviewId?: string; start?: string; end?: string; page?: number; pageSize?: number; exportCsv?: boolean; sort?: 'asc' | 'desc'; exportAll?: boolean }) => Promise<{ audits: any[]; total?: number; page?: number; pageSize?: number; csv?: string }>;
  restoreReview: (reviewId: string) => Promise<boolean>;
  serverHealth?: any | null;
  kpis?: any;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_MENU: MenuItem[] = [
  {
    id: "1",
    name: "Nyama Choma Platter",
    description: "Succulent roasted goat meat served with Kachumbari and Ugali.",
    price: 1500,
    category: "Main",
    image: nyamaImage,
    available: true,
  },
  {
    id: "2",
    name: "Ugali & Sukuma Wiki",
    description: "Classic Kenyan staple. Cornmeal cake with sautéed collard greens.",
    price: 400,
    category: "Main",
    image: ugaliImage,
    available: true,
  },
  {
    id: "3",
    name: "Chapati & Madondo",
    description: "Soft layered flatbread served with a rich red bean stew.",
    price: 350,
    category: "Main",
    image: chapatiImage,
    available: true,
  },
  {
    id: "4",
    name: "Beef Samosas (Pair)",
    description: "Crispy pastry filled with spiced minced beef.",
    price: 150,
    category: "Starter",
    image: samosaImage,
    available: true,
  },
];

const INITIAL_NEWS: NewsItem[] = [
  {
    id: "1",
    title: "Grand Opening in Nairobi!",
    content: "We are thrilled to announce our newest location in Westlands. Come visit us for exclusive opening offers.",
    date: "2024-05-20",
    author: "Admin",
  },
  {
    id: "2",
    title: "New Menu Items",
    content: "Introducing our new Swahili Seafood Platter available every Friday.",
    date: "2024-06-01",
    author: "Chef Kamau",
  }
];

const INITIAL_REVIEWS: Review[] = [
  { id: "1", productId: "1", user: "Wanjiku M.", rating: 5, comment: "Best Nyama Choma in town! The vibe is immaculate.", date: "2024-06-10" },
  { id: "2", productId: "1", user: "Brian O.", rating: 4, comment: "Great food, service was a bit slow but worth the wait.", date: "2024-06-12" },
  { id: "3", productId: "2", user: "Grace K.", rating: 4, comment: "Delicious and filling.", date: "2024-06-20" },
];

const INITIAL_STAFF: Staff[] = [
  { id: "1", name: "Juma", role: "Head Chef" },
  { id: "2", name: "Achieng", role: "Manager" },
];

// Mock initial chat data
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    threadId: "3", // User John Doe
    senderId: "3",
    senderName: "John Doe",
    senderRole: "user",
    text: "Hello, do you have any vegan options for the Nyama Choma?",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    isRead: false,
    encrypted: true,
  },
  {
    id: "msg-2",
    threadId: "3",
    senderId: "2",
    senderName: "Manager Jane",
    senderRole: "staff",
    text: "Hi John! While Nyama Choma is meat-based, we can prepare a grilled vegetable platter with the same spices. Would you like that?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isRead: true,
    encrypted: true,
  }
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);
  const [news, setNews] = useState<NewsItem[]>(INITIAL_NEWS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<Staff[]>(INITIAL_STAFF);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [typingStatus, setTypingStatusState] = useState<Record<string, boolean>>({});
  const [serverHealth, setServerHealth] = useState<any | null>(null);
  const [kpis, setKpis] = useState<any>({ totalRevenue: 0, activeOrders: 0, ordersPerMinute: 0 });

  // Load from local storage to persist across refreshes (mock DB)
  useEffect(() => {
    const storedMsgs = localStorage.getItem("kenyan_bistro_messages");
    if (storedMsgs) {
      setMessages(JSON.parse(storedMsgs));
    }
    const storedReviews = localStorage.getItem("kenyan_bistro_reviews");
    if (storedReviews) {
      setReviews(JSON.parse(storedReviews));
    }
    const storedNews = localStorage.getItem("kenyan_bistro_news");
    if (storedNews) {
      setNews(JSON.parse(storedNews));
    }
    const storedMenu = localStorage.getItem("kenyan_bistro_menu");
    if (storedMenu) {
      setMenu(JSON.parse(storedMenu));
    }
    // Try to fetch server-side menu/news if available and override local mock data
    (async () => {
      try {
        const resMenu = await apiFetch('/api/menu');
        if (resMenu.ok) {
          const d = await resMenu.json();
          if (Array.isArray(d.menu)) setMenu(d.menu.map((m: any) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            price: m.price,
            category: m.category,
            images: m.images || [],  // ✅ Fixed: use images array
            image: m.images?.[0] || '', // ✅ Backward compatibility
            available: m.available,
          })));
        }
      } catch (err) {
        // ignore if server not available
      }

      try {
        const resNews = await apiFetch('/api/news');
        if (resNews.ok) {
          const d = await resNews.json();
          if (Array.isArray(d.news)) setNews(d.news);
        }
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  // Socket.IO client for real-time updates
  useEffect(() => {
    let socket: ReturnType<typeof io> | null = null;
    try {
      const apiOrigin = (import.meta as any)?.env?.VITE_API_URL || '';
      socket = io(apiOrigin || window.location.origin, { path: '/socket.io' });
      socket.on('connect', () => console.debug('socket connected', socket!.id));
      socket.on('orders:new', (payload: any) => {
        setOrders(prev => [{ id: payload.id, items: payload.items.map((it: any) => ({ item: { id: it.productId || Date.now().toString(), name: it.name, description: '', price: it.price, category: 'Main', image: '', available: true }, quantity: it.quantity })), total: payload.total, status: payload.status, user: payload.user || 'Unknown', date: payload.createdAt }, ...prev]);
        try { window.dispatchEvent(new CustomEvent('orders:new', { detail: payload })); } catch (e) { }
      });
      socket.on('orders:update', (payload: any) => {
        setOrders(prev => prev.map(o => o.id === payload.id ? ({ ...o, status: payload.status, eta: payload.eta }) : o));
        try { window.dispatchEvent(new CustomEvent('orders:update', { detail: payload })); } catch (e) { }
      });
      socket.on('chat:message', (payload: any) => {
        setMessages(prev => [...prev, { id: payload.message.id, threadId: payload.message.threadId, senderId: payload.message.senderId, senderName: payload.message.senderName, senderRole: payload.message.senderRole, text: payload.message.text, timestamp: payload.message.timestamp, isRead: false, encrypted: payload.message.encrypted }]);
        try { window.dispatchEvent(new CustomEvent('chat:message', { detail: payload })); } catch (e) { }
      });
      socket.on('audit:review', (payload: any) => { try { window.dispatchEvent(new CustomEvent('audit:review', { detail: payload })); } catch (e) { } });
      socket.on('audit:news', (payload: any) => { try { window.dispatchEvent(new CustomEvent('audit:news', { detail: payload })); } catch (e) { } });
      socket.on('audit:user', (payload: any) => { try { window.dispatchEvent(new CustomEvent('audit:user', { detail: payload })); } catch (e) { } });
      socket.on('server:health', (payload: any) => { try { setServerHealth(payload); window.dispatchEvent(new CustomEvent('server:health', { detail: payload })); } catch (e) { } });
      socket.on('kpi:update', (payload: any) => { try { setKpis(payload); window.dispatchEvent(new CustomEvent('kpi:update', { detail: payload })); } catch (e) { } });
    } catch (err) { console.warn('Socket init failed', err); }

    return () => { try { socket?.disconnect(); } catch (e) { } };
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem("kenyan_bistro_messages", JSON.stringify(messages));
  }, [messages]);

  // Persist reviews locally so they survive page reloads in this mock app
  useEffect(() => {
    localStorage.setItem("kenyan_bistro_reviews", JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem("kenyan_bistro_menu", JSON.stringify(menu));
  }, [menu]);

  // Persist news to localStorage
  useEffect(() => {
    localStorage.setItem("kenyan_bistro_news", JSON.stringify(news));
  }, [news]);

  const addMenuItem = async (item: MenuItem) => {
    // Optimistic update locally
    setMenu(prev => [...prev, item]);

    // Try to persist server-side so other clients can see the product
    try {
      const resp = await apiFetch('/api/menu', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          images: item.images || [],
          available: item.available
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const p = data.product;
        // replace temporary item with server item id (optional)
        setMenu(prev => prev.map(i => i.id === item.id ? ({ ...i, id: p.id, images: p.images || i.images }) : i));
        return p;
      }
    } catch (err) {
      console.debug('Could not persist menu item to server, saved locally', err);
    }

    // fallback - remain local-only
    return item;
  };
  const deleteMenuItem = async (id: string) => {
  // Try server delete first
  try {
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      const resp = await fetch(`/api/menu/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (resp.ok) {
        setMenu(prev => prev.filter(i => i.id !== id));
        return;
      }
    }
  } catch (err) {
    console.debug('Server menu delete failed, falling back to local', err);
  }
  
  // Fallback: local-only delete
  setMenu(prev => prev.filter(i => i.id !== id));
};
  const updateMenuItem = async (item: MenuItem) => {
    // Update locally first for immediate UI update
    setMenu(prev => prev.map(i => i.id === item.id ? item : i));

    // Try to persist server-side
    try {
      const resp = await fetch(`/api/menu/${item.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          images: item.images,
          available: item.available
        }),
      });

      if (!resp.ok) {
        // If server update fails, revert the change
        setMenu(prev => {
          const originalItem = prev.find(i => i.id === item.id);
          return originalItem ? prev.map(i => i.id === item.id ? originalItem : i) : prev;
        });
        throw new Error('Failed to update item');
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      // Keep local changes even if server fails
    }
  };

  const deleteNews = async (newsId: string, reason?: string, note?: string) => {
    try {
      if (!/^[0-9a-fA-F]{24}$/.test(newsId)) {
        // local-only delete
        setNews(prev => prev.filter(n => n.id !== newsId));
        return true;
      }
      const resp = await fetch(`/api/news/${newsId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, note }),
      });
      if (resp.ok) {
        setNews(prev => prev.filter(n => n.id !== newsId));
        return true;
      }
    } catch (err) {
      console.debug('Server news delete failed, falling back to local', err);
    }

    // fallback: local-only
    setNews(prev => prev.filter(n => n.id !== newsId));
    return true;
  };

  const addNews = async (item: NewsItem) => {
    // Optimistic local add
    setNews(prev => [item, ...prev]);

    try {
      const resp = await apiFetch('/api/news', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (resp.ok) {
        const data = await resp.json();
        const n = data.news;
        // replace temporary news id and image if server produced a canonical id
        setNews(prev => prev.map(i => i.id === item.id ? ({ ...i, id: n.id, image: n.image || i.image }) : i));
        return n;
      }
    } catch (err) {
      console.debug('Could not persist news to server, saved locally', err);
    }

    return item;
  };

  const getNewsById = async (id: string) => {
    // Try local cache first
    const local = news.find(n => n.id === id);
    if (local) return local;
    // If not available, fetch from server
    try {
      // Avoid fetching invalid ids (which would cause server-type errors)
      if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
      const resp = await fetch(`/api/news/${id}`, {
        credentials: 'include',
      });
      if (resp.ok) {
        const d = await resp.json();
        return d.news as NewsItem;
      }
    } catch (err) {
      console.debug('Could not fetch news by id', err);
    }
    return null;
  };

  const updateNewsViews = async (id: string, views: number) => {
    try {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) return false;
      const resp = await fetch(`/api/news/${id}/views`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ views }),
      });
      if (resp.ok) {
        // refresh local news
        const updated = await resp.json();
        setNews(prev => prev.map(n => n.id === id ? ({ ...n, views: updated.views }) : n));
        return true;
      }
    } catch (err) {
      console.debug('Could not update news views', err);
    }
    return false;
  };

  const getReviewsForProduct = (productId: string) => reviews.filter(r => r.productId === productId);

  const addReviewForProduct = async (productId: string, review: Omit<Review, "id" | "productId" | "date" | "userId"> & { userId?: string }) => {
    // Try to persist to server first (if available). If it fails, fall back to local-only storage.
    try {
      const resp = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: review.rating, comment: review.comment }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const r = data.review;
        const serverReview: Review = {
          id: r.id,
          productId: r.productId,
          userId: r.userId,
          user: r.userName,
          rating: r.rating,
          comment: r.comment,
          date: r.timestamp,
        };
        setReviews(prev => [serverReview, ...prev]);
        return serverReview;
      }
    } catch (err) {
      console.debug("Server review submit failed, falling back to local-only storage", err);
    }

    // Fallback: local-only
    const newReview: Review = {
      id: Date.now().toString(),
      productId,
      userId: review.userId,
      user: review.user,
      rating: review.rating,
      comment: review.comment,
      date: new Date().toISOString(),
    };
    setReviews(prev => [newReview, ...prev]);
    return newReview;
  };

  const fetchReviewAudits = async (opts: any = {}) => {
    try {
      const params = new URLSearchParams();
      if (opts.action) params.set('action', opts.action);
      if (opts.byName) params.set('byName', opts.byName);
      if (opts.reviewId) params.set('reviewId', opts.reviewId);
      if (opts.start) params.set('start', opts.start);
      if (opts.end) params.set('end', opts.end);
      if (opts.page) params.set('page', String(opts.page));
      if (opts.pageSize) params.set('pageSize', String(opts.pageSize));
      if (opts.exportCsv) params.set('export', 'csv');
      if (opts.sort) params.set('sort', opts.sort);
      if (opts.exportAll) params.set('exportAll', 'true');

      const url = `/api/reviews/audit?${params.toString()}`;
      const resp = await fetch(url, { credentials: 'include' });
      if (resp.ok) {
        const contentType = resp.headers.get('content-type') || '';
        if (opts.exportCsv || contentType.includes('text/csv')) {
          // we return raw CSV in audits for export convenience
          const text = await resp.text();
          return { audits: [], total: 0, page: 1, pageSize: 0, csv: text } as any;
        }
        const d = await resp.json();
        return { audits: d.audits || [], total: d.total, page: d.page, pageSize: d.pageSize };
      }
    } catch (err) {
      console.debug('Could not fetch review audits', err);
    }
    return { audits: [], total: 0, page: 1, pageSize: 0 };
  };

  const restoreReview = async (reviewId: string) => {
    try {
      const resp = await apiFetch(`/api/reviews/${reviewId}/restore`, { method: 'POST' });
      if (resp.ok) {
        const d = await resp.json();
        if (d.review) {
          const r: Review = {
            id: d.review.id,
            productId: d.review.productId,
            userId: d.review.userId,
            user: d.review.userName,
            rating: d.review.rating,
            comment: d.review.comment,
            date: d.review.timestamp,
          };
          // inject restored review into local state if not present
          setReviews(prev => [r, ...prev.filter(x => x.id !== r.id)]);
          return true;
        }
      }
    } catch (err) {
      console.debug('Restore review failed', err);
    }
    return false;
  };

  const removeReview = async (reviewId: string, reason?: string, note?: string) => {
    // attempt server deletion first (send reason / note to server as JSON body)
    try {
      const resp = await apiFetch(`/api/reviews/${reviewId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, note }) });
      if (resp.ok) {
        setReviews(prev => prev.filter(r => r.id !== reviewId));
        return true;
      }
    } catch (err) {
      console.debug('Server delete failed, falling back to local deletion', err);
    }

    // fallback to local-only deletion
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    return true;
  };

  const placeOrder = (items: { item: MenuItem; quantity: number }[]) => {
    const total = items.reduce((sum, i) => sum + (i.item.price * i.quantity), 0);
    const newOrder: Order = {
      id: Date.now().toString(),
      items,
      total,
      status: "Pending",
      user: "CurrentUser", // Simplified
      date: new Date().toISOString(),
    };
    setOrders([newOrder, ...orders]);
  };

  const updateOrderStatus = (id: string, status: Order["status"]) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
  };

  const addStaff = (newStaff: Staff) => setStaff([...staff, newStaff]);
  const removeStaff = (id: string) => setStaff(staff.filter(s => s.id !== id));

  // Chat Methods
  const sendMessage = (threadId: string, sender: { id: string, name: string, role: "admin" | "staff" | "user" }, text: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      threadId,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      text,
      timestamp: new Date().toISOString(),
      isRead: false,
      encrypted: true,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const markThreadAsRead = (threadId: string, readerRole: "admin" | "staff" | "user") => {
    setMessages(prev => prev.map(m => {
      if (m.threadId !== threadId) return m;

      // If Admin/Staff is reading, mark USER messages as read
      if (readerRole === "admin" || readerRole === "staff") {
        return m.senderRole === "user" ? { ...m, isRead: true } : m;
      }

      // If User is reading, mark ADMIN/STAFF messages as read
      if (readerRole === "user") {
        return (m.senderRole === "admin" || m.senderRole === "staff") ? { ...m, isRead: true } : m;
      }

      return m;
    }));
  };

  const setTypingStatus = (threadId: string, isTyping: boolean) => {
    setTypingStatusState(prev => ({ ...prev, [threadId]: isTyping }));
  };

  const getThreads = (): ChatThread[] => {
    // Group messages by threadId
    const threadsMap = new Map<string, ChatMessage[]>();
    messages.forEach(m => {
      if (!threadsMap.has(m.threadId)) threadsMap.set(m.threadId, []);
      threadsMap.get(m.threadId)?.push(m);
    });

    const threads: ChatThread[] = [];
    threadsMap.forEach((msgs, threadId) => {
      // Sort by time
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const lastMsg = msgs[msgs.length - 1];

      // Find user name from messages if possible (simplification)
      const userMsg = msgs.find(m => m.senderRole === "user");
      const userName = userMsg ? userMsg.senderName : "Unknown User";

      threads.push({
        id: threadId,
        userName,
        lastMessage: lastMsg,
        unreadCount: msgs.filter(m => !m.isRead && m.senderRole === "user").length,
        typing: typingStatus[threadId] || false,
      });
    });

    return threads.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  };

  return (
    <DataContext.Provider value={{
      menu, addMenuItem, deleteMenuItem, updateMenuItem,
      news, addNews, deleteNews, getNewsById, updateNewsViews,
      reviews, getReviewsForProduct, addReviewForProduct, removeReview,
      orders, placeOrder, updateOrderStatus,
      staff, addStaff, removeStaff,
      messages, sendMessage, markThreadAsRead, setTypingStatus, getThreads,
      fetchReviewAudits, restoreReview,
      serverHealth,
      kpis
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

// re-export for tooling compatibility
export { useData as useDataHook };
