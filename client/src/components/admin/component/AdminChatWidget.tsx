import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiFetch } from '@/lib/api';
import { Send, Loader2, Bot, X } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface AdminChatWidgetProps {
  onClose?: () => void;
}

export default function AdminChatWidget({ onClose }: AdminChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm your admin assistant. I can help you find invoices, bank statements, check inventory, and get sales summaries. What would you like to know?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue;
    setInputValue('');
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);

    const firstUserIndex = messages.findIndex(msg => msg.role === 'user');
    const validHistory = firstUserIndex === -1 ? [] : messages.slice(firstUserIndex);
    const history = validHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    try {
      const res = await apiFetch('/api/v1/accounting/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history })
      });
      
      if (!res.ok) throw new Error('Failed to get response');
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'model', text: data.response }]);
    } catch (error) {
      console.error("Admin chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble responding right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="w-full max-w-md h-[600px] flex flex-col shadow-2xl border-blue-200">
      <CardHeader className="bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-t-lg flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <CardTitle>Admin Assistant</CardTitle>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-4">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-muted'
              }`}>
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </ScrollArea>
        <div className="flex items-center space-x-2 pt-4 border-t">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about invoices, statements, inventory..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button size="icon" onClick={handleSend} disabled={isLoading || !inputValue.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}