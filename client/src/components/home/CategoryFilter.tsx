import { Button } from "@/components/ui/button";
import { Package, Monitor, Smartphone, BookOpen } from "lucide-react";

const productCategories = [
  { id: 'all', name: 'All', icon: <Package className="w-4 h-4 mr-2" /> },
  { id: 'hp', name: 'HP', icon: <Monitor className="w-4 h-4 mr-2" /> },
  { id: 'dell', name: 'Dell', icon: <Monitor className="w-4 h-4 mr-2" /> },
  { id: 'lenovo', name: 'Lenovo', icon: <Monitor className="w-4 h-4 mr-2" /> },
  { id: 'asus', name: 'Asus', icon: <Monitor className="w-4 h-4 mr-2" /> },
  { id: 'apple', name: 'Apple (MacBooks)', icon: <Monitor className="w-4 h-4 mr-2" /> },
  { id: 'toshiba', name: 'Toshiba', icon: <Monitor className="w-4 h-4 mr-2" /> },
  { id: 'acer', name: 'Acer', icon: <Monitor className="w-4 h-4 mr-2" /> },
  { id: 'microsoft', name: 'Microsoft Surface', icon: <Monitor className="w-4 h-4 mr-2" /> },
  { id: 'stationery', name: 'Stationery', icon: <BookOpen className="w-4 h-4 mr-2" /> },
  { id: 'mobilephones', name: 'Mobilephones', icon: <Smartphone className="w-4 h-4 mr-2" /> },
  { id: 'others', name: 'Others', icon: <Package className="w-4 h-4 mr-2" /> },
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
