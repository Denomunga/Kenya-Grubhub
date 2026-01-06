import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, X, ChevronDown, ChevronUp, Sparkles, DollarSign, MapPin, Package, Star, Loader2 } from 'lucide-react';
import { MenuItem } from '@/lib/data';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchFilters {
  query: string;
  category: string;
  priceRange: { min: number; max: number };
  condition: string;
  brand: string;
  location: string;
  inStock: boolean;
  tags: string[];
  sortBy: string;
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
    priceRange: { min: 0, max: 1000000000 },
    condition: 'all',
    brand: '',
    location: '',
    inStock: false,
    tags: [],
    sortBy: 'relevance'
  });

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [allLocations, setAllLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedQuery = useDebounce(filters.query, 300);

  // Load filters and history from localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem('productSearchFilters');
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch (e) {
        console.error('Failed to parse saved filters', e);
      }
    }
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse search history', e);
      }
    }
  }, []);

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem('productSearchFilters', JSON.stringify(filters));
  }, [filters]);

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

  // Get search suggestions
  const suggestions = useMemo(() => {
    if (!debouncedQuery.trim()) return searchHistory.slice(0, 5);
    const query = debouncedQuery.toLowerCase();
    const matches = new Set<string>();
    products.forEach(product => {
      if (product.name.toLowerCase().includes(query)) matches.add(product.name);
      if (product.brand && product.brand.toLowerCase().includes(query)) matches.add(product.brand);
      product.tags?.forEach(tag => {
        if (tag.toLowerCase().includes(query)) matches.add(tag);
      });
    });
    return Array.from(matches).slice(0, 5);
  }, [debouncedQuery, products, searchHistory]);

  // Filter products based on all criteria
  const filteredProducts = useMemo(() => {
    setIsLoading(true);
    const result = products.filter(product => {
      // Text search (name, description, brand, tags)
      const searchText = debouncedQuery.toLowerCase();
      const matchesText = !debouncedQuery || 
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
    // Sort results
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'relevance':
        default:
          // For relevance, prioritize exact matches
          const aScore = (a.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ? 2 : 0) +
                         (a.brand?.toLowerCase().includes(debouncedQuery.toLowerCase()) ? 1 : 0);
          const bScore = (b.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ? 2 : 0) +
                         (b.brand?.toLowerCase().includes(debouncedQuery.toLowerCase()) ? 1 : 0);
          return bScore - aScore;
      }
    });
    setTimeout(() => setIsLoading(false), 100); // Simulate async
    return result;
  }, [products, debouncedQuery, filters]);

  // Update parent component with filtered results
  useEffect(() => {
    onFilteredProducts(filteredProducts);
  }, [filteredProducts, onFilteredProducts]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (key === 'query' && value.trim() && !searchHistory.includes(value.trim())) {
      const newHistory = [value.trim(), ...searchHistory.slice(0, 4)];
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: 'all',
      priceRange: { min: 0, max: 1000000000 },
      condition: 'all',
      brand: '',
      location: '',
      inStock: false,
      tags: [],
      sortBy: 'relevance'
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
    if (filters.priceRange.min > 0 || filters.priceRange.max < 1000000000) count++;
    if (filters.condition !== 'all') count++;
    if (filters.brand) count++;
    if (filters.location) count++;
    if (filters.inStock) count++;
    if (filters.tags.length > 0) count++;
    if (filters.sortBy !== 'relevance') count++;
    return count;
  }, [filters]);

  return (
    <Card className={`${className} border-0 shadow-xl bg-linear-to-br from-white/90 to-blue-50/90 backdrop-blur-lg`}>
      <CardContent className="p-8">
        <div className="space-y-6">
          {/* Header with icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-r from-blue-500 to-purple-600 text-white mb-3">
              <Sparkles className="h-4 w-4" />
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
                <Popover open={showSuggestions && suggestions.length > 0} onOpenChange={setShowSuggestions}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 h-4 w-4" />
                      <Input
                        placeholder="Search for products, brands, or tags..."
                        value={filters.query}
                        onChange={(e) => {
                          updateFilter('query', e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        className="pl-12 h-10 text-base border-0 shadow-lg bg-white/80 backdrop-blur focus:ring-4 focus:ring-blue-500/20 transition-all"
                        aria-label="Search products"
                      />
                      {isLoading && <Loader2 className="absolute right-12 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />}
                      {filters.query && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateFilter('query', '')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="max-h-48 overflow-y-auto">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          onClick={() => {
                            updateFilter('query', suggestion);
                            setShowSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className={`h-10 px-4 shadow-lg transition-all ${
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
                  className="h-10 px-4 shadow-lg bg-white/80 backdrop-blur hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Sort and Filters Row */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
                <SelectTrigger className="w-40 h-8 bg-white/80 backdrop-blur border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
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
                      <SelectTrigger className="h-10 bg-white/80 backdrop-blur border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" aria-label="Select category">
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
                    <div className="px-3">
                      <Slider
                        value={[filters.priceRange.min, filters.priceRange.max]}
                        onValueChange={(value) => updateFilter('priceRange', { min: value[0], max: value[1] })}
                        max={1000000}
                        min={0}
                        step={100}
                        className="w-full"
                        aria-label="Price range slider"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>KSH {filters.priceRange.min.toLocaleString()}</span>
                        <span>KSH {filters.priceRange.max.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Condition Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold focus:border-blue-500 flex items-center gap-2">
                      <Star className="h-4 w-4 text-purple-500" />
                      Condition
                    </label>
                    <Select value={filters.condition} onValueChange={(value) => updateFilter('condition', value)}>
                      <SelectTrigger className="h-10 bg-white/80 backdrop-blur border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20">
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
                        <SelectTrigger className="h-10 bg-white/80 backdrop-blur border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                          <SelectValue placeholder="All brands" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Brands</SelectItem>
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
                        <SelectTrigger className="h-10 bg-white/80 backdrop-blur border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20">
                          <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
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
                {isLoading ? (
                  'Searching...'
                ) : (
                  <>
                    <span className="text-base font-bold text-blue-600">{filteredProducts.length}</span>
                    <span className="text-gray-500"> of </span>
                    <span className="text-base font-bold text-purple-600">{products.length}</span>
                    <span className="text-gray-500"> products found</span>
                  </>
                )}
              </span>
            </div>
            {filteredProducts.length === 0 && !isLoading && (
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
