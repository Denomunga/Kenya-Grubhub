import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Phone, Mail, Building, Save, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import LocationPicker from '@/components/ui/LocationPicker';
import { API_BASE_URL } from '@/lib/api';

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

export default function BusinessLocationManager() {
  const { toast } = useToast();
  const [location, setLocation] = useState<BusinessLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: -1.2921, // Default Nairobi coordinates
    longitude: 36.8219,
    phone: '',
    email: '',
    description: '',
    openingHours: {
      monday: '11am - 10pm',
      tuesday: '11am - 10pm',
      wednesday: '11am - 10pm',
      thursday: '11am - 10pm',
      friday: '11am - 10pm',
      saturday: '10am - 11pm',
      sunday: '10am - 11pm'
    }
  });

  useEffect(() => {
    fetchBusinessLocation();
  }, []);

  const fetchBusinessLocation = async () => {
    try {
      // Get JWT token from localStorage for API authentication
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/business-location`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response data');
        }
        setLocation(data);
        setFormData({
          name: data.name || '',
          address: data.address || '',
          latitude: data.latitude || -1.2921,
          longitude: data.longitude || 36.8219,
          phone: data.phone || '',
          email: data.email || '',
          description: data.description || '',
          openingHours: {
            monday: data.openingHours?.monday || '11am - 10pm',
            tuesday: data.openingHours?.tuesday || '11am - 10pm',
            wednesday: data.openingHours?.wednesday || '11am - 10pm',
            thursday: data.openingHours?.thursday || '11am - 10pm',
            friday: data.openingHours?.friday || '11am - 10pm',
            saturday: data.openingHours?.saturday || '10am - 11pm',
            sunday: data.openingHours?.sunday || '10am - 11pm'
          }
        });
      } else if (response.status === 404) {
        // No location set yet, that's okay
        setLocation(null);
      }
    } catch (error) {
      console.error('Failed to fetch business location:', error);
      toast({
        title: "Error",
        description: "Failed to load business location",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (selectedLocation: any) => {
    setFormData(prev => ({
      ...prev,
      address: selectedLocation.address,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      placeId: selectedLocation.placeId
    }));
    setLocationDialogOpen(false);
  };

  const validateFormData = () => {
    const errors: string[] = [];
    
    // Sanitize and validate name
    if (!formData.name || formData.name.trim().length < 2) {
      errors.push('Business name must be at least 2 characters');
    }
    
    // Sanitize and validate address
    if (!formData.address || formData.address.trim().length < 5) {
      errors.push('Address must be at least 5 characters');
    }
    
    // Validate email format if provided
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.push('Please enter a valid email address');
      }
    }
    
    // Validate phone format if provided
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errors.push('Please enter a valid phone number');
      }
    }
    
    // Validate coordinates
    if (isNaN(formData.latitude) || formData.latitude < -90 || formData.latitude > 90) {
      errors.push('Invalid latitude value');
    }
    
    if (isNaN(formData.longitude) || formData.longitude < -180 || formData.longitude > 180) {
      errors.push('Invalid longitude value');
    }
    
    return errors;
  };

  const sanitizeInput = (input: string) => {
    return input.trim().replace(/[<>"'&]/g, '');
  };

  const handleSave = async () => {
    const errors = validateFormData();
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors[0],
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const method = location ? 'PATCH' : 'POST';
      const url = location ? `${API_BASE_URL}/api/business-location/${location.id}` : `${API_BASE_URL}/api/business-location`;
      
      // Get JWT token from localStorage for API authentication
      const token = localStorage.getItem('token');
      const sanitizedData = {
        ...formData,
        name: sanitizeInput(formData.name),
        address: sanitizeInput(formData.address),
        phone: sanitizeInput(formData.phone),
        email: sanitizeInput(formData.email),
        description: sanitizeInput(formData.description),
        openingHours: Object.fromEntries(
          Object.entries(formData.openingHours).map(([day, hours]) => [day, sanitizeInput(hours)])
        )
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData)
      });

      if (response.ok) {
        const savedLocation = await response.json();
        if (!savedLocation || typeof savedLocation !== 'object') {
          throw new Error('Invalid response data');
        }
        setLocation(savedLocation);
        setIsEditing(false);
        toast({
          title: "Success",
          description: `Business location ${location ? 'updated' : 'saved'} successfully`
        });
      } else {
        const errorText = await response.text();
        let errorMessage = 'Failed to save location';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Failed to save business location:', error);
      toast({
        title: "Error",
        description: "Failed to save business location",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOpeningHoursChange = (day: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading business location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-6 w-6" />
            Business Location
          </h2>
          <p className="text-muted-foreground">
            Manage your business location information displayed on the homepage
          </p>
        </div>
        {location && !isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Location
          </Button>
        )}
      </div>

      {location && !isEditing ? (
        // View Mode
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {location.name}
            </CardTitle>
            <Badge className="w-fit">
              {location.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Address</h3>
              <p className="text-muted-foreground">{location.address}</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span>Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
              </div>
            </div>

            {(location.phone || location.email) && (
              <div>
                <h3 className="font-medium mb-2">Contact Information</h3>
                {location.phone && (
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4" />
                    <span>{location.phone}</span>
                  </div>
                )}
                {location.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{location.email}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <h3 className="font-medium mb-2">Opening Hours</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(location.openingHours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="capitalize">{day}:</span>
                    <span className="text-muted-foreground">{hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {location.description && (
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">{location.description}</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button 
                onClick={() => {
                  const safeLat = encodeURIComponent(location.latitude.toString());
                  const safeLng = encodeURIComponent(location.longitude.toString());
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${safeLat},${safeLng}`, '_blank', 'noopener,noreferrer');
                }}
                className="w-full"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Edit Mode
        <Card>
          <CardHeader>
            <CardTitle>
              {location ? 'Edit Business Location' : 'Set Business Location'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter business name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your business location"
                rows={3}
              />
            </div>

            <div>
              <Label>Address</Label>
              <div className="space-y-2">
                <Input
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter address or select from map"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocationDialogOpen(true)}
                  className="w-full"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Select Location on Map
                </Button>
              </div>
            </div>

            <div>
              <Label>Opening Hours</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(formData.openingHours).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-2">
                    <Label className="capitalize min-w-20">{day}:</Label>
                    <Input
                      value={hours}
                      onChange={(e) => handleOpeningHoursChange(day, e.target.value)}
                      placeholder="e.g., 9am - 5pm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Location'}
              </Button>
              {location && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    if (location) {
                      setFormData({
                        name: location.name,
                        address: location.address,
                        latitude: location.latitude,
                        longitude: location.longitude,
                        phone: location.phone || '',
                        email: location.email || '',
                        description: location.description || '',
                        openingHours: {
                          monday: location.openingHours.monday || '11am - 10pm',
                          tuesday: location.openingHours.tuesday || '11am - 10pm',
                          wednesday: location.openingHours.wednesday || '11am - 10pm',
                          thursday: location.openingHours.thursday || '11am - 10pm',
                          friday: location.openingHours.friday || '11am - 10pm',
                          saturday: location.openingHours.saturday || '10am - 11pm',
                          sunday: location.openingHours.sunday || '10am - 11pm'
                        }
                      });
                    }
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Picker Dialog */}
      {locationDialogOpen && (
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          initialLocation={{
            address: formData.address,
            latitude: formData.latitude,
            longitude: formData.longitude
          }}
          placeholder="Search for business address..."
        />
      )}
    </div>
  );
}
