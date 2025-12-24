import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Navigation, Clock, Phone, Mail, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BusinessLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  phone?: string;
  email?: string;
  openingHours: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  description?: string;
  isActive: boolean;
}

export default function InteractiveMap() {
  const { toast } = useToast();
  const [location, setLocation] = useState<BusinessLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    fetchBusinessLocation();
  }, []);

  const fetchBusinessLocation = async () => {
    try {
      const response = await fetch('/api/business-location');
      if (response.ok) {
        const data = await response.json();
        setLocation(data);
      } else if (response.status === 404) {
        // No location set yet
        setMapError('Business location not set. Please contact administrator.');
      }
    } catch (error) {
      console.error('Failed to fetch business location:', error);
      setMapError('Failed to load business location');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGoogleMaps = () => {
    return new Promise<void>((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        reject(new Error('Google Maps API key not configured'));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      window.initGoogleMaps = () => {
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };

      document.head.appendChild(script);
    });
  };

  const initializeMap = async () => {
    if (!location || !mapRef.current) return;

    try {
      setMapLoading(true);
      setMapError(null);

      await loadGoogleMaps();

      const mapOptions = {
        center: { lat: location.latitude, lng: location.longitude },
        zoom: 16,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      };

      const map = new window.google.maps.Map(mapRef.current, mapOptions);
      mapInstanceRef.current = map;

      // Add marker for business location
      const marker = new window.google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: map,
        title: location.name,
        animation: window.google.maps.Animation.DROP
      });

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; max-width: 250px;">
            <h3 style="margin: 0 0 10px 0; font-weight: bold;">${location.name}</h3>
            <p style="margin: 0 0 10px 0; color: #666;">${location.address}</p>
            ${location.phone ? `<p style="margin: 0 0 5px 0;"><strong>Phone:</strong> ${location.phone}</p>` : ''}
            ${location.email ? `<p style="margin: 0 0 5px 0;"><strong>Email:</strong> ${location.email}</p>` : ''}
            <button 
              onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}', '_blank')"
              style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;"
            >
              Get Directions
            </button>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      setMapLoading(false);
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError('Failed to load Google Maps. Please check your internet connection.');
      setMapLoading(false);
    }
  };

  useEffect(() => {
    if (location && mapRef.current) {
      initializeMap();
    }
  }, [location]);

  const handleGetDirections = () => {
    if (location) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`, '_blank');
    }
  };

  const handleCallBusiness = () => {
    if (location?.phone) {
      window.open(`tel:${location.phone}`, '_self');
    } else {
      toast({
        title: "No Phone Number",
        description: "Business phone number is not available",
        variant: "destructive"
      });
    }
  };

  const handleEmailBusiness = () => {
    if (location?.email) {
      window.open(`mailto:${location.email}`, '_blank');
    } else {
      toast({
        title: "No Email Address",
        description: "Business email address is not available",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading business location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Map Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            <div 
              ref={mapRef} 
              className="w-full h-[400px] md:h-[500px] bg-muted"
            />
            
            {mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading map...</p>
                </div>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="text-center p-6 max-w-md">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Map Unavailable</h3>
                  <p className="text-muted-foreground mb-4">{mapError}</p>
                  {location && (
                    <div className="space-y-2">
                      <Button onClick={handleGetDirections} className="w-full">
                        <Navigation className="h-4 w-4 mr-2" />
                        Get Directions
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map Controls Overlay */}
            {location && !mapLoading && !mapError && (
              <div className="absolute bottom-4 right-4 space-y-2">
                <Button
                  size="sm"
                  onClick={handleGetDirections}
                  className="bg-white text-black hover:bg-gray-100 shadow-lg"
                >
                  <Navigation className="h-4 w-4 mr-1" />
                  Directions
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      {location && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {location.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Address</h4>
                  <p className="text-muted-foreground">{location.address}</p>
                </div>

                {(location.phone || location.email) && (
                  <div>
                    <h4 className="font-medium mb-2">Contact</h4>
                    <div className="space-y-2">
                      {location.phone && (
                        <Button
                          variant="outline"
                          onClick={handleCallBusiness}
                          className="w-full justify-start"
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          {location.phone}
                        </Button>
                      )}
                      {location.email && (
                        <Button
                          variant="outline"
                          onClick={handleEmailBusiness}
                          className="w-full justify-start"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          {location.email}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {location.description && (
                  <div>
                    <h4 className="font-medium mb-2">About</h4>
                    <p className="text-muted-foreground">{location.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Opening Hours */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Opening Hours
              </h3>
              
              <div className="space-y-2">
                {Object.entries(location.openingHours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between items-center py-1">
                    <span className="capitalize font-medium">{day}</span>
                    <span className="text-muted-foreground">{hours}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      {location && (
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleGetDirections} className="flex-1">
            <Navigation className="h-4 w-4 mr-2" />
            Get Directions
          </Button>
          {location.phone && (
            <Button variant="outline" onClick={handleCallBusiness} className="flex-1">
              <Phone className="h-4 w-4 mr-2" />
              Call Us
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Google Maps
          </Button>
        </div>
      )}
    </div>
  );
}

// Add TypeScript declaration for Google Maps
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}
