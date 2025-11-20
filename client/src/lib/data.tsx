import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
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
  image: string;
  available: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

export interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
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
  addMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;
  
  news: NewsItem[];
  addNews: (news: NewsItem) => void;
  
  reviews: Review[];
  addReview: (review: Review) => void;
  
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

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
  { id: "1", user: "Wanjiku M.", rating: 5, comment: "Best Nyama Choma in town! The vibe is immaculate.", date: "2024-06-10" },
  { id: "2", user: "Brian O.", rating: 4, comment: "Great food, service was a bit slow but worth the wait.", date: "2024-06-12" },
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

  // Load from local storage to persist across refreshes (mock DB)
  useEffect(() => {
    const storedMsgs = localStorage.getItem("kenyan_bistro_messages");
    if (storedMsgs) {
      setMessages(JSON.parse(storedMsgs));
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem("kenyan_bistro_messages", JSON.stringify(messages));
  }, [messages]);

  const addMenuItem = (item: MenuItem) => setMenu([...menu, item]);
  const deleteMenuItem = (id: string) => setMenu(menu.filter(i => i.id !== id));

  const addNews = (item: NewsItem) => setNews([item, ...news]);
  
  const addReview = (review: Review) => setReviews([review, ...reviews]);

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
      menu, addMenuItem, deleteMenuItem,
      news, addNews,
      reviews, addReview,
      orders, placeOrder, updateOrderStatus,
      staff, addStaff, removeStaff,
      messages, sendMessage, markThreadAsRead, setTypingStatus, getThreads
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
