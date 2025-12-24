import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Navigation, Search, X } from 'lucide-react';

interface OrderLocation {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  instructions?: string;
}

interface LocationPickerProps {
  onLocationSelect: (location: OrderLocation) => void;
  initialLocation?: OrderLocation;
  placeholder?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function LocationPicker({ 
  onLocationSelect, 
  initialLocation,
  placeholder = "Enter delivery address" 
}: LocationPickerProps) {
  const [location, setLocation] = useState<OrderLocation | null>(initialLocation || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [instructions, setInstructions] = useState(initialLocation?.instructions || '');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    if (window.google) {
      setIsScriptLoaded(true);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log('LocationPicker: Checking API key...', { 
      hasApiKey: !!apiKey, 
      apiKeyLength: apiKey?.length,
      envVars: Object.keys(import.meta.env).filter(k => k.includes('GOOGLE') || k.includes('MAP'))
    });
    
    if (!apiKey) {
      setError('Google Maps API key is not configured. Please contact support.');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('LocationPicker: Google Maps script loaded successfully');
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      setError('Failed to load Google Maps. Please check your internet connection.');
      console.error('Google Maps script failed to load');
    };
    script.onabort = () => {
      setError('Google Maps loading was interrupted.');
      console.warn('Google Maps script loading was aborted');
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize map when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !mapRef.current) return;

    console.log('LocationPicker: Initializing map...', { isScriptLoaded, mapRef: !!mapRef.current });

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: -1.2921, lng: 36.8219 }, // Nairobi, Kenya
      zoom: 13,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    });

    console.log('LocationPicker: Map created successfully');
    mapInstanceRef.current = map;

    // Add initial location marker if provided
    if (initialLocation) {
      const position = { lat: initialLocation.latitude, lng: initialLocation.longitude };
      map.setCenter(position);
      addMarker(position);
    }

    // Handle map clicks
    map.addListener('click', (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      handleLocationSelect(lat, lng);
    });
  }, [isScriptLoaded, initialLocation]);

  const addMarker = (position: { lat: number; lng: number }) => {
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    const marker = new window.google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      title: 'Delivery Location',
      animation: window.google.maps.Animation.DROP
    });

    markerRef.current = marker;
  };

  const handleLocationSelect = async (lat: number, lng: number, address?: string) => {
    setLoading(true);
    setError('');

    try {
      let finalAddress = address;

      // If no address provided, reverse geocode
      if (!address && window.google) {
        const geocoder = new window.google.maps.Geocoder();
        const result = await new Promise((resolve, reject) => {
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
            if (status === 'OK' && results[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('Address not found'));
            }
          });
        });

        finalAddress = (result as any).formatted_address;
      }

      const newLocation: OrderLocation = {
        address: finalAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        latitude: lat,
        longitude: lng,
        instructions: instructions || undefined
      };

      setLocation(newLocation);
      onLocationSelect(newLocation);

      // Update map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat, lng });
        addMarker({ lat, lng });
      }
    } catch (err) {
      setError('Failed to get address for this location');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !window.google) return;

    setLoading(true);
    setError('');

    try {
      const placesService = new window.google.maps.places.PlacesService(mapInstanceRef.current);
      
      const request = {
        query: searchQuery,
        fields: ['name', 'geometry', 'formatted_address', 'place_id']
      };

      placesService.textSearch(request, (results: any[], status: string) => {
        if (status === 'OK' && results) {
          setSearchResults(results.slice(0, 5));
        } else {
          setError('No results found');
        }
        setLoading(false);
      });
    } catch (err) {
      setError('Search failed');
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleLocationSelect(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Failed to get your location');
        setLoading(false);
      }
    );
  };

  const handleResultClick = (result: any) => {
    const lat = result.geometry.location.lat();
    const lng = result.geometry.location.lng();
    const address = result.formatted_address;
    const placeId = result.place_id;

    const newLocation: OrderLocation = {
      address,
      latitude: lat,
      longitude: lng,
      placeId,
      instructions: instructions || undefined
    };

    setLocation(newLocation);
    onLocationSelect(newLocation);
    setSearchResults([]);

    // Update map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat, lng });
      addMarker({ lat, lng });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Delivery Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading} size="sm">
            Search
          </Button>
          <Button
            onClick={handleGetCurrentLocation}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border rounded-lg max-h-40 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                onClick={() => handleResultClick(result)}
              >
                <div className="font-medium text-sm">{result.name}</div>
                <div className="text-xs text-muted-foreground">{result.formatted_address}</div>
              </div>
            ))}
          </div>
        )}

        {/* Map */}
        <div
          ref={mapRef}
          className="w-full h-64 rounded-lg border bg-muted"
          style={{ display: isScriptLoaded ? 'block' : 'none' }}
        />

        {!isScriptLoaded && (
          <div className="w-full h-64 rounded-lg border bg-muted flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}

        {/* Selected Location */}
        {location && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <MapPin className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{location.address}</p>
                <p className="text-xs text-muted-foreground">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setLocation(null);
                  onLocationSelect(null as any);
                  if (markerRef.current) {
                    markerRef.current.setMap(null);
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              placeholder="Delivery instructions (optional)"
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value);
                if (location) {
                  const updatedLocation = { ...location, instructions: e.target.value };
                  setLocation(updatedLocation);
                  onLocationSelect(updatedLocation);
                }
              }}
              className="min-h-20"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground">
          <p>• Search for an address or click on the map to select location</p>
          <p>• Use the location button for your current position</p>
          <p>• Add delivery instructions for the driver</p>
        </div>
      </CardContent>
    </Card>
  );
}
