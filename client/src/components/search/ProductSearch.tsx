import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Search, Filter, X, ChevronDown, ChevronUp, Sparkles, DollarSign, MapPin, Package, Star } from 'lucide-react';
import { MenuItem } from '@/lib/data';

interface SearchFilters {
  query: string;
  category: string;
  priceRange: { min: number; max: number };
  condition: string;
  brand: string;
  location: string;
  inStock: boolean;
  tags: string[];
}

interface ProductSearchProps {
  products: MenuItem[];
  onFilteredProducts: (filtered: MenuItem[]) => void;
  className?: string;
}

const ProductSearch: React.FC<ProductSearchProps> = ({ products, onFilteredProducts, className = '' }) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: 'all',
    priceRange: { min: 0, max: 100000 },
    condition: 'all',
    brand: '',
    location: '',
    inStock: false,
    tags: []
  });

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [allLocations, setAllLocations] = useState<string[]>([]);

  // Extract unique values from products
  useEffect(() => {
    const tags = new Set<string>();
    const brands = new Set<string>();
    const locations = new Set<string>();

    products.forEach(product => {
      product.tags?.forEach(tag => tags.add(tag));
      if (product.brand) brands.add(product.brand);
      if (product.location) locations.add(product.location);
    });

    setAllTags(Array.from(tags).sort());
    setAllBrands(Array.from(brands).sort());
    setAllLocations(Array.from(locations).sort());
  }, [products]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['all', ...Array.from(cats).sort()];
  }, [products]);

  // Filter products based on all criteria
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Text search (name, description, brand, tags)
      const searchText = filters.query.toLowerCase();
      const matchesText = !filters.query || 
        product.name.toLowerCase().includes(searchText) ||
        product.description.toLowerCase().includes(searchText) ||
        product.brand?.toLowerCase().includes(searchText) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchText));

      // Category filter
      const matchesCategory = filters.category === 'all' || product.category === filters.category;

      // Price range filter
      const matchesPrice = product.price >= filters.priceRange.min && product.price <= filters.priceRange.max;

      // Condition filter
      const matchesCondition = filters.condition === 'all' || product.condition === filters.condition;

      // Brand filter
      const matchesBrand = !filters.brand || product.brand === filters.brand;

      // Location filter
      const matchesLocation = !filters.location || product.location === filters.location;

      // Stock filter
      const matchesStock = !filters.inStock || (product.stock !== undefined && product.stock > 0);

      // Tags filter
      const matchesTags = filters.tags.length === 0 || 
        filters.tags.every(tag => product.tags?.includes(tag));

      return matchesText && matchesCategory && matchesPrice && matchesCondition && 
             matchesBrand && matchesLocation && matchesStock && matchesTags;
    });
  }, [products, filters]);

  // Update parent component with filtered results
  useEffect(() => {
    onFilteredProducts(filteredProducts);
  }, [filteredProducts, onFilteredProducts]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: 'all',
      priceRange: { min: 0, max: 100000 },
      condition: 'all',
      brand: '',
      location: '',
      inStock: false,
      tags: []
    });
  };

  const toggleTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.category !== 'all') count++;
    if (filters.priceRange.min > 0 || filters.priceRange.max < 100000) count++;
    if (filters.condition !== 'all') count++;
    if (filters.brand) count++;
    if (filters.location) count++;
    if (filters.inStock) count++;
    if (filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  return (
    <Card className={`${className} border-0 shadow-xl bg-linear-to-br from-white/90 to-blue-50/90 backdrop-blur-lg`}>
      <CardContent className="p-8">
        <div className="space-y-6">
          {/* Header with icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-r from-blue-500 to-purple-600 text-white mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Discover Products
            </h2>
            <p className="text-muted-foreground text-sm">Find exactly what you're looking for</p>
          </div>

          {/* Main Search Bar */}
          <div className="relative group">
            <div className="absolute inset-0 bg-linear-to-r from-blue-500 to-purple-600 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
                <Input
                  placeholder="Search for products, brands, or tags..."
                  value={filters.query}
                  onChange={(e) => updateFilter('query', e.target.value)}
                  className="pl-12 h-14 text-base border-0 shadow-lg bg-white/80 backdrop-blur focus:ring-4 focus:ring-blue-500/20 transition-all"
                />
                {filters.query && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFilter('query', '')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className={`h-14 px-6 shadow-lg transition-all ${
                  isAdvancedOpen 
                    ? 'bg-linear-to-r from-blue-500 to-purple-600 text-white' 
                    : 'bg-white/80 backdrop-blur hover:bg-white text-gray-700'
                }`}
              >
                <Filter className="h-5 w-5 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 bg-linear-to-r from-orange-400 to-pink-500 text-white border-0">
                    {activeFiltersCount}
                  </Badge>
                )}
                {isAdvancedOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="h-14 px-6 shadow-lg bg-white/80 backdrop-blur hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleContent className="space-y-6">
              <div className="bg-white/60 backdrop-blur rounded-xl p-6 border border-white/20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Category Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold focus:border-blue-500 flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      Category
                    </label>
                    <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
                      <SelectTrigger className="h-12 bg-white/80 backdrop-blur border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat === 'all' ? 'All Categories' : cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold focus:border-blue-500 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Price Range (KSH)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.priceRange.min}
                        onChange={(e) => updateFilter('priceRange', { 
                          ...filters.priceRange, 
                          min: parseInt(e.target.value) || 0 
                        })}
                        className="h-12 bg-white/80 backdrop-blur border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.priceRange.max}
                        onChange={(e) => updateFilter('priceRange', { 
                          ...filters.priceRange, 
                          max: parseInt(e.target.value) || 100000 
                        })}
                        className="h-12 bg-white/80 backdrop-blur border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                      />
                    </div>
                  </div>

                  {/* Condition Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold focus:border-blue-500 flex items-center gap-2">
                      <Star className="h-4 w-4 text-purple-500" />
                      Condition
                    </label>
                    <Select value={filters.condition} onValueChange={(value) => updateFilter('condition', value)}>
                      <SelectTrigger className="h-12 bg-white/80 backdrop-blur border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20">
                        <SelectValue placeholder="All conditions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Conditions</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                        <SelectItem value="refurbished">Refurbished</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Brand Filter */}
                  {allBrands.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Brand</label>
                      <Select value={filters.brand} onValueChange={(value) => updateFilter('brand', value)}>
                        <SelectTrigger className="h-12 bg-white/80 backdrop-blur border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                          <SelectValue placeholder="All brands" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Brands</SelectItem>
                          {allBrands.map(brand => (
                            <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Location Filter */}
                  {allLocations.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-red-500" />
                        Location
                      </label>
                      <Select value={filters.location} onValueChange={(value) => updateFilter('location', value)}>
                        <SelectTrigger className="h-12 bg-white/80 backdrop-blur border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20">
                          <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Locations</SelectItem>
                          {allLocations.map(location => (
                            <SelectItem key={location} value={location}>{location}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* In Stock Filter */}
                  <div className="flex items-center space-x-3 bg-white/60 backdrop-blur rounded-lg p-4 border border-gray-200">
                    <input
                      type="checkbox"
                      id="inStock"
                      checked={filters.inStock}
                      onChange={(e) => updateFilter('inStock', e.target.checked)}
                      className="rounded text-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <label htmlFor="inStock" className="text-sm font-medium focus:border-blue-500 cursor-pointer">
                      In Stock Only
                    </label>
                  </div>
                </div>

                {/* Tags Filter */}
                {allTags.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700">Popular Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => (
                        <Badge
                          key={tag}
                          variant={filters.tags.includes(tag) ? "default" : "outline"}
                          className={`cursor-pointer transition-all ${
                            filters.tags.includes(tag)
                              ? 'bg-linear-to-r from-blue-500 to-purple-600 text-white border-0 hover:shadow-lg'
                              : 'bg-white/80 backdrop-blur border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Results Summary */}
          <div className="flex items-center justify-between p-4 bg-linear-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-xs font-medium text-gray-700">
                <span className="text-base font-bold text-blue-600">{filteredProducts.length}</span>
                <span className="text-gray-500"> of </span>
                <span className="text-base font-bold text-purple-600">{products.length}</span>
                <span className="text-gray-500"> products found</span>
              </span>
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-xs text-gray-500 italic">
                Try adjusting your filters or search terms
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductSearch;
