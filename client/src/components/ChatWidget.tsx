import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiFetch } from '@/lib/api';
import { Send, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm the KenyaGrubHub Assistant. How can I help you today?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to the bottom when new messages appear
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue;
    setInputValue('');
    setIsLoading(true);

    // Optimistically add user message
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);

    const firstUserIndex = messages.findIndex(msg => msg.role === 'user');
  // Slice from that index (if found) to exclude any leading model messages
  const validHistory = firstUserIndex === -1 ? [] : messages.slice(firstUserIndex);

    // Format history for the Gemini API
    const history = validHistory.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));
    try {
      const res = await apiFetch('/api/v1/accounting/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history })
      });
      
      if (!res.ok) throw new Error('Failed to get response');
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'model', text: data.response }]);

    } catch (error) {
      console.error("Chat error:", error);
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
    <Card className="w-full max-w-md h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>Assistant</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-4">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </ScrollArea>
        <div className="flex items-center space-x-2 pt-4 border-t">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
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