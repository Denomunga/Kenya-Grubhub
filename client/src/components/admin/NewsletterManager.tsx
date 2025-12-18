import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, 
  Send, 
  Users, 
  BarChart3, 
  TrendingUp,
  Target,
  Megaphone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewsletterStats {
  totalSubscribers: number;
  subscribersByPreference: {
    specialOffers: number;
    newProducts: number;
    events: number;
    news: number;
  };
}

interface Subscriber {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  preferences: {
    specialOffers: boolean;
    newProducts: boolean;
    events: boolean;
    news: boolean;
  };
}

const NewsletterManager: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [campaignType, setCampaignType] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    fetchStats();
    fetchSubscribers();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/newsletter/stats', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch newsletter stats:', error);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const response = await fetch('/api/admin/newsletter/subscribers?limit=20', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setSubscribers(data.data.subscribers);
      }
    } catch (error) {
      console.error('Failed to fetch subscribers:', error);
    }
  };

  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignType || !subject || !content) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: campaignType,
          subject,
          content,
          imageUrl: imageUrl || undefined,
          linkUrl: linkUrl || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Newsletter Sent!",
          description: `Successfully sent to ${stats?.subscribersByPreference[campaignType as keyof typeof stats.subscribersByPreference] || 0} subscribers`,
        });
        
        // Reset form
        setCampaignType('');
        setSubject('');
        setContent('');
        setImageUrl('');
        setLinkUrl('');
      } else {
        toast({
          title: "Failed to Send",
          description: data.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send newsletter",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTargetAudienceCount = () => {
    if (!stats || !campaignType) return 0;
    return stats.subscribersByPreference[campaignType as keyof typeof stats.subscribersByPreference] || 0;
  };

  const campaignExamples = [
    {
      type: 'specialOffers',
      title: 'Special Offers',
      description: 'Promotions, discounts, and sales events',
      icon: <Target className="h-4 w-4" />,
      color: 'bg-red-100 text-red-800 border-red-200',
      example: {
        subject: '🔥 Flash Sale: 30% Off All Denim Collection!',
        content: 'This weekend only, get 30% off our entire denim collection. From classic jeans to stylish jackets - find your perfect fit!',
      }
    },
    {
      type: 'newProducts',
      title: 'New Products',
      description: 'Latest arrivals and new collections',
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      example: {
        subject: '✨ New Arrival: African-Inspired Summer Collection',
        content: 'Discover our new summer collection featuring vibrant African prints and modern designs. Limited quantities available!',
      }
    },
    {
      type: 'events',
      title: 'Events',
      description: 'Fashion shows, pop-ups, and special events',
      icon: <Megaphone className="h-4 w-4" />,
      color: 'bg-green-100 text-green-800 border-green-200',
      example: {
        subject: '🎪 You\'re Invited: Summer Fashion Showcase',
        content: 'Join us for an exclusive fashion showcase featuring our latest collection. Drinks, music, and style - Saturday at 6 PM!',
      }
    },
    {
      type: 'news',
      title: 'News & Updates',
      description: 'Company news, fashion tips, and updates',
      icon: <Mail className="h-4 w-4" />,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      example: {
        subject: '📰 WATHII Featured in Nairobi Fashion Weekly',
        content: 'We\'re excited to announce that WATHII has been featured in Nairobi Fashion Weekly! Read about our journey and mission.',
      }
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Newsletter Manager</h2>
          <p className="text-muted-foreground">
            Send targeted notifications to subscribers based on their preferences
          </p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <BarChart3 className="h-4 w-4 mr-2" />
          Refresh Stats
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Subscribers</p>
                  <p className="text-2xl font-bold">{stats.totalSubscribers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {campaignExamples.map((campaign) => (
            <Card key={campaign.type}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${campaign.color}`}>
                    {campaign.icon}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">{campaign.title}</p>
                    <p className="text-2xl font-bold">
                      {stats.subscribersByPreference[campaign.type as keyof typeof stats.subscribersByPreference] || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">Send Campaign</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
        </TabsList>

        {/* Send Campaign Tab */}
        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Newsletter Campaign</CardTitle>
              <CardDescription>
                Send targeted emails to subscribers based on their preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendNewsletter} className="space-y-6">
                {/* Campaign Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Campaign Type *</Label>
                  <Select value={campaignType} onValueChange={setCampaignType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign type" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignExamples.map((campaign) => (
                        <SelectItem key={campaign.type} value={campaign.type}>
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${campaign.color}`}>
                              {campaign.icon}
                            </div>
                            <div>
                              <div className="font-medium">{campaign.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {campaign.description}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {campaignType && (
                    <p className="text-sm text-muted-foreground">
                      Will send to {getTargetAudienceCount()} subscribers who opted in for {campaignExamples.find(c => c.type === campaignType)?.title.toLowerCase()}
                    </p>
                  )}
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject"
                    required
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your email content..."
                    rows={6}
                    required
                  />
                </div>

                {/* Optional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                    <Input
                      id="imageUrl"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkUrl">Link URL (Optional)</Label>
                    <Input
                      id="linkUrl"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com/learn-more"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={isLoading || !campaignType || !subject || !content}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to {getTargetAudienceCount()} Subscribers
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Subscribers</CardTitle>
              <CardDescription>
                View and manage your newsletter subscribers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscribers.map((subscriber) => (
                  <div key={subscriber.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{subscriber.email}</span>
                        <Badge variant={subscriber.isActive ? "default" : "secondary"}>
                          {subscriber.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {Object.entries(subscriber.preferences).map(([key, value]) => (
                          value && (
                            <Badge key={key} variant="outline" className="text-xs">
                              {campaignExamples.find(c => c.type === key)?.title}
                            </Badge>
                          )
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(subscriber.subscribedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaignExamples.map((campaign) => (
              <Card key={campaign.type} className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      setCampaignType(campaign.type);
                      setSubject(campaign.example.subject);
                      setContent(campaign.example.content);
                    }}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${campaign.color}`}>
                      {campaign.icon}
                    </div>
                    <CardTitle className="text-lg">{campaign.title}</CardTitle>
                  </div>
                  <CardDescription>{campaign.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Example Subject:</p>
                      <p className="text-sm">{campaign.example.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Example Content:</p>
                      <p className="text-sm line-clamp-3">{campaign.example.content}</p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      Use This Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NewsletterManager;
