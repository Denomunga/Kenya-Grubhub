import { Button } from "@/components/ui/button";
import { Package, Monitor, Smartphone, BookOpen, Sprout, Shield, Tractor, Stethoscope } from "lucide-react";

interface CategoryFilterProps {
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  categories: string[];
}

const getCategoryIcon = (categoryName: string) => {
  const c = (categoryName || "").toLowerCase();

  const laptopBrands = [
    "hp",
    "dell",
    "lenovo",
    "asus",
    "apple (macbooks)",
    "toshiba",
    "acer",
    "microsoft surface",
  ];

  if (laptopBrands.includes(c)) return <Monitor className="w-4 h-4 mr-2" />;
  if (c === "mobilephones" || c.includes("phone")) return <Smartphone className="w-4 h-4 mr-2" />;
  if (c === "stationery" || c.includes("book")) return <BookOpen className="w-4 h-4 mr-2" />;

  if (c.includes("seed") || c.includes("plant")) return <Sprout className="w-4 h-4 mr-2" />;
  if (c.includes("fertiliz") || c.includes("soil")) return <Sprout className="w-4 h-4 mr-2" />;
  if (c.includes("chemical") || c.includes("pestic") || c.includes("fungic") || c.includes("herbic")) {
    return <Shield className="w-4 h-4 mr-2" />;
  }
  if (c.includes("tool") || c.includes("equipment") || c.includes("irrig")) return <Tractor className="w-4 h-4 mr-2" />;
  if (c.includes("livestock") || c.includes("veter") || c.includes("animal")) return <Stethoscope className="w-4 h-4 mr-2" />;

  return <Package className="w-4 h-4 mr-2" />;
};

const CategoryFilter = ({ activeCategory, onCategoryChange, categories }: CategoryFilterProps) => {
  const categoryList = [
    { id: "all", name: "All" },
    ...categories
      .filter(Boolean)
      .filter((c) => c.toLowerCase() !== "all")
      .map((c) => ({ id: c, name: c })),
  ];

  return (
    <div className="mb-12">
      <div className="flex flex-wrap gap-2 justify-center">
        {categoryList.map((category) => (
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
            {getCategoryIcon(category.name)}
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
