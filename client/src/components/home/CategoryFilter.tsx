import { Button } from "@/components/ui/button";
import { Coffee, Utensils, Wine, Salad } from "lucide-react";

const foodCategories = [
  { id: 'all', name: 'All', icon: <Utensils className="w-4 h-4 mr-2" /> },
  { id: 'main', name: 'Main', icon: <Utensils className="w-4 h-4 mr-2" /> },
  { id: 'starter', name: 'Starter', icon: <Coffee className="w-4 h-4 mr-2" /> },
  { id: 'drinks', name: 'Drinks', icon: <Wine className="w-4 h-4 mr-2" /> },
  { id: 'dessert', name: 'Dessert', icon: <Salad className="w-4 h-4 mr-2" /> },
];

interface CategoryFilterProps {
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const CategoryFilter = ({ activeCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="mb-12">
      <div className="flex flex-wrap gap-2 justify-center">
        {foodCategories.map((category) => (
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
