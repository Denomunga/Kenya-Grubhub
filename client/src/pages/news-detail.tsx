import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useData } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Eye, X, ZoomIn } from 'lucide-react';

export default function NewsDetail() {
  const params: any = useParams();
  const id = params.id;
  const { getNewsById } = useData();
  const [, setLocation] = useLocation();
  const [news, setNews] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const n = await getNewsById(id);
        if (!n) {
          setError('News not found');
          return;
        }
        if (mounted) setNews(n);
      } catch (e) {
        setError('Failed to load news');
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [id]);

  // Track view when the component mounts
  React.useEffect(() => {
    let isMounted = true;
    
    const trackView = async () => {
      try {
        if (/^[0-9a-fA-F]{24}$/.test(id)) {
          const response = await fetch(`/api/news/${id}/view`, { 
            method: 'POST', 
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok && isMounted) {
            const data = await response.json();
            // Update the view count in the UI
            setNews((prev: any) => prev ? { ...prev, views: data.views } : null);
          }
        }
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };

    trackView();
    
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) return <div className="container mx-auto px-4 py-12">Loading…</div>;
  if (error) return <div className="container mx-auto px-4 py-12 text-red-500">{error}</div>;
  if (!news) return <div className="container mx-auto px-4 py-12">Not found</div>;

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{news.title}</CardTitle>
              <CardDescription>By {news.author} • {news.date}</CardDescription>
            </div>
            {typeof news.views === 'number' && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{news.views} {news.views === 1 ? 'view' : 'views'}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {news.image && (
            <div className="relative group cursor-pointer mb-4" onClick={() => setIsImageModalOpen(true)}>
              <img 
                src={news.image} 
                alt={news.title} 
                className="w-full h-64 object-cover rounded-md transition-transform duration-300 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-md flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 p-3 rounded-full">
                  <ZoomIn className="h-5 w-5 text-gray-800" />
                </div>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                  Click to view full size
                </div>
              </div>
            </div>
          )}
          <div className="prose max-w-none">
            {news.content}
          </div>
          <div className="mt-6">
            <Button variant="outline" onClick={() => { try { if (window.history.length > 1) window.history.back(); else setLocation('/'); } catch (err) { setLocation('/'); } }}>Back</Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Full-size Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0 overflow-hidden bg-black/95">
          <div className="relative w-full h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={() => setIsImageModalOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            {news.image && (
              <img
                src={news.image}
                alt={news.title}
                className="max-w-full max-h-full object-contain"
                onClick={() => setIsImageModalOpen(false)}
              />
            )}
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
              {news.title}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
