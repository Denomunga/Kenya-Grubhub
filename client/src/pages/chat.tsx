import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Send, User as UserIcon, Bot } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
  id: string;
  text: string;
  sender: "user" | "staff";
  timestamp: Date;
}

export default function Chat() {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Karibu! Welcome to Kenyan Bistro. How can we help you today?",
      sender: "staff",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue("");

    // Mock staff response
    setTimeout(() => {
      const responses = [
        "Asante for your message! A staff member will be with you shortly.",
        "We can definitely help with that order.",
        "Our location is open until 10 PM today.",
        "Is there anything else you'd like to know about our menu?",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        sender: "staff",
        timestamp: new Date(),
      }]);
    }, 1500);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Please Login to Chat</h2>
          <p className="text-muted-foreground">You need an account to communicate with our staff.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="h-[80vh] flex flex-col shadow-xl border-none overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground py-4 px-6 flex flex-row items-center gap-4 space-y-0">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarFallback className="bg-white text-primary font-bold">S</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-primary rounded-full"></span>
          </div>
          <div>
            <h2 className="text-lg font-bold">Customer Support</h2>
            <p className="text-xs opacity-80">Typically replies in a few minutes</p>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 bg-muted/10">
          <ScrollArea className="h-full p-4">
            <div className="flex flex-col gap-4 pb-4">
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`
                    max-w-[80%] rounded-2xl p-4 shadow-sm
                    ${msg.sender === "user" 
                      ? "bg-primary text-primary-foreground rounded-br-none" 
                      : "bg-white text-foreground border rounded-bl-none"}
                  `}>
                    <p className="text-sm">{msg.text}</p>
                    <span className="text-[10px] opacity-50 mt-1 block text-right">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 bg-background border-t">
          <form 
            className="flex w-full gap-2"
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 focus-visible:ring-primary"
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
