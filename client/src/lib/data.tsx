import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { io } from "socket.io-client";
import { apiFetch } from "./api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // in KSHS
  category: string; // Now flexible - can be "Electronics", "Real Estate", "Fashion", "Vehicles", "Food", etc.
  subcategory?: string;
  brand?: string; // Optional - mainly for electronics, fashion, vehicles
  condition?: "new" | "used" | "refurbished"; // Optional - mainly for electronics, vehicles, fashion
  specifications?: Record<string, any>; // Optional - for technical specs
  images?: string[];
  image?: string;
  available: boolean;
  stock?: number; // Optional - mainly for physical products
  location?: string; // Optional - mainly for real estate, vehicles
  tags?: string[]; // Optional - for searchability
  size?: string; // Optional - for fashion, furniture
  color?: string; // Optional - for fashion, vehicles
  year?: number; // Optional - for vehicles, electronics
  material?: string; // Optional - for fashion, furniture
  weight?: number; // Optional - for shipping calculation
  dimensions?: { length: number; width: number; height: number; }; // Optional - for shipping
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  date: string;
  author: string;
  category?: string;
  tags?: string[];
  image?: string;
  featured?: boolean;
  published?: boolean;
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

export interface OrderLocation {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  instructions?: string;
}

export interface Order {
  id: string;
  items: { item: MenuItem; quantity: number }[];
  total: number;
  status: "Pending" | "Preparing" | "Ready" | "Delivered" | "Cancelled";
  user: string;
  userEmail?: string;
  userPhone?: string;
  date: string;
  location?: OrderLocation;
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
  fetchReviewsFromServer: () => Promise<void>;

  orders: Order[];
  placeOrder: (items: { item: MenuItem; quantity: number }[], location?: OrderLocation) => void;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  cancelOrder: (id: string) => Promise<boolean>;
  modifyOrder: (id: string, items: { item: MenuItem; quantity: number }[]) => Promise<boolean>;

  staff: Staff[];
  addStaff: (staff: Staff) => void;
  removeStaff: (id: string) => void;

