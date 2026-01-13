import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useData } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Eye, X, ZoomIn, Clock, Calendar, User, Share2, Facebook, Twitter, Linkedin, ArrowLeft, BookOpen } from 'lucide-react';

export default function NewsDetail() {
  const params: any = useParams();
  const id = params.id;
  const { getNewsById } = useData();
  const [, setLocation] = useLocation();
  const [news, setNews] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [readingProgress, setReadingProgress] = React.useState(0);

  // Calculate estimated reading time
  const calculateReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  // Handle reading progress
  React.useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      const progress = (scrolled / documentHeight) * 100;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Share functions
  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, '_blank');
  };

  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(news?.title || '')}&url=${window.location.href}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${window.location.href}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

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

  if (loading) return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-64 bg-muted rounded-2xl mb-8"></div>
          <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">📰</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Article Not Found</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => setLocation('/')}>Back to Home</Button>
      </div>
    </div>
  );
  
  if (!news) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">📰</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Article Not Found</h1>
        <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
        <Button onClick={() => setLocation('/')}>Back to Home</Button>
      </div>
    </div>
  );

  const readingTime = calculateReadingTime(news.content || '');

  return (
    <div className="min-h-screen bg-background">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50">
        <div 
          className="h-full bg-linear-to-r from-blue-600 to-purple-600 transition-all duration-300"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Hero Header with Featured Image */}
      <div className="relative h-[70vh] overflow-hidden">
        {news.image ? (
          <>
            <img 
              src={news.image} 
              alt={news.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <div className="container mx-auto">
                <div className="max-w-4xl">
                  <div className="flex items-center gap-4 text-sm mb-4 text-white/90">
                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      {news.category || 'Article'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {news.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {readingTime} min read
                    </span>
                  </div>
                  <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4 leading-tight">
                    {news.title}
                  </h1>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {news.author?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div>
                        <p className="font-semibold">{news.author}</p>
                        <p className="text-sm text-white/80">Author</p>
                      </div>
                    </div>
                    {typeof news.views === 'number' && (
                      <div className="flex items-center gap-2 text-white/90">
                        <Eye className="h-5 w-5" />
                        <span>{news.views.toLocaleString()} views</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <div className="text-center text-white p-8">
              <BookOpen className="h-16 w-16 mx-auto mb-4" />
              <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4 leading-tight">
                {news.title}
              </h1>
            </div>
          </div>
        )}
      </div>

      {/* Article Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            <article className="bg-background rounded-2xl shadow-xl p-8 md:p-12 border border-border">
              
              {/* Article Meta */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {news.author}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {news.date}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {readingTime} min read
                  </span>
                </div>
                
                {/* Share Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareOnFacebook}
                    className="p-2"
                  >
                    <Facebook className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareOnTwitter}
                    className="p-2"
                  >
                    <Twitter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareOnLinkedIn}
                    className="p-2"
                  >
                    <Linkedin className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyLink}
                    className="p-2"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Featured Image (if not in hero) */}
              {news.image && (
                <div className="relative group cursor-pointer mb-8 rounded-xl overflow-hidden" onClick={() => setIsImageModalOpen(true)}>
                  <img 
                    src={news.image} 
                    alt={news.title} 
                    className="w-full h-64 md:h-96 object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 rounded-xl flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/90 p-3 rounded-full border border-border">
                      <ZoomIn className="h-5 w-5 text-foreground" />
                    </div>
                  </div>
                </div>
              )}

              {/* Article Content with Typography */}
              <div className="prose prose-lg max-w-none font-serif leading-relaxed dark:prose-invert">
                <div 
                  className="text-foreground/90 text-lg leading-relaxed space-y-6"
                  dangerouslySetInnerHTML={{ 
                    __html: (news.content || '').replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                  }}
                />
              </div>

              {/* Back Button */}
              <div className="mt-12 pt-8 border-t border-border">
                <Button 
                  variant="outline" 
                  onClick={() => { try { if (window.history.length > 1) window.history.back(); else setLocation('/'); } catch (err) { setLocation('/'); } }}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Articles
                </Button>
              </div>
            </article>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Author Bio */}
            <Card className="bg-background shadow-lg border border-border">
              <CardHeader>
                <CardTitle className="text-lg">About the Author</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {news.author?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{news.author}</h3>
                    <p className="text-sm text-muted-foreground">Content Writer</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Passionate about sharing stories and insights from the Kenyan culinary scene and beyond.
                </p>
              </CardContent>
            </Card>

            {/* Reading Stats */}
            <Card className="bg-background shadow-lg border border-border">
              <CardHeader>
                <CardTitle className="text-lg">Article Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reading Time</span>
                  <span className="text-sm font-medium">{readingTime} minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Views</span>
                  <span className="text-sm font-medium">{news.views?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Published</span>
                  <span className="text-sm font-medium">{news.date}</span>
                </div>
              </CardContent>
            </Card>

            {/* Share Card */}
            <Card className="bg-background shadow-lg border border-border">
              <CardHeader>
                <CardTitle className="text-lg">Share Article</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareOnFacebook}
                    className="flex items-center gap-2"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareOnTwitter}
                    className="flex items-center gap-2"
                  >
                    <Twitter className="h-4 w-4" />
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareOnLinkedIn}
                    className="flex items-center gap-2"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyLink}
                    className="flex items-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
