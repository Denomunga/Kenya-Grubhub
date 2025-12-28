import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
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
    <Card className={`${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Main Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products by name, description, brand, or tags..."
                value={filters.query}
                onChange={(e) => updateFilter('query', e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
              {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
                    <SelectTrigger>
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
                <div>
                  <label className="text-sm font-medium mb-2 block">Price Range (KSH)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.priceRange.min}
                      onChange={(e) => updateFilter('priceRange', { 
                        ...filters.priceRange, 
                        min: parseInt(e.target.value) || 0 
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.priceRange.max}
                      onChange={(e) => updateFilter('priceRange', { 
                        ...filters.priceRange, 
                        max: parseInt(e.target.value) || 100000 
                      })}
                    />
                  </div>
                </div>

                {/* Condition Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Condition</label>
                  <Select value={filters.condition} onValueChange={(value) => updateFilter('condition', value)}>
                    <SelectTrigger>
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
                  <div>
                    <label className="text-sm font-medium mb-2 block">Brand</label>
                    <Select value={filters.brand} onValueChange={(value) => updateFilter('brand', value)}>
                      <SelectTrigger>
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
                  <div>
                    <label className="text-sm font-medium mb-2 block">Location</label>
                    <Select value={filters.location} onValueChange={(value) => updateFilter('location', value)}>
                      <SelectTrigger>
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
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="inStock"
                    checked={filters.inStock}
                    onChange={(e) => updateFilter('inStock', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="inStock" className="text-sm font-medium">
                    In Stock Only
                  </label>
                </div>
              </div>

              {/* Tags Filter */}
              {allTags.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={filters.tags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Results Summary */}
          <div className="text-sm text-muted-foreground">
            {filteredProducts.length} of {products.length} products found
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductSearch;