  // Chat Methods
  messages: ChatMessage[];
  sendMessage: (threadId: string, sender: { id: string, name: string, role: "admin" | "staff" | "user" }, text: string) => Promise<boolean>;
  markThreadAsRead: (threadId: string, readerRole: "admin" | "staff" | "user") => Promise<boolean>;
  setTypingStatus: (threadId: string, isTyping: boolean) => void;
  getThreads: () => ChatThread[];
  fetchThreads: () => Promise<any[]>;
  fetchMessages: (threadId: string) => Promise<any[]>;
  // Review audit methods (admin)
  fetchReviewAudits: (opts?: { action?: string; byName?: string; reviewId?: string; start?: string; end?: string; page?: number; pageSize?: number; exportCsv?: boolean; sort?: 'asc' | 'desc'; exportAll?: boolean }) => Promise<{ audits: any[]; total?: number; page?: number; pageSize?: number; csv?: string }>;
  restoreReview: (reviewId: string) => Promise<boolean>;
  serverHealth?: any | null;
  kpis?: any;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_MENU: MenuItem[] = [
  // Food Items
  {
    id: "1",
    name: "Nyama Choma",
    description: "Grilled beef marinated in traditional Kenyan spices, served with kachumbari.",
    price: 1200,
    category: "Food",
    subcategory: "Main Course",
    available: true,
    stock: 50,
    tags: ["beef", "grilled", "traditional"],
  },
  {
    id: "2",
    name: "Ugali & Sukuma Wiki",
    description: "Classic Kenyan staple. Cornmeal cake with sautéed collard greens.",
    price: 400,
    category: "Food",
    subcategory: "Main Course",
    available: true,
    stock: 100,
    tags: ["vegetarian", "traditional"],
  },
  {
    id: "3",
    name: "Chapati & Madondo",
    description: "Soft layered flatbread served with a rich red bean stew.",
    price: 350,
    category: "Food",
    subcategory: "Main Course",
    available: true,
    stock: 80,
    tags: ["vegetarian", "beans"],
  },
  {
    id: "4",
    name: "Beef Samosas (Pair)",
    description: "Crispy pastry filled with spiced minced beef.",
    price: 150,
    category: "Food",
    subcategory: "Starter",
    available: true,
    stock: 40,
    tags: ["beef", "snack", "crispy"],
  },
  
  // Electronics
  {
    id: "5",
    name: "MacBook Pro 14\"",
    description: "M3 Pro chip, 18GB RAM, 512GB SSD. Perfect for professionals and creators.",
    price: 250000,
    category: "Electronics",
    subcategory: "Laptops",
    brand: "Apple",
    condition: "new",
    specifications: {
      processor: "M3 Pro",
      ram: "18GB",
      storage: "512GB SSD",
      display: "14.2\" Liquid Retina XDR",
      graphics: "M3 Pro GPU"
    },
    images: [],
    available: true,
    stock: 15,
    tags: ["laptop", "apple", "professional", "m3"],
  },
  {
    id: "6",
    name: "iPhone 15 Pro",
    description: "Latest iPhone with titanium design, A17 Pro chip, and advanced camera system.",
    price: 145000,
    category: "Electronics",
    subcategory: "Smartphones",
    brand: "Apple",
    condition: "new",
    specifications: {
      processor: "A17 Pro",
      storage: "256GB",
      camera: "48MP Main + 12MP Ultra Wide + 12MP Telephoto",
      display: "6.1\" Super Retina XDR",
      battery: "All-day battery life"
    },
    images: [],
    available: true,
    stock: 25,
    tags: ["smartphone", "apple", "5g", "pro"],
  },
  {
    id: "7",
    name: "Samsung Galaxy S24 Ultra",
    description: "Premium Android phone with S Pen, 200MP camera, and Galaxy AI features.",
    price: 130000,
    category: "Electronics",
    subcategory: "Smartphones",
    brand: "Samsung",
    condition: "new",
    specifications: {
      processor: "Snapdragon 8 Gen 3",
      storage: "256GB",
      camera: "200MP Main + 50MP Periscope + 12MP Ultra Wide",
      display: "6.8\" Dynamic AMOLED 2X",
      special: "S Pen included"
    },
    images: [],
    available: true,
    stock: 20,
    tags: ["smartphone", "samsung", "android", "s-pen"],
  },
  
  // Vehicles
  {
    id: "8",
    name: "Toyota Land Cruiser V8",
    description: "2023 model, excellent condition, full service history. Perfect for Kenyan roads.",
    price: 8500000,
    category: "Vehicles",
    subcategory: "SUVs",
    brand: "Toyota",
    condition: "used",
    specifications: {
      year: 2023,
      mileage: "15,000 km",
      engine: "4.0L V8",
      transmission: "Automatic",
      fuel: "Petrol",
      drive: "4WD"
    },
    images: [],
    available: true,
    stock: 1,
    location: "Nairobi",
    tags: ["suv", "toyota", "4x4", "off-road"],
  },
  {
    id: "9",
    name: "Honda CR-V 2022",
    description: "Reliable family SUV with excellent fuel economy and safety features.",
    price: 3200000,
    category: "Vehicles",
    subcategory: "SUVs",
    brand: "Honda",
    condition: "used",
    specifications: {
      year: 2022,
      mileage: "25,000 km",
      engine: "1.5L Turbo",
      transmission: "CVT",
      fuel: "Petrol",
      seats: 7
    },
    images: [],
    available: true,
    stock: 1,
    location: "Mombasa",
    tags: ["suv", "honda", "family", "fuel-efficient"],
  },
  
  // Real Estate
  {
    id: "10",
    name: "3 Bedroom Apartment - Kilimani",
    description: "Modern 3BR apartment in prime Kilimani location, 24/7 security, swimming pool.",
    price: 15000000,
    category: "Real Estate",
    subcategory: "Apartments",
    condition: "new",
    specifications: {
      bedrooms: 3,
      bathrooms: 2,
      size: "120 sq meters",
      floor: "5th floor",
      parking: "2 dedicated spaces",
      amenities: ["Gym", "Pool", "Security", "Backup generator"]
    },
    images: [],
    available: true,
    stock: 1,
    location: "Kilimani, Nairobi",
    tags: ["apartment", "kilimani", "modern", "3br"],
  },
  {
    id: "11",
    name: "Office Space - Westlands",
    description: "Prime commercial office space in Westlands, perfect for businesses.",
    price: 8000000,
    category: "Real Estate",
    subcategory: "Commercial",
    condition: "new",
    specifications: {
      size: "200 sq meters",
      floor: "Ground floor",
      parking: "10 spaces",
      features: ["Conference room", "Kitchen", "Reception", "Backup power"]
    },
    images: [],
    available: true,
    stock: 1,
    location: "Westlands, Nairobi",
    tags: ["office", "commercial", "westlands", "business"],
  },
  
  // Fashion
  {
    id: "12",
    name: "Nike Air Jordan 1 Retro",
    description: "Classic basketball sneakers in original colorway, brand new with box.",
    price: 15000,
    category: "Fashion",
    subcategory: "Footwear",
    brand: "Nike",
    condition: "new",
    specifications: {
      size: "US 10",
      colorway: "Chicago",
      material: "Leather",
      year: 2024
    },
    images: [],
    available: true,
    stock: 5,
    tags: ["sneakers", "nike", "jordan", "basketball"],
  },
  {
    id: "13",
    name: "Leather Jacket - Premium",
    description: "Genuine leather jacket, perfect for Kenyan weather, stylish and durable.",
    price: 8500,
    category: "Fashion",
    subcategory: "Clothing",
    condition: "new",
    specifications: {
      material: "Genuine Leather",
      color: "Black",
      sizes: ["S", "M", "L", "XL"],
      style: "Biker Jacket"
    },
    images: [],
    available: true,
    stock: 20,
    tags: ["jacket", "leather", "fashion", "biker"],
  },
  {
    id: "14",
    name: "Designer Handbag",
    description: "Authentic designer handbag, comes with certificate of authenticity.",
    price: 45000,
    category: "Fashion",
    subcategory: "Accessories",
    condition: "new",
    specifications: {
      brand: "Louis Vuitton",
      material: "Canvas with leather trim",
      color: "Brown monogram",
      compartments: 3
    },
    images: [],
    available: true,
    stock: 3,
    tags: ["handbag", "designer", "luxury", "authentic"],
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

const INITIAL_STAFF: Staff[] = [
  { id: "1", name: "Juma", role: "Head Chef" },
  { id: "2", name: "Achieng", role: "Manager" },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuItem[]>([]); // Start empty to prioritize server data
  const [news, setNews] = useState<NewsItem[]>([]); // Start empty to prioritize server data
  const [reviews, setReviews] = useState<Review[]>([]); // Start empty to prioritize server data
  const [orders, setOrders] = useState<Order[]>([]); // Start empty to prioritize server data
  const [staff, setStaff] = useState<Staff[]>(INITIAL_STAFF);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Start empty to prioritize server data
  const [typingStatus, setTypingStatusState] = useState<Record<string, boolean>>({});
  const [serverHealth, setServerHealth] = useState<any | null>(null);
  const [kpis, setKpis] = useState<any>({ totalRevenue: 0, activeOrders: 0, ordersPerMinute: 0 });

  // Add missing variables for notifications
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Load from local storage to persist across refreshes (mock DB) - but not menu, news, orders, or reviews, prioritize server data from MongoDB
  useEffect(() => {
    // Remove all localStorage loading to prioritize server data from MongoDB
    const storedReviews = localStorage.getItem("kenyan_bistro_reviews");
    if (storedReviews) {
      // Don't load reviews from localStorage anymore
      console.log('Ignoring localStorage reviews, fetching from server');
    }
    // Remove news loading from localStorage to prioritize server data from MongoDB
    const storedNews = localStorage.getItem("kenyan_bistro_news");
    if (storedNews) {
      // Don't load news from localStorage anymore
      console.log('Ignoring localStorage news, fetching from server');
    }
    // Remove orders loading from localStorage to prioritize server data from MongoDB
    const storedOrders = localStorage.getItem("kenyan_bistro_orders");
    if (storedOrders) {
      // Don't load orders from localStorage anymore
      console.log('Ignoring localStorage orders, fetching from server');
    }
  }, []);

  // Fetch reviews from server after menu is loaded
  useEffect(() => {
    if (menu.length > 0) {
      fetchReviewsFromServer();
    }
  }, [menu]); 

  // Fetch messages and threads from server (admin/staff only)
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'staff')) {
      fetchThreads();
    }
  }, [user]); 

  // Try to fetch server-side menu/news/orders if available and override local mock data
  useEffect(() => {
    (async () => {
      let menuLoaded = false;
      
      try {
        const resMenu = await apiFetch('/api/menu');
        if (resMenu.ok) {
          const d = await resMenu.json();
          if (Array.isArray(d.menu)) {
            setMenu(d.menu.map((m: any) => ({
              id: m.id,
              name: m.name,
              description: m.description,
              price: m.price,
              category: m.category,
              subcategory: m.subcategory,
              brand: m.brand,
              condition: m.condition,
              specifications: m.specifications,
              images: m.images || [],
              image: m.images?.[0] || '',
              available: m.available,
              stock: m.stock,
              location: m.location,
              tags: m.tags,
              size: m.size,
              color: m.color,
              year: m.year,
              material: m.material,
              weight: m.weight,
              dimensions: m.dimensions
            })));
            menuLoaded = true;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch menu from server, using initial data');
      }

      // Fallback to initial data only if server fetch failed
      if (!menuLoaded) {
        setMenu(INITIAL_MENU);
      }

      try {
        const resOrders = await apiFetch('/api/orders');
        if (resOrders.ok) {
          const d = await resOrders.json();
          if (Array.isArray(d.orders)) {
            setOrders(d.orders.map((o: any) => ({
              id: o.id,
              items: o.items.map((item: any) => ({
                item: {
                  id: item.productId || Date.now().toString(),
                  name: item.name,
                  description: item.description || '',
                  price: item.price,
                  category: item.category || 'Main',
                  image: item.image || '',
                  available: true
                },
                quantity: item.quantity
              })),
              total: o.total,
              status: o.status,
              user: o.user,
              userEmail: o.userEmail,
              userPhone: o.userPhone,
              date: o.createdAt || o.date,
              location: o.location
            })));
          }
        }
      } catch (err) {
        console.warn('Failed to fetch orders from server');
      }

      try {
        const resNews = await apiFetch('/api/news');
        if (resNews.ok) {
          const d = await resNews.json();
          if (Array.isArray(d.news)) setNews(d.news);
        }
      } catch (err) {
        console.warn('Failed to fetch news from server, using initial data');
        setNews(INITIAL_NEWS);
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
        setOrders(prev => [{ 
          id: payload.id, 
          items: payload.items.map((it: any) => ({ item: { id: it.productId || Date.now().toString(), name: it.name, description: '', price: it.price, category: 'Main', image: '', available: true }, quantity: it.quantity })), 
          total: payload.total, 
          status: payload.status, 
          user: payload.user || 'Unknown',
          userEmail: payload.userEmail || undefined,
          userPhone: payload.userPhone || undefined,
          date: payload.createdAt,
          location: payload.location || undefined
        }, ...prev]);
        try { window.dispatchEvent(new CustomEvent('orders:new', { detail: payload })); } catch (e) { }
        
        // Enhanced admin/staff notifications
        if (user?.role === 'admin' || user?.role === 'staff') {
          new Notification(`New Order: ${payload.id}`, {
            body: `Order #${payload.id} for ${payload.total} from ${payload.user}`,
            icon: '/favicon.ico',
            tag: 'new-order'
          });
          
          toast({
            title: "New Order Received",
            description: `Order #${payload.id} for ${payload.total} from ${payload.user}`,
            action: (
              <button 
                onClick={() => setLocation('/dashboard')}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
              >
                View Order
              </button>
            )
          });
        }
      });
      socket.on('orders:update', (payload: any) => {
        setOrders(prev => prev.map(o => o.id === payload.id ? { 
          ...o, 
          status: payload.status, 
          eta: payload.eta,
          items: payload.items ? payload.items.map((it: any) => ({ 
            item: { 
              id: it.productId || Date.now().toString(), 
              name: it.name, 
              description: '', 
              price: it.price, 
              category: 'Main', 
              image: '', 
              available: true 
            }, 
            quantity: it.quantity 
          })) : o.items,
          total: payload.total || o.total
        } : o));
        try { window.dispatchEvent(new CustomEvent('orders:update', { detail: payload })); } catch (e) { }
      });
      socket.on('chat:message', (payload: any) => {
        // ✅ Add message based on user role and thread ownership
        const shouldAddMessage = user && (
          // Admin/staff see all messages
          (user.role === 'admin' || user.role === 'staff') || 
          // Users see only messages from their own thread
          payload.message.threadId === user.id
        );
        
        if (shouldAddMessage) {
          setMessages(prev => [...prev, { 
            id: payload.message.id, 
            threadId: payload.message.threadId, 
            senderId: payload.message.senderId, 
            senderName: payload.message.senderName, 
            senderRole: payload.message.senderRole, 
            text: payload.message.text, 
            timestamp: payload.message.timestamp, 
            isRead: false, 
            encrypted: payload.message.encrypted 
          }]);
          
          // ✅ Immediate notification update for users receiving admin messages
          if (user && user.role === 'user' && payload.message.senderRole !== 'user') {
            // User received a message from admin/staff - trigger immediate notification update
            try {
              window.dispatchEvent(new CustomEvent('chat:message', { detail: payload }));
            } catch (e) { }
          }
        }
        
        try { window.dispatchEvent(new CustomEvent('chat:message', { detail: payload })); } catch (e) { }
      });
      socket.on('chat:read', (payload: any) => {
        // ✅ Handle real-time read status updates
        setMessages(prev => prev.map(m => {
          if (m.threadId !== payload.threadId) return m;
          
          // Update read status based on who read the messages
          if (payload.readerRole === "admin" || payload.readerRole === "staff") {
            return m.senderRole === "user" ? { ...m, isRead: true } : m;
          }
          
          if (payload.readerRole === "user") {
            return (m.senderRole === "admin" || m.senderRole === "staff") ? { ...m, isRead: true } : m;
          }
          
          return m;
        }));
        try { window.dispatchEvent(new CustomEvent('chat:read', { detail: payload })); } catch (e) { }
      });
      socket.on('audit:review', (payload: any) => { try { window.dispatchEvent(new CustomEvent('audit:review', { detail: payload })); } catch (e) { } });
      socket.on('audit:news', (payload: any) => { try { window.dispatchEvent(new CustomEvent('audit:news', { detail: payload })); } catch (e) { } });
      socket.on('audit:user', (payload: any) => { try { window.dispatchEvent(new CustomEvent('audit:user', { detail: payload })); } catch (e) { } });
      socket.on('server:health', (payload: any) => { try { setServerHealth(payload); window.dispatchEvent(new CustomEvent('server:health', { detail: payload })); } catch (e) { } });
      socket.on('kpi:update', (payload: any) => { try { setKpis(payload); window.dispatchEvent(new CustomEvent('kpi:update', { detail: payload })); } catch (e) { } });
    } catch (err) { console.warn('Socket init failed', err); }

    return () => { try { socket?.disconnect(); } catch (e) { } };
  }, []);

  // Save to local storage on change - but not menu, news, orders, reviews, or messages, to prioritize server data from MongoDB
  // Remove localStorage saving to prioritize server data from MongoDB

  const addMenuItem = async (item: MenuItem) => {
    // Try to persist server-side first
    try {
      const resp = await apiFetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          subcategory: item.subcategory,
          brand: item.brand,
          condition: item.condition,
          specifications: item.specifications,
          images: item.images || [],
          available: item.available,
          stock: item.stock,
          location: item.location,
          tags: item.tags,
          size: item.size,
          color: item.color,
          year: item.year,
          material: item.material,
          weight: item.weight,
          dimensions: item.dimensions
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const p = data.product;
        // Add the server-created item to local state
        const serverItem: MenuItem = {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          subcategory: p.subcategory,
          brand: p.brand,
          condition: p.condition,
          specifications: p.specifications,
          images: p.images || [],
          available: p.available,
          stock: p.stock,
          location: p.location,
          tags: p.tags,
          size: p.size,
          color: p.color,
          year: p.year,
          material: p.material,
          weight: p.weight,
          dimensions: p.dimensions
        };
        setMenu(prev => [...prev, serverItem]);
        return serverItem;
      } else {
        const errorData = await resp.json();
        throw new Error(errorData.message || 'Failed to create menu item');
      }
    } catch (err) {
      throw err; // Don't fallback to local storage - show the error
    }
  };
  const deleteMenuItem = async (id: string) => {
  // Try server delete first
  try {
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      const resp = await apiFetch(`/api/menu/${id}`, {
        method: 'DELETE',
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
      const resp = await apiFetch(`/api/menu/${item.id}`, {
        method: 'PUT',
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
      const resp = await apiFetch(`/api/news/${newsId}`, {
        method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, note }),
      });
      if (resp.ok) {
        setNews(prev => prev.filter(n => n.id !== newsId));
        
        // ✅ Refetch news from server to ensure homepage updates
        try {
          const resNews = await apiFetch('/api/news');
          if (resNews.ok) {
            const d = await resNews.json();
            if (Array.isArray(d.news)) setNews(d.news);
          }
        } catch (err) {
          console.warn('Failed to refetch news after delete:', err);
        }
        
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
    // Try to persist server-side first (like addMenuItem)
    try {
      // Validate required fields before sending
      if (!item.title || !item.content || !item.author) {
        console.error('Missing required fields for news article', { title: item.title, content: item.content, author: item.author });
        return item;
      }

      const resp = await apiFetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title?.trim(),
          content: item.content?.trim(),
          excerpt: item.excerpt?.trim() || '',
          author: item.author?.trim(),
          date: item.date || new Date().toISOString().split('T')[0], // ✅ Add required date field
          category: item.category?.trim() || 'General',
          tags: Array.isArray(item.tags) ? item.tags : [],
          image: item.image?.trim() || '',
          featured: Boolean(item.featured),
          published: Boolean(item.published !== false) // Default to true
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const n = data.news;
        // Add the server-created item to local state (like addMenuItem)
        const serverItem: NewsItem = {
          id: n.id,
          title: n.title,
          content: n.content,
          excerpt: n.excerpt,
          date: n.date || item.date,
          author: n.author,
          category: n.category,
          tags: n.tags,
          image: n.image || item.image,
          featured: n.featured,
          published: n.published,
          views: n.views || 0
        };
        setNews(prev => [serverItem, ...prev]);
        console.log('News article successfully saved:', serverItem);
        
        // ✅ Refetch news from server to ensure homepage updates
        try {
          const resNews = await apiFetch('/api/news');
          if (resNews.ok) {
            const d = await resNews.json();
            if (Array.isArray(d.news)) setNews(d.news);
          }
        } catch (err) {
          console.warn('Failed to refetch news after publish:', err);
        }
        
        return serverItem;
      } else {
        const errorData = await resp.json().catch(() => ({}));
        console.error('Server error when saving news:', {
          status: resp.status,
          statusText: resp.statusText,
          error: errorData
        });
      }
    } catch (err) {
      console.error('Failed to persist news to server:', err);
    }

    // fallback: local-only (only if server fails)
    setNews(prev => [item, ...prev]);
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
      const resp = await apiFetch(`/api/news/${id}`, {
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
      const resp = await apiFetch(`/api/news/${id}/views`, {
        method: 'PATCH',
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

  // Cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Helper function with retry-after and exponential backoff
const fetchWithRetry = async (url: string, maxRetries: number = 3) => {
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      const response = await apiFetch(url);
      
      if (response.status === 429) {
        retryCount++;
        
        // Check for Retry-After header
        const retryAfter = response.headers.get('Retry-After');
        let delay = 1000 * Math.pow(2, retryCount - 1); // Exponential backoff
        
        if (retryAfter) {
          delay = parseInt(retryAfter) * 1000;
        }
        
        // Cap delay at 30 seconds
        delay = Math.min(delay, 30000);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (retryCount >= maxRetries) throw error;
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
    }
  }
  
  throw new Error('Max retries exceeded');
};

const fetchReviewsFromServer = async () => {
    try {
      // Get all unique product IDs from menu
      const productIds = menu.map(item => item.id);
      
      if (productIds.length === 0) {
        return;
      }
      
      const allReviews: Review[] = [];

      // Fetch reviews in batches of 1 to minimize requests
      const batchSize = 1;
      
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        
        // Fetch batch sequentially to reduce concurrent requests
        const batchResults: Review[] = [];
        
        for (const productId of batch) {
          try {
            const cacheKey = `/api/products/${productId}/reviews`;
            const cached = apiCache.get(cacheKey);
            
            // Use cache if available and fresh (15 minutes)
            if (cached && Date.now() - cached.timestamp < 900000) {
              batchResults.push(...cached.data);
              continue;
            }
            
            const resp = await fetchWithRetry(`/api/products/${productId}/reviews`);
            
            if (resp.ok) {
              const data = await resp.json();
              const reviewsResponse = data.reviews || [];
              
              const serverReviews: Review[] = reviewsResponse.map((r: any) => ({
                id: r.id,
                productId: r.productId,
                userId: r.userId,
                user: r.userName,
                rating: r.rating,
                comment: r.comment,
                date: r.timestamp,
              }));
              
              // Cache the results
              apiCache.set(cacheKey, {
                data: serverReviews,
                timestamp: Date.now(),
                ttl: 900000 // 15 minutes
              });
              
              batchResults.push(...serverReviews);
            }
          } catch (error) {
            // Continue with other products if one fails
            continue;
          }
        }
        
        allReviews.push(...batchResults);

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < productIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update the reviews state with server data
      if (allReviews.length > 0) {
        setReviews(allReviews);
      }
    } catch (error) {
      // Silently handle errors
    }
  };

  const addReviewForProduct = async (productId: string, review: Omit<Review, "id" | "productId" | "date" | "userId"> & { userId?: string }) => {
    // Try to persist to server first (if available). If it fails, fall back to local-only storage.
    try {
      const resp = await apiFetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      } else {
        const errorData = await resp.json();
        throw new Error(errorData.message || 'Failed to create review');
      }
    } catch (err) {
      throw err; // Don't fallback to local storage - show the error
    }
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
      const resp = await apiFetch(url);
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
      const resp = await apiFetch(`/api/reviews/${reviewId}`, { 
        method: 'DELETE', 
        body: JSON.stringify({ reason, note }) 
      });
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

  const placeOrder = (items: { item: MenuItem; quantity: number }[], location?: OrderLocation) => {
    const total = items.reduce((sum, i) => sum + (i.item.price * i.quantity), 0);
    const newOrder: Order = {
      id: Date.now().toString(),
      items,
      total,
      status: "Pending",
      user: "CurrentUser", // Simplified - will be updated by API response
      date: new Date().toISOString(),
      location: location || undefined,
    };
    setOrders([newOrder, ...orders]);
    
    // Send to API with user contact info
    // In a real implementation, this would get user info from auth context
    apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: items.map(i => ({
          productId: i.item.id,
          name: i.item.name,
          quantity: i.quantity,
          price: i.item.price
        })),
        total,
        user: "CurrentUser",
        userId: "current-user-id", // Would come from auth
        userEmail: "user@example.com", // Would come from auth
        userPhone: "+254700000000", // Would come from auth
        location
      })
    }).catch(err => {
      console.error('Failed to place order:', err);
    });
  };

  const updateOrderStatus = (id: string, status: Order["status"]) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
  };

  const cancelOrder = async (id: string): Promise<boolean> => {
    try {
      const response = await apiFetch(`/api/orders/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({})
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state with the cancelled order
        setOrders(orders.map(o => o.id === id ? { ...o, status: data.order.status } : o));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return false;
    }
  };

  const modifyOrder = async (id: string, items: { item: MenuItem; quantity: number }[]): Promise<boolean> => {
    try {
      const total = items.reduce((sum, i) => sum + (i.item.price * i.quantity), 0);
      const formattedItems = items.map(i => ({
        productId: i.item.id,
        name: i.item.name,
        quantity: i.quantity,
        price: i.item.price
      }));

      const response = await apiFetch(`/api/orders/${id}/modify`, {
        method: 'PATCH',
        body: JSON.stringify({ items: formattedItems, total })
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state with the modified order
        setOrders(orders.map(o => o.id === id ? { 
          ...o, 
          items: data.order.items.map((item: any) => ({
            item: { id: item.productId || Date.now().toString(), name: item.name, description: '', price: item.price, category: 'Main', image: '', available: true },
            quantity: item.quantity
          })),
          total: data.order.total 
        } : o));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to modify order:', error);
      return false;
    }
  };

  const addStaff = (newStaff: Staff) => setStaff([...staff, newStaff]);
  const removeStaff = (id: string) => setStaff(staff.filter(s => s.id !== id));

  // Chat Methods - Real API Implementation
  const sendMessage = async (threadId: string, _sender: { id: string, name: string, role: "admin" | "staff" | "user" }, text: string) => {
    try {
      const trimmedText = text.trim();
      console.log('sendMessage: API call', { 
        threadId, 
        sender: _sender, 
        text: trimmedText,
        textLength: trimmedText.length,
        textType: typeof trimmedText,
        originalText: text,
        originalTextLength: text.length
      });
      
      const requestBody = JSON.stringify({ threadId, text: trimmedText });
      console.log('sendMessage: Request body', requestBody);
      
      const response = await apiFetch('/api/chat/messages', {
        method: 'POST',
        body: requestBody
      });

      console.log('sendMessage: Response status', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('sendMessage: Response data', data);
        
        const newMessage: ChatMessage = {
          id: data.message.id,
          threadId: data.message.threadId,
          senderId: data.message.senderId,
          senderName: data.message.senderName,
          senderRole: data.message.senderRole,
          text: data.message.text,
          timestamp: data.message.timestamp,
          isRead: data.message.isRead,
          encrypted: data.message.encrypted,
        };
        
        console.log('sendMessage: New message created', newMessage);
        setMessages(prev => [...prev, newMessage]);
        return true;
      } else {
        const errorData = await response.json();
        console.error('Failed to send message:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  const markThreadAsRead = async (threadId: string, readerRole: "admin" | "staff" | "user") => {
    try {
      // Validate inputs before making request
      if (!threadId || typeof threadId !== 'string') {
        console.error('markThreadAsRead: Invalid threadId:', threadId);
        return false;
      }
      
      if (!readerRole || !["admin", "staff", "user"].includes(readerRole)) {
        console.error('markThreadAsRead: Invalid readerRole:', readerRole);
        return false;
      }
      
      console.log(`markThreadAsRead: threadId=${threadId}, readerRole=${readerRole}`);
      
      const response = await apiFetch(`/api/chat/threads/${threadId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerRole })
      });

      if (response.ok) {
        // Update local state optimistically
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
        return true;
      } else {
        console.error('Failed to mark as read:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      return false;
    }
  };

  const setTypingStatus = (threadId: string, isTyping: boolean) => {
    setTypingStatusState(prev => ({ ...prev, [threadId]: isTyping }));
  };

  // Real API calls for chat
  const fetchThreads = async () => {
    try {
      const response = await apiFetch('/api/chat/threads');
      if (response.ok) {
        const data = await response.json();
        const threads = data.threads || data || [];
        
        // For admin/staff, also fetch messages for each thread to populate global state
        if (user && (user.role === 'admin' || user.role === 'staff')) {
          for (const thread of threads) {
            await fetchMessages(thread.id);
          }
        }
        
        return threads;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch threads:', error);
      return [];
    }
  };

  const fetchMessages = async (threadId: string) => {
    try {
      // Validate threadId before making request
      if (!threadId || typeof threadId !== 'string') {
        console.error('fetchMessages: Invalid threadId:', threadId);
        return [];
      }
      
      const response = await apiFetch(`/api/chat/messages?threadId=${threadId}`);
      if (response.ok) {
        const data = await response.json();
        const fetchedMessages = data.messages || [];
        
        // Update global messages state with fetched messages
        setMessages(prev => {
          // Remove existing messages for this thread and add new ones
          const filtered = prev.filter(m => m.threadId !== threadId);
          return [...filtered, ...fetchedMessages];
        });
        
        return fetchedMessages;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return [];
    }
  };

  const getThreads = (): ChatThread[] => {
    // Group messages by threadId
    const threadsMap = new Map<string, ChatMessage[]>();
    (messages || []).forEach(m => {
      if (!threadsMap.has(m.threadId)) threadsMap.set(m.threadId, []);
      threadsMap.get(m.threadId)?.push(m);
    });

    const threads: ChatThread[] = [];
    (threadsMap || new Map()).forEach((msgs, threadId) => {
      // Sort by time with safe date parsing
      msgs.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        // Handle invalid dates by treating them as oldest
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        return timeA - timeB;
      });
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
      const timeA = a.lastMessage ? (() => {
        const date = new Date(a.lastMessage.timestamp);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      })() : 0;
      const timeB = b.lastMessage ? (() => {
        const date = new Date(b.lastMessage.timestamp);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      })() : 0;
      return timeB - timeA;
    });
  };

  return (
    <DataContext.Provider value={{
      menu, addMenuItem, deleteMenuItem, updateMenuItem,
      news, addNews, deleteNews, getNewsById, updateNewsViews,
      reviews, getReviewsForProduct, addReviewForProduct, removeReview, fetchReviewsFromServer,
      orders, placeOrder, updateOrderStatus, cancelOrder, modifyOrder,
      staff, addStaff, removeStaff,
      messages, sendMessage, markThreadAsRead, setTypingStatus, getThreads, fetchThreads, fetchMessages,
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
