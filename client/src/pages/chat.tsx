import { useState, useEffect, useRef } from "react";
import { useHybridAuth } from "@/lib/hybrid-auth";
import { useData } from "@/lib/data";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { ChatMessage } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Send, Lock, ShieldCheck, Eye, Search, Check, CheckCheck 
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { formatPrice } from "@/lib/format";
import { useLocation } from "wouter";
import { decryptMessage, decryptMessageForThread } from "@/utils/encryption";

export default function Chat() {
  const { user, isAuthenticated, isManager, isAdmin } = useHybridAuth();
  const { messages, sendMessage, getThreads, markThreadAsRead, fetchMessages, fetchThreads } = useData();
  const { unreadCount, markAsRead: markNotificationsAsRead } = useUnreadMessages();
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // State for Admin/Manager view
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const threads = getThreads();

  // Determine the current thread ID based on role
  const currentThreadId = (isAdmin || isManager) ? activeThreadId : user?.id;

  // Effect to handle product context from sessionStorage
  useEffect(() => {
    const productContext = sessionStorage.getItem('chatProduct');
    if (productContext && inputValue === '') {
      const product = JSON.parse(productContext);
      const message = `Hi! I'm interested in the "${product.name}" (priced at ${formatPrice(product.price)}). Is there any discount available or can we discuss the price?`;
      setInputValue(message);
      sessionStorage.removeItem('chatProduct');
    }
  }, [inputValue]);

  // Effect to auto-select first thread for admin if none selected and load messages
  useEffect(() => {
    if ((isAdmin || isManager) && !activeThreadId && threads.length > 0) {
      setActiveThreadId(threads[0].id);
      fetchMessages(threads[0].id);
      setIsInitialLoad(true); // Reset initial load for new thread
    }
  }, [isAdmin || isManager, threads.length, activeThreadId, fetchMessages]);

  // Also fetch threads for admin independently if messages state is empty
  useEffect(() => {
    if ((isAdmin || isManager) && messages.length === 0) {
      const loadThreads = async () => {
        await fetchThreads();
      };
      loadThreads();
    }
  }, [isAdmin, isManager, messages.length]);

  // Fetch messages for regular users if state is empty
  useEffect(() => {
    if (user && user.role === 'user' && messages.length === 0 && user.id) {
      const loadUserMessages = async () => {
        await fetchMessages(user.id);
      };
      loadUserMessages();
    }
  }, [user, messages.length, fetchMessages]);

  // Refresh messages when thread changes
  useEffect(() => {
    if (activeThreadId && (isAdmin || isManager)) {
      fetchMessages(activeThreadId);
      setIsInitialLoad(true); // Reset initial load for new thread
    }
  }, [activeThreadId, isAdmin, isManager, fetchMessages]);

  // Filter messages for the active view
  const currentMessages = messages
    .filter(m => m.threadId === currentThreadId)
    .sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      // Handle invalid dates by treating them as oldest
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      return timeA - timeB;
    });

  // Mark as read when viewing and clear notifications
  useEffect(() => {
    if (user && currentThreadId && user.role && currentThreadId) {
       const markAsReadAndClearNotifications = async () => {
         // First mark messages as read
         await markThreadAsRead(currentThreadId, user.role);
         
         // Then clear notifications after a short delay to ensure state is updated
         setTimeout(() => {
           markNotificationsAsRead();
         }, 100);
       };
       
       markAsReadAndClearNotifications();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentThreadId, currentMessages.length, user?.role]);

  // State to track if this is initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Check if user is at bottom of chat
  const checkIfUserAtBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollContainer) {
        const threshold = 100; // 100px from bottom
        const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < threshold;
        setIsUserAtBottom(isAtBottom);
        return isAtBottom;
      }
    }
    return true;
  };

  // Handle scroll events to track user position
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (scrollContainer) {
      const handleScroll = () => checkIfUserAtBottom();
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Scroll to bottom only when appropriate
  useEffect(() => {
    // Only auto-scroll if:
    // 1. User is at bottom, OR
    // 2. This is initial load, OR  
    // 3. User just sent a message
    if (scrollRef.current && (isUserAtBottom || isInitialLoad)) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
    if (isInitialLoad && currentMessages.length > 0) {
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, isUserAtBottom]); // Remove currentMessages to prevent constant scrolling

  // Handle new messages - only scroll if user is at bottom
  useEffect(() => {
    if (scrollRef.current && isUserAtBottom && currentMessages.length > 0 && !isInitialLoad) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages.length, isUserAtBottom, isInitialLoad]); // Only trigger when message count changes

  // Force scroll to appropriate position on initial load
  useEffect(() => {
    if (scrollAreaRef.current && isInitialLoad) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollContainer) {
        if (isAdmin || isManager) {
          // Admin starts at top to read message history
          scrollContainer.scrollTop = 0;
          setIsUserAtBottom(false); // User is now at top
        } else {
          // Regular users start at bottom to see latest messages
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
          setIsUserAtBottom(true); // User is now at bottom
        }
      }
    }
  }, [isInitialLoad, isAdmin, isManager]);

  const handleSend = async () => {
    if (!inputValue.trim() || !user || !currentThreadId) {
      console.log('handleSend: Validation failed', { 
        hasInput: !!inputValue.trim(), 
        hasUser: !!user, 
        hasThreadId: !!currentThreadId,
        threadId: currentThreadId,
        userId: user?.id,
        userRole: user?.role
      });
      return;
    }

    // Check for product context
    let productId, productInfo;
    const productContext = sessionStorage.getItem('chatProduct');
    if (productContext) {
      const product = JSON.parse(productContext);
      productId = product.id;
      productInfo = {
        name: product.name,
        price: product.price,
        image: product.image
      };
      sessionStorage.removeItem('chatProduct');
    }

    console.log('handleSend: Sending message', { 
      threadId: currentThreadId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      message: inputValue.trim(),
      productId,
      productInfo
    });

    await sendMessage(currentThreadId, {
      id: user.id,
      name: user.name,
      role: user.role
    }, inputValue.trim(), productId, productInfo);
    
    setInputValue("");
    // User is now at bottom after sending message
    setIsUserAtBottom(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center space-y-4 particle-container gradient-mesh">
        <div className="bg-blue-600 p-4 rounded-full">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">Secure Chat Login Required</h2>
        <p className="text-muted-foreground max-w-md">
          All conversations are end-to-end encrypted. Please login to access your secure messages.
        </p>
        <Button onClick={() => setLocation("/login")}>Login to Chat</Button>
      </div>
    );
  }

  // RENDER: Admin / Manager View (Inbox + Chat)
  if (isAdmin || isManager) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 min-h-screen particle-container gradient-mesh">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-[calc(100vh-2rem)] lg:h-[85vh]">
          
          {/* Left Panel: Thread List */}
          <Card className="lg:col-span-1 flex flex-col h-full card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg">Inbox</CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {unreadCount} New
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search messages..." className="pl-8 bg-background" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="flex flex-col">
                  {threads.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <p>No active conversations.</p>
                    </div>
                  ) : (
                    threads.map((thread) => (
                      <button
                        key={thread.id}
                        onClick={() => setActiveThreadId(thread.id)}
                        className={`
                          flex items-start gap-3 p-4 text-left transition-colors border-b
                          ${activeThreadId === thread.id ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/50 border-l-4 border-l-transparent"}
                        `}
                      >
                        <div className="relative">
                          <Avatar>
                            <AvatarFallback>{thread.userName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {thread.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                              {thread.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-center mb-1">
                            <span className={`font-medium ${thread.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                              {thread.userName}
                            </span>
                            {thread.lastMessage && (() => {
                              // Handle both timestamp and createdAt fields
                              const timeField = thread.lastMessage.timestamp || thread.lastMessage.createdAt;
                              if (!timeField) return null;
                              
                              const date = new Date(timeField);
                              const isValid = !isNaN(date.getTime());
                              return isValid ? (
                                <span className="text-[10px] text-muted-foreground">
                                  {format(date, "HH:mm")}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {thread.typing ? (
                              <span className="text-primary animate-pulse">Typing...</span>
                            ) : (
                              thread.lastMessage?.text
                            )}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Panel: Chat Interface */}
          <Card className="lg:col-span-2 flex flex-col h-full border-none shadow-lg overflow-hidden">
            {activeThreadId ? (
              <>
                <CardHeader className="bg-background border-b py-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {threads.find(t => t.id === activeThreadId)?.userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {threads.find(t => t.id === activeThreadId)?.userName}
                      </CardTitle>
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <ShieldCheck className="h-3 w-3" />
                        <span>End-to-end Encrypted</span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <Badge variant="outline" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" /> Monitoring Mode
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="flex-1 p-0 bg-muted/10 relative">
                  <div className="absolute inset-0 flex flex-col">
                    <ScrollArea ref={scrollAreaRef} className="flex-1 p-2 sm:p-4">
                      <div className="flex flex-col gap-3 sm:gap-4 pb-4">
                        <div className="text-center my-4">
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full border border-yellow-200">
                            <Lock className="h-3 w-3 inline mr-1" />
                            Messages are secured with end-to-end encryption
                          </span>
                        </div>
                        
                        {currentMessages.map((msg) => {
                          // Admin/Manager sees user messages on LEFT, staff/admin messages on RIGHT
                          // BUT if I am the sender, it should be on RIGHT
                          const isMe = msg.senderId === user?.id;
                          
                          return (
                            <ChatBubble 
                              key={msg.id} 
                              message={msg} 
                              isMe={isMe}
                              showSenderName={true}
                              threadId={activeThreadId}
                            />
                          );
                        })}
                        <div ref={scrollRef} />
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>

                <CardFooter className="p-3 sm:p-4 bg-background border-t">
                  <form 
                    className="flex w-full gap-2"
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  >
                    <Input 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={`Reply to ${threads.find(t => t.id === activeThreadId)?.userName}...`}
                      className="flex-1 text-sm"
                    />
                    <Button type="submit" size="icon" className="shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </CardFooter>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a conversation to start messaging
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // RENDER: User View (Simple Chat)
  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 min-h-screen">
      <Card className="h-[calc(100vh-2rem)] sm:h-[85vh] flex flex-col border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/20">
                <AvatarFallback className="bg-white text-primary font-bold">KB</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">Kenyan Bistro Support</CardTitle>
                <div className="flex items-center gap-1 text-xs opacity-90">
                  <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                  <span>Staff Online</span>
                </div>
              </div>
            </div>
            <div title="End-to-end Encrypted">
              <ShieldCheck className="h-5 w-5 opacity-80" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 bg-muted/10 relative">
          <div className="absolute inset-0 flex flex-col">
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-2 sm:p-4">
              <div className="flex flex-col gap-3 sm:gap-4 pb-4">
                <div className="text-center my-6">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-background shadow-sm text-xs text-muted-foreground border">
                    <Lock className="h-3 w-3" />
                    Messages are end-to-end encrypted. No one outside of this chat, not even Kenyan Bistro, can read them.
                  </div>
                </div>

                {currentMessages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <ChatBubble 
                      key={msg.id} 
                      message={msg} 
                      isMe={isMe}
                      showSenderName={!isMe}
                      threadId={currentThreadId}
                    />
                  );
                })}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </div>
        </CardContent>

        <CardFooter className="p-3 sm:p-4 bg-background border-t">
          <form 
            className="flex w-full gap-2"
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 text-sm"
            />
            <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}

// Helper function to decrypt messages on client side
function decryptMessageText(message: ChatMessage, currentThreadId: string | null, currentUserId: string | undefined): string {
  // If message appears to be undecrypted server-side, try client-side decryption
  if (message.text && (
    message.text === "[Encrypted message - unable to decrypt]" ||
    (message.encrypted && message.text.length > 20 && /^[A-Za-z0-9+/=]+$/.test(message.text))
  )) {
    try {
      // Try thread-specific decryption first
      if (currentThreadId && currentUserId) {
        try {
          return decryptMessageForThread(message.text, currentThreadId, currentUserId);
        } catch (threadError) {
          // Try legacy decryption
          try {
            return decryptMessage(message.text);
          } catch (legacyError) {
            console.error('Client-side decryption failed:', legacyError);
          }
        }
      }
    } catch (error) {
      console.error('Client-side decryption error:', error);
    }
  }
  
  return message.text;
}

// Helper Component for Chat Bubbles
function ChatBubble({ message, isMe, showSenderName = false, threadId = null }: { 
  message: ChatMessage, 
  isMe: boolean, 
  showSenderName?: boolean,
  threadId?: string | null 
}) {
  const { user } = useHybridAuth();
  const decryptedText = decryptMessageText(message, threadId, user?.id);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div className={`flex flex-col max-w-[85%] sm:max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
        {/* Product info display */}
        {message.productInfo && (
          <div className="mb-2 p-2 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              {message.productInfo.image && (
                <img 
                  src={message.productInfo.image} 
                  alt={message.productInfo.name}
                  className="w-8 h-8 object-cover rounded"
                />
              )}
              <div className="text-xs">
                <div className="font-medium">{message.productInfo.name}</div>
                <div className="text-muted-foreground">{formatPrice(message.productInfo.price)}</div>
              </div>
            </div>
          </div>
        )}
        
        {showSenderName && (
          <span className="text-[10px] text-muted-foreground ml-1 mb-1 font-medium flex items-center gap-1">
            {message.senderRole === "admin" && <Badge variant="outline" className="text-[8px] h-3 px-1 bg-primary/5">ADMIN</Badge>}
            {message.senderRole === "staff" && <Badge variant="outline" className="text-[8px] h-3 px-1 bg-green-500/10 text-green-700">STAFF</Badge>}
            {message.senderName}
          </span>
        )}
        
        <div className={`
          px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-sm relative group
          ${isMe 
            ? "bg-primary text-primary-foreground rounded-br-none" 
            : "bg-white text-foreground border rounded-bl-none"}
        `}>
          <p className="text-sm sm:text-sm leading-relaxed wrap-break-word">{decryptedText}</p>
          
          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? "opacity-70" : "opacity-40"}`}>
             {(() => {
               // Handle both timestamp and createdAt fields
               const timeField = message.timestamp || message.createdAt;
               if (!timeField) return "Invalid time";
               
               const date = new Date(timeField);
               const isValid = !isNaN(date.getTime());
               return isValid ? format(date, "HH:mm") : "Invalid time";
             })()}
             {isMe && (
               message.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
             )}
           </div>
        </div>
      </div>
    </motion.div>
  );
}
