import { Button } from "@/components/ui/button";
import { Coffee, Utensils, Laptop, Car, Home, Shirt, Package } from "lucide-react";

const productCategories = [
  { id: 'all', name: 'All', icon: <Package className="w-4 h-4 mr-2" /> },
  { id: 'food', name: 'Food', icon: <Utensils className="w-4 h-4 mr-2" /> },
  { id: 'electronics', name: 'Electronics', icon: <Laptop className="w-4 h-4 mr-2" /> },
  { id: 'vehicles', name: 'Vehicles', icon: <Car className="w-4 h-4 mr-2" /> },
  { id: 'real estate', name: 'Real Estate', icon: <Home className="w-4 h-4 mr-2" /> },
  { id: 'fashion', name: 'Fashion', icon: <Shirt className="w-4 h-4 mr-2" /> },
  { id: 'furniture', name: 'Furniture', icon: <Coffee className="w-4 h-4 mr-2" /> },
  { id: 'other', name: 'Other', icon: <Package className="w-4 h-4 mr-2" /> },
];

interface CategoryFilterProps {
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const CategoryFilter = ({ activeCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="mb-12">
      <div className="flex flex-wrap gap-2 justify-center">
        {productCategories.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? 'default' : 'outline'}
            onClick={() => onCategoryChange(category.id)}
            className={`rounded-full px-6 py-2 text-sm font-medium transition-all duration-200 ${
              activeCategory === category.id 
                ? 'bg-amber-600 text-white hover:bg-amber-700' 
                : 'hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {category.icon}
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
