import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Newspaper, 
  Plus, 
  Eye,
  Calendar,
  User,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/data";
import { apiFetch } from "@/lib/api";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  image?: string;
  views?: number;
}

const NewsManager: React.FC = () => {
  const { toast } = useToast();
  const { news, addNews } = useData();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state for adding news
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [image, setImage] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // For news, allow only 1 image
      if (files.length > 1) {
        toast({ title: 'Error', description: 'Only 1 image allowed per news article', variant: 'destructive' });
        return;
      }
      setImageFiles(files);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !content || !author || !date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      let uploadedImageUrl = '';
      
      // Upload image if selected
      if (imageFiles.length > 0) {
        const file = imageFiles[0];
        const formData = new FormData();
        formData.append('image', file);
        
        try {
          const response = await apiFetch('/api/uploads', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const data = await response.json();
            uploadedImageUrl = data.url;
          } else {
            throw new Error('Upload failed');
          }
        } catch (error) {
          toast({ title: 'Error', description: `Failed to upload ${file.name}`, variant: 'destructive' });
          setIsLoading(false);
          return;
        }
      }

      const newsItem: NewsItem = {
        id: Date.now().toString(),
        title,
        content,
        author,
        date,
        image: uploadedImageUrl || image || undefined,
        views: 0
      };

      await addNews(newsItem);
      
      // Reset form
      setTitle('');
      setContent('');
      setAuthor('');
      setDate(new Date().toISOString().split('T')[0]);
      setImage('');
      setImageFiles([]);
      
      toast({
        title: "Success",
        description: "News article published successfully",
      });
    } catch (error) {
      console.error('Failed to add news:', error);
      toast({
        title: "Error",
        description: "Failed to publish news article",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-holographic mb-2">News Manager</h2>
        <p className="text-muted-foreground">Publish and manage news articles</p>
      </div>

      <Tabs defaultValue="add" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add" className="magnetic hover-letter-spacing">
            <Plus className="h-4 w-4 mr-2" />
            Add News
          </TabsTrigger>
          <TabsTrigger value="manage" className="magnetic hover-letter-spacing">
            <Newspaper className="h-4 w-4 mr-2" />
            Manage News
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <Card className="gradient-mesh border-animated-gradient">
            <CardHeader>
              <CardTitle className="text-holographic">Publish New Article</CardTitle>
              <CardDescription>
                Create a new news article to display on the homepage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddNews} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Article Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter article title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="liquid-transition"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="author">Author *</Label>
                    <Input
                      id="author"
                      placeholder="Author name"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="liquid-transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Publication Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="liquid-transition"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-upload">Featured Image (optional)</Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="liquid-transition"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload an image for your news article. Recommended size: 1200x630px.
                  </p>
                  
                  {/* Image Preview */}
                  {imageFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Selected Image:</p>
                      <div className="relative group">
                        <img
                          src={URL.createObjectURL(imageFiles[0])}
                          alt="News article preview"
                          className="w-full h-48 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(0)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center truncate">
                          {imageFiles[0].name}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-url">Or enter Image URL (optional)</Label>
                  <Input
                    id="image-url"
                    placeholder="https://example.com/image.jpg"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="liquid-transition"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    placeholder="Write your news article content here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="liquid-transition min-h-[200px]"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full luminous-glow magnetic"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>Publishing...</>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Publish Article
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card className="gradient-mesh border-animated-gradient">
            <CardHeader>
              <CardTitle className="text-holographic">Published Articles</CardTitle>
              <CardDescription>
                Manage your published news articles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {news.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No news articles published yet.</p>
                  <p className="text-sm">Create your first article using the "Add News" tab.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {news.map((article) => (
                    <Card key={article.id} className="border-animated-gradient depth-layer-3 hover-lift">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2 text-holographic">
                              {article.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {article.author}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {article.date}
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                {article.views || 0} views
                              </div>
                            </div>
                            <p className="text-sm line-clamp-3 text-muted-foreground">
                              {article.content}
                            </p>
                            {article.image && (
                              <div className="mt-3">
                                <img 
                                  src={article.image} 
                                  alt={article.title}
                                  className="h-32 w-full object-cover rounded border"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // View article functionality could be added here
                                window.open(`/news/${article.id}`, '_blank');
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NewsManager;
