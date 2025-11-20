import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useData, ChatMessage, ChatThread } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Send, User as UserIcon, Lock, ShieldCheck, AlertCircle, 
  Check, CheckCheck, Clock, Eye, Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function Chat() {
  const { user, isAuthenticated, isManager, isAdmin } = useAuth();
  const { messages, sendMessage, getThreads, markThreadAsRead } = useData();
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // State for Admin/Manager view
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const threads = getThreads();

  // Determine the current thread ID based on role
  // If user: threadId is their own ID.
  // If admin/staff: threadId is the selected thread from the list.
  const currentThreadId = (isAdmin || isManager) ? activeThreadId : user?.id;

  // Effect to auto-select first thread for admin if none selected
  useEffect(() => {
    if ((isAdmin || isManager) && !activeThreadId && threads.length > 0) {
      setActiveThreadId(threads[0].id);
    }
  }, [isAdmin, isManager, threads, activeThreadId]);

  // Filter messages for the active view
  const currentMessages = messages
    .filter(m => m.threadId === currentThreadId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Mark as read when viewing
  useEffect(() => {
    if ((isAdmin || isManager) && currentThreadId) {
      // Only mark messages from USER as read when admin views them
      const hasUnread = currentMessages.some(m => !m.isRead && m.senderRole === "user");
      if (hasUnread) {
        markThreadAsRead(currentThreadId);
      }
    }
  }, [currentThreadId, currentMessages, isAdmin, isManager, markThreadAsRead]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages]);

  const handleSend = () => {
    if (!inputValue.trim() || !user || !currentThreadId) return;

    sendMessage(currentThreadId, {
      id: user.id,
      name: user.name,
      role: user.role
    }, inputValue);
    
    setInputValue("");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="bg-muted p-4 rounded-full">
          <Lock className="h-8 w-8 text-muted-foreground" />
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
      <div className="container mx-auto px-4 py-8 h-[85vh]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
          
          {/* Left Panel: Thread List */}
          <Card className="md:col-span-1 flex flex-col h-full border-none shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg">Inbox</CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {threads.reduce((acc, t) => acc + t.unreadCount, 0)} New
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
                            {thread.lastMessage && (
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(thread.lastMessage.timestamp), "HH:mm")}
                              </span>
                            )}
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
          <Card className="md:col-span-2 flex flex-col h-full border-none shadow-lg overflow-hidden">
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
                      <Eye className="h-3 w-3 mr-1" /> Monitoring
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="flex-1 p-0 bg-muted/10 relative">
                  <div className="absolute inset-0 flex flex-col">
                    <ScrollArea className="flex-1 p-4">
                      <div className="flex flex-col gap-4 pb-4">
                        <div className="text-center my-4">
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full border border-yellow-200">
                            <Lock className="h-3 w-3 inline mr-1" />
                            Messages are secured with end-to-end encryption
                          </span>
                        </div>
                        
                        {currentMessages.map((msg) => {
                          const isMe = msg.senderRole !== "user"; // In admin view, "me" is staff/admin
                          return (
                            <ChatBubble 
                              key={msg.id} 
                              message={msg} 
                              isMe={isMe} 
                            />
                          );
                        })}
                        <div ref={scrollRef} />
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>

                <CardFooter className="p-4 bg-background border-t">
                  <form 
                    className="flex w-full gap-2"
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  >
                    <Input 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={`Reply to ${threads.find(t => t.id === activeThreadId)?.userName}...`}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon">
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
    <div className="container mx-auto px-4 py-8 max-w-3xl h-[85vh]">
      <Card className="h-full flex flex-col border-none shadow-xl overflow-hidden">
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
            <ScrollArea className="flex-1 p-4">
              <div className="flex flex-col gap-4 pb-4">
                <div className="text-center my-6">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-background shadow-sm text-xs text-muted-foreground border">
                    <Lock className="h-3 w-3" />
                    Messages are end-to-end encrypted. No one outside of this chat, not even Kenyan Bistro, can read them.
                  </div>
                </div>

                {currentMessages.map((msg) => {
                  const isMe = msg.senderRole === "user";
                  return (
                    <ChatBubble 
                      key={msg.id} 
                      message={msg} 
                      isMe={isMe} 
                    />
                  );
                })}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </div>
        </CardContent>

        <CardFooter className="p-4 bg-background border-t">
          <form 
            className="flex w-full gap-2"
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}

// Helper Component for Chat Bubbles
function ChatBubble({ message, isMe }: { message: ChatMessage, isMe: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div className={`flex flex-col max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && (
          <span className="text-[10px] text-muted-foreground ml-1 mb-1">
            {message.senderName} ({message.senderRole})
          </span>
        )}
        
        <div className={`
          px-4 py-2 rounded-2xl shadow-sm relative group
          ${isMe 
            ? "bg-primary text-primary-foreground rounded-br-none" 
            : "bg-white text-foreground border rounded-bl-none"}
        `}>
          <p className="text-sm leading-relaxed">{message.text}</p>
          
          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? "opacity-70" : "opacity-40"}`}>
             <span>{format(new Date(message.timestamp), "HH:mm")}</span>
             {isMe && (
               message.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
             )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
