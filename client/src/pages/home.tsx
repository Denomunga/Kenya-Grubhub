import React from "react";
import { Link } from "wouter";
import { useData } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Star, Clock } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@assets/generated_images/modern_upscale_kenyan_restaurant_interior.png";

export default function Home() {
  const { menu, news, reviews } = useData();
  const featuredItems = menu.slice(0, 3);

  return (
    <div className="flex flex-col gap-0">
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Kenyan Bistro Interior" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        
        <div className="container relative z-10 px-4 text-center text-white max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-6 bg-accent text-accent-foreground hover:bg-accent/90 text-md py-1 px-4 border-none">
              #1 Authentic Kenyan Cuisine
            </Badge>
            <h1 className="text-5xl md:text-7xl font-heading font-bold mb-6 leading-tight">
              Taste the Soul of <br/> <span className="text-accent">Nairobi</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 font-light">
              Experience traditional flavors elevated with modern culinary techniques. 
              From sizzling Nyama Choma to comforting Ugali.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/menu">
                <Button size="lg" className="text-lg h-14 px-8 bg-primary hover:bg-primary/90 border-none">
                  View Menu
                </Button>
              </Link>
              <Link href="/chat">
                <Button size="lg" variant="outline" className="text-lg h-14 px-8 bg-white/10 hover:bg-white/20 text-white border-white/40 backdrop-blur-md">
                  Book a Table
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Menu */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-heading font-bold mb-4 text-primary">Chef's Favorites</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Hand-picked dishes that define our culinary identity. Prepared fresh daily using locally sourced ingredients.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredItems.map((item, index) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group h-full">
                  <div className="h-64 overflow-hidden relative">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-primary font-bold px-4 py-1 rounded-full shadow-sm">
                      {item.price} KSHS
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold font-heading">{item.name}</h3>
                    </div>
                    <p className="text-muted-foreground mb-6 line-clamp-2">{item.description}</p>
                    <Link href="/menu">
                      <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
                        Order Now <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link href="/menu">
              <Button variant="link" className="text-primary text-lg">
                View Full Menu <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* News & Events */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-2 text-primary">Latest News</h2>
              <p className="text-muted-foreground">Updates from our kitchen and community</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {news.map((item) => (
              <Card key={item.id} className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3">
                    <Clock className="h-4 w-4" />
                    {item.date}
                  </div>
                  <h3 className="text-2xl font-bold mb-3 font-heading">{item.title}</h3>
                  <p className="text-muted-foreground mb-4">{item.content}</p>
                  <span className="text-sm text-muted-foreground font-medium">Posted by {item.author}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Location & Info */}
      <section className="py-0 grid md:grid-cols-2 min-h-[500px]">
        <div className="bg-primary text-primary-foreground p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <h2 className="text-4xl font-heading font-bold mb-8">Visit Us</h2>
            
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="bg-white/10 p-3 rounded-full h-fit">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-1">Westlands Location</h3>
                  <p className="text-primary-foreground/80">123 Mpaka Road, Westlands</p>
                  <p className="text-primary-foreground/80">Nairobi, Kenya</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-white/10 p-3 rounded-full h-fit">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-1">Opening Hours</h3>
                  <p className="text-primary-foreground/80">Monday - Friday: 11am - 10pm</p>
                  <p className="text-primary-foreground/80">Weekends: 10am - 11pm</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-muted relative h-[500px] md:h-auto">
          {/* Mock Map */}
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-primary mx-auto mb-2 animate-bounce" />
              <p className="text-muted-foreground font-bold">Interactive Map Loading...</p>
              <div className="w-full h-full absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Nairobi_OpenStreetMap.png')] bg-cover bg-center mix-blend-multiply"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
