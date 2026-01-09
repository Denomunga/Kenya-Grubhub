import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Minus, Trash2, CreditCard, DollarSign, Receipt, Printer, Search, BarChart3, Users, TrendingUp, Heart, LogOut, Download, RotateCcw, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { formatPriceKSHS } from '@/lib/format';
import { useData } from '@/lib/data';
import { useHybridAuth } from '@/lib/hybrid-auth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import MpesaPaymentDialog from './MpesaPaymentDialog';

interface Product {
  id: string;
  name: string;
  price: number;
  stock?: number;
  available: boolean;
  category?: string;
  brand?: string;
  description?: string;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock?: number;
}

interface Sale {
  _id: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  paymentMethod: string;
  paymentAmount: number;
  change: number;
  receiptNumber: string;
  customerName?: string;
  customerPhone?: string;
  status: string;
  createdAt: string;
  cashier: { name: string; username: string };
  auditLog?: any[];
  storeLocation?: string;
  type?: 'POS' | 'Order'; // Add type property to distinguish between POS and Order receipts
  // M-Pesa specific fields
  mpesaTransactionId?: string;
  mpesaReceipt?: string;
  mpesaStatus?: string;
  paymentConfirmedAt?: string;
}

interface POSSettings {
  _id: string;
  userId: string;
  favorites: string[];
  recentSales: { saleId: string; timestamp: string }[];
}

interface ReportData {
  dailySales?: any[];
  categoryTrends?: any[];
  paymentTrends?: any[];
  topCustomers?: any[];
  inventory?: any;
  performance?: any;
}

export default function POSSystem() {
  const { toast } = useToast();
  const { menu: products } = useData();
  const { user, logout } = useHybridAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);

  // New state for enhanced features
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [posSettings, setPosSettings] = useState<POSSettings | null>(null);
  const [showReports, setShowReports] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({});
  const [sessionWarning, setSessionWarning] = useState(false);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showReceipts, setShowReceipts] = useState(false);

  const [receipts, setReceipts] = useState<any[]>([]);
  const [receiptStats, setReceiptStats] = useState<any>({});

  // Stock management state
  const [showStockManagement, setShowStockManagement] = useState(false);
  const [stockProducts, setStockProducts] = useState<any[]>([]);
  const [stockUpdateMode, setStockUpdateMode] = useState<'single' | 'bulk'>('single');
  const [selectedStockProduct, setSelectedStockProduct] = useState<string>('');
  const [stockOperation, setStockOperation] = useState<'set' | 'add' | 'subtract'>('set');
  const [stockAmount, setStockAmount] = useState<string>('');
  const [bulkStockUpdates, setBulkStockUpdates] = useState<any[]>([]);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<any>(null);
  const [showProductSalesHistory, setShowProductSalesHistory] = useState(false);
  const [productSalesHistory, setProductSalesHistory] = useState<Sale[]>([]);
  const [cameFromProductSalesHistory, setCameFromProductSalesHistory] = useState(false);

  // Sale confirmation state
  const [showSaleConfirmation, setShowSaleConfirmation] = useState(false);
  const [pendingSale, setPendingSale] = useState<any>(null);

  // M-Pesa payment waiting state
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState<string>('');

  const [posMode, setPosMode] = useState<'sell' | 'management'>('sell');
  const [managementTab, setManagementTab] = useState<'receipts' | 'sales' | 'stock' | 'reports'>('receipts');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const paymentAmountInputRef = useRef<HTMLInputElement | null>(null);
  const focusPaymentOnNextCartChangeRef = useRef(false);

  useEffect(() => {
    fetchSales();
    loadReceipts();
    loadReceiptStats();
    loadPOSSettings();
    startSessionTimer();

    // Activity listeners for session management
    const resetTimer = () => {
      setSessionWarning(false);
      startSessionTimer();
    };

    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('scroll', resetTimer);

    return () => {
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
    };
  }, []);

  // Load reports when reports section is shown
  useEffect(() => {
    if (showReports || (posMode === 'management' && managementTab === 'reports')) {
      loadReports();
    }
  }, [showReports, posMode, managementTab]);

  useEffect(() => {
    if (posMode !== 'sell') return;
    if (!focusPaymentOnNextCartChangeRef.current) return;
    if (cart.length === 0) return;

    focusPaymentOnNextCartChangeRef.current = false;
    window.setTimeout(() => {
      paymentAmountInputRef.current?.focus();
    }, 0);
  }, [cart, posMode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable);

      if (e.key === 'F1') {
        e.preventDefault();
        setPosMode('sell');
        handleNewSale();
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        setPosMode('sell');
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }

      if (e.key === 'F4') {
        e.preventDefault();
        setPosMode('management');
        setManagementTab('receipts');
        setShowReceipts(true);
        setShowSalesHistory(false);
        setShowStockManagement(false);
        setShowReports(false);
        loadReceipts();
        loadReceiptStats();
        return;
      }

      if (isTypingTarget) return;

      if (e.key === 'F6') {
        e.preventDefault();
        setPosMode('management');
        setManagementTab('stock');
        setShowStockManagement(true);
        setShowSalesHistory(false);
        setShowReceipts(false);
        setShowReports(false);
        loadStockProducts();
        return;
      }

      if (e.key === 'F7') {
        e.preventDefault();
        setPosMode('management');
        setManagementTab('reports');
        setShowReports(true);
        setShowSalesHistory(false);
        setShowReceipts(false);
        setShowStockManagement(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const fetchSales = async () => {
    try {
      const response = await apiFetch('/api/pos/sales?limit=50');
      if (response.ok) {
        const data = await response.json();
        setSales(data.sales);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  const fetchProductSalesHistory = async (productId: string) => {
    try {
      const response = await apiFetch('/api/pos/sales?limit=100');
      if (response.ok) {
        const data = await response.json();
        // Filter sales that contain the specific product
        const productSales = data.sales.filter((sale: Sale) => 
          sale.items.some(item => item.productId === productId)
        );
        setProductSalesHistory(productSales);
      }
    } catch (error) {
      console.error('Error fetching product sales history:', error);
    }
  };

  const loadPOSSettings = async () => {
    try {
      const response = await apiFetch('/api/pos/settings');
      if (response.ok) {
        const settings = await response.json();
        setPosSettings(settings);
        setFavorites(settings.favorites || []);
      }
    } catch (error) {
      console.error('Failed to load POS settings:', error);
    }
  };

  const savePOSSettings = async (updates: Partial<POSSettings>) => {
    try {
      const newSettings = { ...(posSettings ?? {}), ...updates } as POSSettings;
      const response = await apiFetch('/api/pos/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (response.ok) {
        setPosSettings(newSettings);
      }
    } catch (error) {
      console.error('Failed to save POS settings:', error);
    }
  };

  const startSessionTimer = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }

    // Warning at 50 minutes
    inactivityTimeoutRef.current = setTimeout(() => {
      setSessionWarning(true);
    }, 50 * 60 * 1000);

    // Auto-logout at 60 minutes
    logoutTimeoutRef.current = setTimeout(() => {
      handleLogout();
    }, 60 * 60 * 1000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const extendSession = () => {
    setSessionWarning(false);
    startSessionTimer();
  };

  const handleNewSale = () => {
    setCart([]);
    setSelectedProduct('');
    setQuantity(1);
    setPaymentMethod('Cash');
    setPaymentAmount('');
    setCustomerName('');
    setCustomerPhone('');
    setDiscount(0);
    setTax(0);
    setSearchQuery('');
    setSearchResults([]);
    toast({ title: 'New Sale', description: 'Cart cleared and POS reset.' });
  };

  const addProductToCart = (productId: string, qty: number) => {
    if (!productId) {
      toast({ title: "Error", description: "Please select a product", variant: "destructive" });
      return;
    }

    const product = products.find((p: Product) => p.id === productId);
    if (!product) {
      toast({ title: "Error", description: "Product not found", variant: "destructive" });
      return;
    }

    if (product.stock !== undefined && product.stock <= 5 && product.stock > 0) {
      toast({
        title: "Low Stock Warning",
        description: `Only ${product.stock} left in stock for ${product.name}`,
        variant: "default"
      });
    }

    if (product.stock !== undefined && product.stock < qty) {
      toast({ title: "Error", description: `Insufficient stock. Available: ${product.stock}`, variant: "destructive" });
      return;
    }

    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
      updateQuantity(productId, existingItem.quantity + qty);
    } else {
      setCart([...cart, {
        productId,
        name: product.name,
        price: product.price,
        quantity: qty,
        stock: product.stock
      }]);
    }

    focusPaymentOnNextCartChangeRef.current = true;
  };

  const removeFromBulkUpdates = (productId: string) => {
    setBulkStockUpdates(bulkStockUpdates.filter(update => update.productId !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p: Product) => p.id === productId);
    if (product?.stock !== undefined && product.stock < newQuantity) {
      toast({ title: 'Error', description: `Insufficient stock. Available: ${product.stock}`, variant: 'destructive' });
      return;
    }

    setCart(cart.map(item => (item.productId === productId ? { ...item, quantity: newQuantity } : item)));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const getSubtotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const getTotal = () => getSubtotal() + tax - discount;

  const addToCart = () => {
    addProductToCart(selectedProduct, quantity);
    setSelectedProduct('');
    setQuantity(1);
  };

  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await apiFetch(`/api/pos/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const results = await response.json();
        const normalized = (Array.isArray(results) ? results : []).map((p: any) => ({
          id: p?.id || p?._id,
          name: p?.name,
          price: p?.price,
          stock: p?.stock,
          available: p?.available,
          category: p?.category,
          brand: p?.brand,
          description: p?.description,
        })) as Product[];
        setSearchResults(normalized.filter(p => !!p.id));
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const toggleFavorite = async (productId: string) => {
    if (!productId) {
      toast({ title: 'Error', description: 'Invalid product ID', variant: 'destructive' });
      return;
    }
    const newFavorites = favorites.includes(productId)
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];

    setFavorites(newFavorites);
    await savePOSSettings({ favorites: newFavorites });
  };

  const categories = useMemo<string[]>(() => {
    const unique = new Set<string>();
    (products as Product[]).forEach((p) => {
      if (p?.category) unique.add(p.category);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo<Product[]>(() => {
    const all = (products as Product[]).filter((p) => p.available);
    if (selectedCategory === 'all') return all;
    return all.filter((p) => (p.category || '') === selectedCategory);
  }, [products, selectedCategory]);

  const processSale = () => {
    if (cart.length === 0) {
      toast({ title: 'Error', description: 'Cart is empty', variant: 'destructive' });
      return;
    }

    const total = getTotal();
    const payment = parseFloat(paymentAmount);

    if (isNaN(payment) || payment < total) {
      toast({ 
        title: 'Error', 
        description: `Payment amount (${formatPriceKSHS(payment)}) is less than total (${formatPriceKSHS(total)})`, 
        variant: 'destructive' 
      });
      return;
    }

    setPendingSale({
      items: cart,
      subtotal: getSubtotal(),
      tax,
      discount,
      total,
      paymentMethod,
      paymentAmount: payment,
      change: payment - total,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
    });
    setShowSaleConfirmation(true);
  };

  const confirmSale = async () => {
    if (!pendingSale) return;

    setIsProcessing(true);
    try {
      const response = await apiFetch('/api/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: pendingSale.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          })),
          paymentMethod: pendingSale.paymentMethod,
          paymentAmount: pendingSale.paymentAmount,
          customerName: pendingSale.customerName,
          customerPhone: pendingSale.customerPhone,
          tax: pendingSale.tax,
          discount: pendingSale.discount
        })
      });

      if (response.ok) {
        const sale = await response.json();
        setCurrentSale(sale);
        fetchSales();

        // Handle M-Pesa payment waiting
        if (pendingSale.paymentMethod === 'Mobile Money') {
          setCurrentSaleId(sale._id);
          setWaitingForPayment(true);
          toast({ 
            title: 'Waiting for Payment', 
            description: `Please pay KES ${formatPriceKSHS(pendingSale.total)} via M-Pesa` 
          });
        } else {
          // For other payment methods, create receipt immediately
          await createReceiptForSale(sale);
          setCart([]);
          setPaymentAmount('');
          setCustomerName('');
          setCustomerPhone('');
          setDiscount(0);
          setTax(0);
          toast({ title: 'Success', description: 'Sale completed successfully' });
        }
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process sale', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setShowSaleConfirmation(false);
      setPendingSale(null);
    }
  };

  // Handle M-Pesa payment confirmation
  const handleMpesaPaymentConfirmed = async () => {
    if (currentSaleId) {
      try {
        const response = await apiFetch(`/api/pos/sales/${currentSaleId}`);
        if (response.ok) {
          const sale = await response.json();
          
          // Only generate receipt if payment status is completed
          if (sale.mpesaStatus === 'completed' || sale.status === 'Completed') {
            await createReceiptForSale(sale);
            setCart([]);
            setPaymentAmount('');
            setCustomerName('');
            setCustomerPhone('');
            setDiscount(0);
            setTax(0);
            setWaitingForPayment(false);
            setCurrentSaleId('');
            toast({ title: 'Success', description: 'Payment confirmed and receipt generated' });
          } else {
            toast({ 
              title: 'Payment Not Completed', 
              description: 'Payment status is not completed. Receipt not generated.',
              variant: 'destructive' 
            });
          }
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to confirm payment', variant: 'destructive' });
      }
    }
  };

  const createMissingReceipts = async () => {
    try {
      const response = await apiFetch('/api/receipts/create-missing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        toast({ 
          title: 'Success', 
          description: `Created ${result.created} missing receipts` 
        });
        // Refresh receipts and stats
        loadReceipts();
        loadReceiptStats();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create missing receipts', variant: 'destructive' });
    }
  };

  const createReceiptForSale = async (sale: any) => {
    try {
      // Only create receipts for successfully completed sales
      if (sale.status !== 'Completed' && sale.mpesaStatus !== 'completed') {
        console.warn('Skipping receipt creation for non-completed sale:', sale.receiptNumber, sale.status, sale.mpesaStatus);
        return;
      }
      const receiptData = {
        items: sale.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        paymentAmount: sale.paymentAmount,
        change: sale.change,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        cashier: sale.cashier,
        storeLocation: sale.storeLocation,
        // M-Pesa transaction details
        mpesaTransactionId: sale.mpesaTransactionId,
        mpesaReceipt: sale.mpesaReceipt,
        mpesaStatus: sale.mpesaStatus,
        paymentConfirmedAt: sale.paymentConfirmedAt
      };

      await apiFetch('/api/receipts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: sale._id,
          receiptData
        })
      });

      // Refresh receipts and stats after creating receipt
      loadReceipts();
      loadReceiptStats();
    } catch (error) {
      console.warn('Failed to create receipt automatically:', error);
    }
  };

  const loadReports = async () => {
    try {
      const [dailyResponse, inventoryResponse, customerResponse, trendResponse, performanceResponse] = await Promise.all([
        apiFetch('/api/pos/reports/daily'),
        apiFetch('/api/pos/reports/inventory'),
        apiFetch('/api/pos/reports/customers'),
        apiFetch('/api/pos/reports/trends'),
        apiFetch('/api/pos/reports/performance')
      ]);

      const reports = {
        dailySales: dailyResponse.ok ? await dailyResponse.json() : [],
        inventory: inventoryResponse.ok ? await inventoryResponse.json() : null,
        topCustomers: customerResponse.ok ? await customerResponse.json() : [],
        categoryTrends: trendResponse.ok ? await trendResponse.json() : [],
        performance: performanceResponse.ok ? await performanceResponse.json() : null
      };

      setReportData(reports);
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const loadReceipts = async () => {
    try {
      const response = await apiFetch('/api/receipts?limit=50');
      if (response.ok) {
        const data = await response.json();
        setReceipts(data.receipts);
      }
    } catch (error) {
      console.error('Failed to load receipts:', error);
    }
  };

  const loadReceiptStats = async () => {
    try {
      const response = await apiFetch('/api/receipts/stats');
      if (response.ok) {
        const stats = await response.json();
        setReceiptStats(stats);
      }
    } catch (error) {
      console.error('Failed to load receipt stats:', error);
    }
  };

  const loadStockProducts = async () => {
    try {
      const response = await apiFetch('/api/pos/stock');
      if (response.ok) {
        const data = await response.json();
        // The API returns products array directly, not wrapped in a products property
        setStockProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load stock products:', error);
    }
  };

  const updateSingleStock = async () => {
    if (!selectedStockProduct || !stockAmount) {
      toast({ title: 'Error', description: 'Please select a product and enter an amount', variant: 'destructive' });
      return;
    }

    setIsUpdatingStock(true);
    try {
      const response = await apiFetch(`/api/pos/stock/${selectedStockProduct}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: parseInt(stockAmount),
          operation: stockOperation
        })
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Stock updated successfully' });
        setSelectedStockProduct('');
        setStockAmount('');
        loadStockProducts();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({ title: 'Error', description: 'Failed to update stock', variant: 'destructive' });
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const addToBulkUpdates = () => {
    if (!selectedStockProduct || !stockAmount) {
      toast({ title: 'Error', description: 'Please select a product and enter an amount', variant: 'destructive' });
      return;
    }

    const existingIndex = bulkStockUpdates.findIndex(update => update.productId === selectedStockProduct);
    const entry = {
      productId: selectedStockProduct,
      stock: parseInt(stockAmount),
      operation: stockOperation
    };

    if (existingIndex >= 0) {
      const updated = [...bulkStockUpdates];
      updated[existingIndex] = entry;
      setBulkStockUpdates(updated);
    } else {
      setBulkStockUpdates([...bulkStockUpdates, entry]);
    }

    setSelectedStockProduct('');
    setStockAmount('');
  };

  const updateBulkStock = async () => {
    if (bulkStockUpdates.length === 0) {
      toast({ title: 'Error', description: 'Please add products to update', variant: 'destructive' });
      return;
    }

    setIsUpdatingStock(true);
    try {
      const response = await apiFetch('/api/pos/stock/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: bulkStockUpdates })
      });

      if (response.ok) {
        const result = await response.json();
        toast({ title: 'Success', description: `Updated ${result.results?.filter((r: any) => !r.error).length ?? 0} products successfully` });
        setBulkStockUpdates([]);
        loadStockProducts();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error in bulk stock update:', error);
      toast({ title: 'Error', description: 'Failed to update stock', variant: 'destructive' });
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const printReceipt = async () => {
    if (!currentSale) return;

    try {
      const receiptData = {
        items: currentSale.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: currentSale.subtotal,
        tax: currentSale.tax,
        discount: currentSale.discount,
        total: currentSale.total,
        paymentMethod: currentSale.paymentMethod,
        paymentAmount: currentSale.paymentAmount,
        change: currentSale.change,
        customerName: currentSale.customerName,
        customerPhone: currentSale.customerPhone,
        cashier: currentSale.cashier,
        storeLocation: currentSale.storeLocation
      };

      await apiFetch('/api/receipts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: currentSale._id,
          receiptData
        })
      });
    } catch (error) {
      console.warn('Failed to save receipt automatically:', error);
    }

    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    if (!receiptWindow) return;

    const receiptHTML = `
  <html>
    <head>
      <title>Receipt - ${currentSale.receiptNumber}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          font-size: 12px; 
          max-width: 350px; 
          margin: 0 auto; 
          background: linear-gradient(to bottom, #f9f, #f9f);
          border-radius: 8px;
          border: 1px solid #e5e7;
          padding: 20px;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-bottom: 1px dashed #000; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; }
        .right { text-align: right; }
        .header { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
        .company-name { font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 4px; }
        .tagline { font-size: 10px; color: #6b7280; margin-bottom: 2px; }
        .website { font-size: 10px; color: #9ca3af; }
        .section-title { font-size: 10px; font-weight: 600; color: #374151; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .items-container { border: 1px solid  #3b82f6; border-radius: 6px; background: white; margin-bottom: 16px; }
        .item-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid  #3b82f6; }
        .item-name { font-weight: 500; color: #1f2937; font-size: 11px; }
        .item-details { color: #6b7280; font-size: 9px; }
        .item-price { font-family: monospace; font-weight: 600; color: #1f2937; font-size: 11px; }
        .summary-section { border-top: 1px solid #3b82f6; padding-top: 16px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
        .summary-label { color: #4b5563; }
        .summary-value { font-family: monospace; }
        .total-row { margin-bottom: 8px; padding-top: 6px; border-top: 1px solid  #3b82f6; }
        .total-label { font-size: 14px; font-weight: bold; color: #1f2937; }
        .total-value { font-size: 14px; font-weight: bold; font-family: monospace; color: #1f2937; }
        .discount-label { color: #059669; }
        .discount-value { font-family: monospace; color: #059669; }
        .change-label { color: #2563eb; }
        .change-value { font-family: monospace; color: #2563eb; }
        .footer { text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid  #3b82; }
        .thank-you { font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px; }
        .come-again { font-size: 10px; color: #9ca3af; }
        .order-note { font-size: 9px; color: #ea580c; margin-top: 6px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="center company-name">MS-COMPUTERS</div>
        <div class="center tagline">Your Trusted Technology Partner</div>
        <div class="center website">www.ms-computers.com</div>
      </div>
      
      <div style="margin-bottom: 16px; font-size: 11px;">
        <div class="summary-row">
          <span class="summary-label">Date:</span>
          <span class="summary-value">${new Date(currentSale.createdAt).toLocaleString()}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Cashier:</span>
          <span>${currentSale.cashier?.name || 'Unknown'}</span>
        </div>
        ${currentSale.customerName ? `
        <div class="summary-row">
          <span class="summary-label">Customer:</span>
          <span>${currentSale.customerName}</span>
        </div>` : ''}
        ${currentSale.type === 'Order' && currentSale.status ? `
        <div class="summary-row">
          <span class="summary-label">Status:</span>
          <span style="background: ${currentSale.status === 'Completed' ? '#10b981' : '#6b7280'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px;">${currentSale.status}</span>
        </div>` : ''}
      </div>
      
      <div class="summary-row">
        <span class="summary-label">Receipt:</span>
        <span class="summary-value">${currentSale.receiptNumber}</span>
      </div>
      
      <div class="section-title">Items</div>
      <div class="items-container">
        ${currentSale.items.map(item => `
          <div class="item-row">
            <div style="flex: 1;">
              <div class="item-name">${item.name}</div>
              <div class="item-details">${item.quantity} × ${formatPriceKSHS(item.price)}</div>
            </div>
            <div class="item-price">${formatPriceKSHS(item.price * item.quantity)}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="summary-section">
        <div class="summary-row">
          <span class="summary-label">Subtotal:</span>
          <span class="summary-value">${formatPriceKSHS(currentSale.subtotal)}</span>
        </div>
        ${currentSale.tax > 0 ? `
        <div class="summary-row">
          <span class="summary-label">Tax:</span>
          <span class="summary-value">${formatPriceKSHS(currentSale.tax)}</span>
        </div>` : ''}
        ${currentSale.discount > 0 ? `
        <div class="summary-row">
          <span class="discount-label">Discount:</span>
          <span class="discount-value">-${formatPriceKSHS(currentSale.discount)}</span>
        </div>` : ''}
        <div class="summary-row total-row">
          <span class="total-label">Total:</span>
          <span class="total-value">${formatPriceKSHS(currentSale.total)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Payment (${currentSale.paymentMethod}):</span>
          <span class="summary-value">${formatPriceKSHS(currentSale.paymentAmount)}</span>
        </div>
        ${currentSale.change > 0 ? `
        <div class="summary-row">
          <span class="change-label">Change:</span>
          <span class="change-value">${formatPriceKSHS(currentSale.change)}</span>
        </div>` : ''}
      </div>
      
      ${currentSale.paymentMethod === 'Mobile Money' && currentSale.mpesaTransactionId ? `
      <div class="line"></div>
      <div class="center bold" style="margin-bottom: 8px; font-size: 11px;">M-Pesa Transaction Details</div>
      <div class="summary-row">
        <span>Transaction ID:</span>
        <span class="summary-value">${currentSale.mpesaTransactionId}</span>
      </div>
      ${currentSale.mpesaReceipt ? `
      <div class="summary-row">
        <span>M-Pesa Receipt:</span>
        <span class="summary-value">${currentSale.mpesaReceipt}</span>
      </div>` : ''}
      ${currentSale.customerPhone ? `
      <div class="summary-row">
        <span>Payer Phone:</span>
        <span class="summary-value">${currentSale.customerPhone}</span>
      </div>` : ''}
      ${currentSale.paymentConfirmedAt ? `
      <div class="summary-row">
        <span>Confirmed At:</span>
        <span class="summary-value">${new Date(currentSale.paymentConfirmedAt).toLocaleString()}</span>
      </div>` : ''}
      ` : ''}
      
     <div style="text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
  <div style="font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">Thank you for shopping with us!</div>
  <div style="font-size: 10px; color: #9ca3af;">Please come again</div>
  ${currentSale.type === 'Order' ? `
  <div style="font-size: 9px; color: #ea580c; margin-top: 6px;">Order status updates will be sent to your contact</div>` : ''}
</div>
    </body>
  </html>
`;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  const saveReceiptAsPDF = async () => {
    if (!currentSale) return;

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '300px';
    tempDiv.style.fontFamily = 'monospace';
    tempDiv.style.fontSize = '12px';

    tempDiv.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb;">
        <div style="font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 4px;">MS-COMPUTERS</div>
        <div style="font-size: 10px; color: #6b7280; margin-bottom: 2px;">Your Trusted Technology Partner</div>
        <div style="font-size: 10px; color: #9ca3af;">www.ms-computers.com</div>
      </div>
      
      <div style="margin-bottom: 16px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #4b5563; font-weight: 500;">Date:</span>
          <span style="font-family: monospace;">${new Date(currentSale.createdAt).toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #4b5563; font-weight: 500;">Cashier:</span>
          <span>${currentSale.cashier?.name || 'Admin'}</span>
        </div>
        ${currentSale.customerName ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #4b5563; font-weight: 500;">Customer:</span>
          <span>${currentSale.customerName}</span>
        </div>` : ''}
        ${currentSale.type === 'Order' && currentSale.status ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #4b5563; font-weight: 500;">Status:</span>
          <span style="background: ${currentSale.status === 'Completed' ? '#10b981' : '#6b7280'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px;">${currentSale.status}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
  <span style="color: #4b5563; font-weight: 500;">Receipt:</span>
  <span style="font-family: monospace;">${currentSale.receiptNumber}</span>
</div>
      </div>
     <div style="font-size: 10px; font-weight: 600; color: #1e40af; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Items</div>
<div style="border: 1px solid #3b82f6; border-radius: 6px; background: #f8fafc;">
  ${currentSale.items.map(item => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">
      <div style="flex: 1;">
        <div style="font-weight: 500; color: #1e293b; font-size: 11px;">${item.name}</div>
        <div style="color: #64748b; font-size: 9px;">${item.quantity} × ${formatPriceKSHS(item.price)}</div>
      </div>
      <div style="font-family: monospace; font-weight: 600; color: #1e40af; font-size: 11px;">
        ${formatPriceKSHS(item.price * item.quantity)}
      </div>
    </div>
  `).join('')}
</div>
      </div>
           <div style="border-top: 1px solid  #3b82f6; padding-top: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
          <span style="color: #4b5;">Subtotal:</span>
          <span style="font-family: monospace;">${formatPriceKSHS(currentSale.subtotal)}</span>
        </div>
        ${currentSale.tax > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
          <span style="color: #4b5563;">Tax:</span>
          <span style="font-family: monospace;">${formatPriceKSHS(currentSale.tax)}</span>
        </div>` : ''}
        ${currentSale.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
          <span style="color: #059669;">Discount:</span>
          <span style="font-family: monospace; color: #059669;">-${formatPriceKSHS(currentSale.discount)}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
          <span style="font-size: 14px; font-weight: bold; color: #1f2937;">Total:</span>
          <span style="font-size: 14px; font-weight: bold; font-family: monospace; color: #1f2937;">
            ${formatPriceKSHS(currentSale.total)}
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
          <span style="color: #4b5563;">Payment (${currentSale.paymentMethod}):</span>
          <span style="font-family: monospace;">${formatPriceKSHS(currentSale.paymentAmount)}</span>
        </div>
        ${currentSale.change > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
          <span style="color: #2563eb;">Change:</span>
          <span style="font-family: monospace; color: #2563eb;">${formatPriceKSHS(currentSale.change)}</span>
        </div>` : ''}
      </div>
      
      <!-- M-Pesa Transaction Details -->
      ${currentSale.paymentMethod === 'Mobile Money' && currentSale.mpesaTransactionId ? `
      <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
      <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">M-Pesa Transaction Details</div>
      <div style="display: flex; justify-content: space-between;"><span>Transaction ID:</span><span>${currentSale.mpesaTransactionId}</span></div>
      ${currentSale.mpesaReceipt ? `<div style="display: flex; justify-content: space-between;"><span>M-Pesa Receipt:</span><span>${currentSale.mpesaReceipt}</span></div>` : ''}
      ${currentSale.customerPhone ? `<div style="display: flex; justify-content: space-between;"><span>Payer Phone:</span><span>${currentSale.customerPhone}</span></div>` : ''}
      ${currentSale.paymentConfirmedAt ? `<div style="display: flex; justify-content: space-between;"><span>Confirmed At:</span><span>${new Date(currentSale.paymentConfirmedAt).toLocaleString()}</span></div>` : ''}
      ` : ''}
      
           <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
          <span style="color: #4b5563;">Subtotal:</span>
          <span style="font-family: monospace;">${formatPriceKSHS(currentSale.subtotal)}</span>
        </div>
        ${currentSale.tax > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
          <span style="color: #4b5563;">Tax:</span>
          <span style="font-family: monospace;">${formatPriceKSHS(currentSale.tax)}</span>
        </div>` : ''}
        ${currentSale.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
          <span style="color: #059669;">Discount:</span>
          <span style="font-family: monospace; color: #059669;">-${formatPriceKSHS(currentSale.discount)}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
          <span style="font-size: 14px; font-weight: bold; color: #1f2937;">Total:</span>
          <span style="font-size: 14px; font-weight: bold; font-family: monospace; color: #1f2937;">
            ${formatPriceKSHS(currentSale.total)}
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
          <span style="color: #4b5563;">Payment (${currentSale.paymentMethod}):</span>
          <span style="font-family: monospace;">${formatPriceKSHS(currentSale.paymentAmount)}</span>
        </div>
        ${currentSale.change > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
          <span style="color: #2563eb;">Change:</span>
          <span style="font-family: monospace; color: #2563eb;">${formatPriceKSHS(currentSale.change)}</span>
        </div>` : ''}
      </div> 
      
      <div style="text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <div style="font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">Thank you for shopping with us!</div>
        <div style="font-size: 10px; color: #9ca3af;">Please come again</div>
        ${currentSale.type === 'Order' ? `
        <div style="font-size: 9px; color: #ea580c; margin-top: 6px;">Order status updates will be sent to your contact</div>` : ''}
      </div>
    `;

    document.body.appendChild(tempDiv);
    try {
      const canvas = await html2canvas(tempDiv);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const ratio = pageWidth / canvas.width;
      const imgHeight = canvas.height * ratio;
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
      pdf.save(`receipt-${currentSale.receiptNumber}.pdf`);
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const saveReceiptAsPDFForSale = async (saleData: any) => {
    if (!saleData) return;

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '280px';
    tempDiv.style.fontFamily = 'monospace';
    tempDiv.style.fontSize = '10px';
    tempDiv.style.padding = '20px';
    tempDiv.style.backgroundColor = 'white';

    const isOrder = saleData.type === 'Order';

    tempDiv.innerHTML = `
      <style>
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-bottom: 1px dashed #000; margin: 10px 0; }
        .right { text-align: right; }
        .header { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
        .company-name { font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 4px; }
        .tagline { font-size: 9px; color: #6b7280; margin-bottom: 2px; }
        .website { font-size: 9px; color: #9ca3af; }
        .section-title { font-size: 9px; font-weight: 600; color: #374151; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .items-container { border: 1px solid #3b82f6; border-radius: 6px; background: white; margin-bottom: 16px; }
        .item-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid #3b82f6; }
        .item-name { font-weight: 500; color: #1f2937; font-size: 10px; }
        .item-details { color: #6b7280; font-size: 8px; }
        .item-price { font-family: monospace; font-weight: 600; color: #1f2937; font-size: 10px; }
        .summary-section { border-top: 1px solid #3b82f6; padding-top: 16px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 10px; }
        .summary-label { color: #4b5563; }
        .summary-value { font-family: monospace; }
        .total-row { margin-bottom: 8px; padding-top: 6px; border-top: 1px solid #3b82f6; }
        .total-label { font-size: 12px; font-weight: bold; color: #1f2937; }
        .total-value { font-size: 12px; font-weight: bold; font-family: monospace; color: #1f2937; }
        .discount-label { color: #059669; }
        .discount-value { font-family: monospace; color: #059669; }
        .change-label { color: #2563eb; }
        .change-value { font-family: monospace; color: #2563eb; }
        .footer { text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        .thank-you { font-size: 10px; font-weight: 500; color: #374151; margin-bottom: 4px; }
        .come-again { font-size: 9px; color: #9ca3af; }
        .order-note { font-size: 8px; color: #ea580c; margin-top: 6px; }
      </style>
      
      <div class="header">
        <div class="center company-name">MS-COMPUTERS</div>
        <div class="center tagline">Your Trusted Technology Partner</div>
        <div class="center website">www.ms-computers.com</div>
      </div>
      
      <div style="margin-bottom: 16px; font-size: 10px;">
        <div class="summary-row">
          <span class="summary-label">Date:</span>
          <span class="summary-value">${new Date(saleData.createdAt).toLocaleString()}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Cashier:</span>
          <span>${saleData.cashier?.name || 'Unknown'}</span>
        </div>
        ${saleData.customerName ? `
        <div class="summary-row">
          <span class="summary-label">Customer:</span>
          <span>${saleData.customerName}</span>
        </div>` : ''}
        ${isOrder && saleData.status ? `
        <div class="summary-row">
          <span class="summary-label">Status:</span>
          <span style="background: ${saleData.status === 'Completed' ? '#10b981' : '#6b7280'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 8px;">${saleData.status}</span>
        </div>` : ''}
      </div>
      
      <div class="summary-row">
        <span class="summary-label">Receipt:</span>
        <span class="summary-value">${saleData.receiptNumber}</span>
      </div>
      
      <div class="section-title">Items</div>
      <div class="items-container">
        ${saleData.items.map((item: any) => `
          <div class="item-row">
            <div style="flex: 1;">
              <div class="item-name">${item.name}</div>
              <div class="item-details">${item.quantity} × ${formatPriceKSHS(item.price)}</div>
            </div>
            <div class="item-price">${formatPriceKSHS(item.price * item.quantity)}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="summary-section">
        <div class="summary-row">
          <span class="summary-label">Subtotal:</span>
          <span class="summary-value">${formatPriceKSHS(saleData.subtotal)}</span>
        </div>
        ${saleData.tax > 0 ? `
        <div class="summary-row">
          <span class="summary-label">Tax:</span>
          <span class="summary-value">${formatPriceKSHS(saleData.tax)}</span>
        </div>` : ''}
        ${saleData.discount > 0 ? `
        <div class="summary-row">
          <span class="discount-label">Discount:</span>
          <span class="discount-value">-${formatPriceKSHS(saleData.discount)}</span>
        </div>` : ''}
        <div class="summary-row total-row">
          <span class="total-label">Total:</span>
          <span class="total-value">${formatPriceKSHS(saleData.total)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Payment (${saleData.paymentMethod}):</span>
          <span class="summary-value">${formatPriceKSHS(saleData.paymentAmount)}</span>
        </div>
        ${saleData.change > 0 ? `
        <div class="summary-row">
          <span class="change-label">Change:</span>
          <span class="change-value">${formatPriceKSHS(saleData.change)}</span>
        </div>` : ''}
      </div>
      
      ${saleData.paymentMethod === 'Mobile Money' && saleData.mpesaTransactionId ? `
      <div class="line"></div>
      <div class="center bold" style="margin-bottom: 8px; font-size: 10px;">M-Pesa Transaction Details</div>
      <div class="summary-row">
        <span>Transaction ID:</span>
        <span class="summary-value">${saleData.mpesaTransactionId}</span>
      </div>
      ${saleData.mpesaReceipt ? `
      <div class="summary-row">
        <span>M-Pesa Receipt:</span>
        <span class="summary-value">${saleData.mpesaReceipt}</span>
      </div>` : ''}
      ${saleData.customerPhone ? `
      <div class="summary-row">
        <span>Payer Phone:</span>
        <span class="summary-value">${saleData.customerPhone}</span>
      </div>` : ''}
      ${saleData.paymentConfirmedAt ? `
      <div class="summary-row">
        <span>Confirmed At:</span>
        <span class="summary-value">${new Date(saleData.paymentConfirmedAt).toLocaleString()}</span>
      </div>` : ''}
      ` : ''}
      
      <div class="footer">
        <div class="thank-you">Thank you for shopping with us!</div>
        <div class="come-again">Please come again</div>
        ${isOrder ? `
        <div class="order-note">Order status updates will be sent to your contact</div>` : ''}
      </div>
    `;

    document.body.appendChild(tempDiv);
    try {
      const canvas = await html2canvas(tempDiv);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const ratio = pageWidth / canvas.width;
      const imgHeight = canvas.height * ratio;
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
      
      const filename = isOrder 
        ? `order-receipt-${saleData.receiptNumber}.pdf`
        : `receipt-${saleData.receiptNumber}.pdf`;
      
      pdf.save(filename);
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  return (
    <div className="space-y-8">
      {/* M-Pesa Payment Dialog */}
      <MpesaPaymentDialog
        open={waitingForPayment}
        onClose={async () => {
          setWaitingForPayment(false);
          setCurrentSaleId('');
          setCurrentSale(null); // Clear the current sale to prevent receipt dialog
          
          // Clear cart and reset form for clean state after cancellation
          setCart([]);
          setPaymentAmount('');
          setCustomerName('');
          setCustomerPhone('');
          setDiscount(0);
          setTax(0);
          
          // Cancel the M-Pesa payment by updating sale status to Failed
          if (currentSaleId) {
            try {
              await apiFetch(`/api/pos/sales/${currentSaleId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  status: 'Failed',
                  mpesaStatus: 'failed'
                })
              });
              console.log('M-Pesa payment cancelled and sale status updated to Failed');
            } catch (error) {
              console.error('Failed to cancel M-Pesa payment:', error);
            }
          }
          
          // Don't generate receipt when dialog is canceled
          toast({ title: 'Payment Canceled', description: 'M-Pesa payment was canceled' });
        }}
        amount={currentSale?.total || 0}
        saleId={currentSaleId}
        onPaymentConfirmed={handleMpesaPaymentConfirmed}
      />

      {/* Session Warning Dialog */}
      {sessionWarning && (
        <Dialog open={sessionWarning} onOpenChange={(open) => { if (!open) setSessionWarning(false); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Session Timeout Warning</DialogTitle>
            </DialogHeader>
            <p>Your session will expire in 10 minutes . Would you like to extend your session?</p>

            <div className="flex gap-2">
              <Button onClick={extendSession}>Extend Session</Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout Now
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight">POS</h2>
          <div className="text-sm text-muted-foreground">
            MS COMPUTERS{user?.name ? ` • Cashier: ${user.name}` : ''}
          </div>
        </div>

        <Tabs value={posMode} onValueChange={(v) => setPosMode(v as 'sell' | 'management')}>
          <TabsList>
            <TabsTrigger value="sell">Sell</TabsTrigger>
            <TabsTrigger value="management">Management</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant={sessionWarning ? 'destructive' : 'secondary'} className="gap-1">
            <Clock className="h-3 w-3" />
            {sessionWarning ? 'Session expiring' : 'Session active'}
          </Badge>
          {posMode === 'sell' && (
            <Button variant="outline" onClick={handleNewSale}>
              <RotateCcw className="h-4 w-4 mr-2" />
              New Sale
            </Button>
          )}
          <Button variant="outline" onClick={() => { void logout(); }}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {posMode === 'sell' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Search & Favorites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="flex-1">
                    <Label htmlFor="pos-search">Search</Label>
                    <Input
                      id="pos-search"
                      ref={searchInputRef}
                      placeholder="Search products by name, brand, or category..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchProducts(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        if (searchResults.length === 0) return;
                        e.preventDefault();
                        const first = searchResults[0];
                        if (!first?.id) return;
                        addProductToCart(first.id, 1);
                        setSearchResults([]);
                        setSearchQuery('');
                      }}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      F2: Search • F4: Receipts • F6: Stock • F7: Reports
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => searchProducts(searchQuery)}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {favorites.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Favorites</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {favorites.map((productId) => {
                        const product =
                          products.find((p: Product) => p.id === productId) ||
                          searchResults.find((p: Product) => p.id === productId);

                        if (!product) return null;
                        const isOutOfStock = product.stock === 0;
                        return (
                          <Button
                            key={productId}
                            variant="outline"
                            className="justify-start h-auto py-3"
                            disabled={isOutOfStock}
                            onClick={() => addProductToCart(productId, 1)}
                          >
                            <div className="text-left">
                              <div className="font-medium leading-tight">{product.name}</div>
                              <div className="text-xs text-muted-foreground">{formatPriceKSHS(product.price)}</div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Search Results</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {searchResults.map((product) => (
                        <div key={product.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{formatPriceKSHS(product.price)}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => toggleFavorite(product.id)}>
                              <Heart className={`h-3 w-3 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                addProductToCart(product.id, 1);
                                setSearchResults([]);
                                setSearchQuery('');
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="product">Product</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.map((product: Product) => {
                          const isLowStock = product.stock !== undefined && product.stock <= 5;
                          const isOutOfStock = product.stock === 0;

                          return (
                            <SelectItem
                              key={product.id}
                              value={product.id}
                              disabled={isOutOfStock}
                              className={isLowStock ? "text-orange-600 font-medium" : isOutOfStock ? "text-red-500 line-through" : ""}
                            >
                              {product.name} - {formatPriceKSHS(product.price)}
                              {product.stock !== undefined && (
                                <span className={isLowStock ? "text-orange-600 font-bold" : isOutOfStock ? "text-red-500" : ""}>
                                  {isOutOfStock ? " (OUT OF STOCK)" : ` (${product.stock} in stock${isLowStock ? " - LOW STOCK!" : ""})`}
                                </span>
                              )}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <Button onClick={addToCart} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-20 self-start">
            <Card>
              <CardHeader>
                <CardTitle>Shopping Cart</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {cart.length === 0 ? (
                  <div className="text-muted-foreground text-center py-10 px-6">Cart is empty</div>
                ) : (
                  <ScrollArea className="h-80 px-6">
                    <div className="space-y-4 py-4">
                      {cart.map((item) => {
                        const isLowStock = item.stock !== undefined && item.stock <= 5 && item.stock > 0;
                        const isOutOfStock = item.stock === 0;
                        return (
                          <div key={item.productId} className="flex items-start justify-between gap-3">cd
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium truncate">{item.name}</div>
                                {isOutOfStock && <Badge variant="destructive">Out</Badge>}
                                {isLowStock && <Badge variant="secondary">Low</Badge>}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatPriceKSHS(item.price)} x {item.quantity} • {formatPriceKSHS(item.price * item.quantity)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button size="sm" variant="outline" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button size="sm" variant="outline" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => removeFromCart(item.productId)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPriceKSHS(getSubtotal())}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="discount">Discount</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => {
                        const newDiscount = parseFloat(e.target.value) || 0;
                        setDiscount(newDiscount);
                        // Auto-adjust payment amount if it's less than the new total
                        const currentPayment = parseFloat(paymentAmount) || 0;
                        const newTotal = getSubtotal() + tax - newDiscount;
                        if (currentPayment < newTotal) {
                          setPaymentAmount(newTotal.toString());
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax">Tax</Label>
                    <Input
                      id="tax"
                      type="number"
                      min="0"
                      step="0.01"
                      value={tax}
                      onChange={(e) => {
                        const newTax = parseFloat(e.target.value) || 0;
                        setTax(newTax);
                        // Auto-adjust payment amount if it's less than the new total
                        const currentPayment = parseFloat(paymentAmount) || 0;
                        const newTotal = getSubtotal() + newTax - discount;
                        if (currentPayment < newTotal) {
                          setPaymentAmount(newTotal.toString());
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-lg font-bold">{formatPriceKSHS(getTotal())}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentAmount">Payment Amount</Label>
                    <Input
                      id="paymentAmount"
                      ref={paymentAmountInputRef}
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter payment amount"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name (Optional)</Label>
                    <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Customer Phone (Optional)</Label>
                    <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                  </div>
                </div>

                {paymentAmount && parseFloat(paymentAmount) >= getTotal() && (
                  <div className="flex justify-between font-medium">
                    <span>Change:</span>
                    <span>{formatPriceKSHS(parseFloat(paymentAmount) - getTotal())}</span>
                  </div>
                )}
                <Button
                  onClick={processSale}
                  disabled={cart.length === 0 || isProcessing || !paymentAmount}
                  className="w-full"
                  size="lg"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Complete Sale'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-bold">Management</h3>
              <div className="text-sm text-muted-foreground">Receipts, Sales, Stock and Reports</div>
            </div>
            <Tabs
              value={managementTab}
              onValueChange={(v) => {
                const tab = v as 'receipts' | 'sales' | 'stock' | 'reports';
                setManagementTab(tab);

                setShowReceipts(tab === 'receipts');
                setShowSalesHistory(tab === 'sales');
                setShowStockManagement(tab === 'stock');
                setShowReports(tab === 'reports');

                if (tab === 'receipts') {
                  loadReceipts();
                  loadReceiptStats();
                }
                if (tab === 'stock') {
                  loadStockProducts();
                }
              }}
            >
              <TabsList>
                <TabsTrigger value="receipts">Receipts</TabsTrigger>
                <TabsTrigger value="sales">Sales</TabsTrigger>
                <TabsTrigger value="stock">Stock</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {(showReports || managementTab === 'reports') && (
            <Card>
              <CardHeader>
                <CardTitle>POS Reports & Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={loadReports} className="mb-4">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Load Reports
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Today's Sales
                    </h4>
                    {reportData.dailySales && (reportData.dailySales as any).summary ? (
                      <div className="text-2xl font-bold text-green-600">
                        {formatPriceKSHS((reportData.dailySales as any).summary.totalSales || 0)}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No sales today</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Low Stock Items
                    </h4>
                    {reportData.inventory?.lowStock?.length > 0 ? (
                      <div className="text-sm">
                        {reportData.inventory.lowStock.slice(0, 3).map((item: any) => (
                          <div key={item.id}>{item.name}: {item.stock} left</div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">All items well stocked</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Top Customers
                    </h4>
                    {reportData.topCustomers && reportData.topCustomers.length > 0 ? (
                      <div className="text-sm">
                        {reportData.topCustomers.slice(0, 3).map((customer: any, index: number) => (
                          <div key={index}>{customer.name}: {formatPriceKSHS(customer.totalSpent)}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No customer data</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(showStockManagement || managementTab === 'stock') && (
            <Card>
              <CardHeader>
                <CardTitle>Stock Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Button variant={stockUpdateMode === 'single' ? 'default' : 'outline'} onClick={() => setStockUpdateMode('single')}>
                    Single Product Update
                  </Button>
                  <Button variant={stockUpdateMode === 'bulk' ? 'default' : 'outline'} onClick={() => setStockUpdateMode('bulk')}>
                    Bulk Update
                  </Button>
                </div>

                {stockUpdateMode === 'single' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="stockProduct">Product</Label>
                      <Select value={selectedStockProduct} onValueChange={setSelectedStockProduct}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {stockProducts.map((product: any) => (
                            <SelectItem key={product._id} value={product._id}>
                              {product.name} - {product.stock || 0} in stock
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="stockOperation">Operation</Label>
                      <Select value={stockOperation} onValueChange={(value: 'set' | 'add' | 'subtract') => setStockOperation(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="set">Set Stock</SelectItem>
                          <SelectItem value="add">Add Stock</SelectItem>
                          <SelectItem value="subtract">Subtract Stock</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="stockAmount">Amount</Label>
                      <Input
                        id="stockAmount"
                        type="number"
                        min="0"
                        value={stockAmount}
                        onChange={(e) => setStockAmount(e.target.value)}
                        placeholder="Enter amount"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        onClick={updateSingleStock}
                        disabled={isUpdatingStock || !selectedStockProduct || !stockAmount}
                        className="w-full"
                      >
                        {isUpdatingStock ? 'Updating...' : 'Update Stock'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="bulkProduct">Product</Label>
                        <Select value={selectedStockProduct} onValueChange={setSelectedStockProduct}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {stockProducts.map((product: any) => (
                              <SelectItem key={product._id} value={product._id}>
                                {product.name} - {product.stock || 0} in stock
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="bulkOperation">Operation</Label>
                        <Select value={stockOperation} onValueChange={(value: 'set' | 'add' | 'subtract') => setStockOperation(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="set">Set Stock</SelectItem>
                            <SelectItem value="add">Add Stock</SelectItem>
                            <SelectItem value="subtract">Subtract Stock</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="bulkAmount">Amount</Label>
                        <Input
                          id="bulkAmount"
                          type="number"
                          min="0"
                          value={stockAmount}
                          onChange={(e) => setStockAmount(e.target.value)}
                          placeholder="Enter amount"
                        />
                      </div>

                      <div className="flex items-end">
                        <Button onClick={addToBulkUpdates} disabled={!selectedStockProduct || !stockAmount} className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Add to List
                        </Button>
                      </div>
                    </div>

                    {bulkStockUpdates.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Pending Updates ({bulkStockUpdates.length}):</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {bulkStockUpdates.map((update, index) => {
                            const product = stockProducts.find((p: any) => p._id === update.productId);
                            return (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">{product?.name} - {update.operation} {update.stock}</span>
                                <Button size="sm" variant="outline" onClick={() => removeFromBulkUpdates(update.productId)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={updateBulkStock} disabled={isUpdatingStock} className="flex-1">
                            {isUpdatingStock ? 'Processing...' : 'Apply All Updates'}
                          </Button>
                          <Button variant="outline" onClick={() => setBulkStockUpdates([])}>
                            Clear All
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-medium">Current Stock Levels</h4>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockProducts.map((product: any) => {
                          const stockLevel = product.stock || 0;
                          const isLowStock = stockLevel > 0 && stockLevel <= 10;
                          const isOutOfStock = stockLevel === 0;

                          return (
                            <TableRow 
                              key={product._id} 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => setSelectedProductDetail(product)}
                            >
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{product.category || 'N/A'}</TableCell>
                              <TableCell>
                                <span className={isLowStock ? "text-orange-600 font-medium" : isOutOfStock ? "text-red-600 font-medium" : ""}>
                                  {stockLevel}
                                </span>
                              </TableCell>
                              <TableCell>{formatPriceKSHS(product.price)}</TableCell>
                              <TableCell>
                                <Badge variant={isOutOfStock ? "destructive" : isLowStock ? "secondary" : "default"}>
                                  {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(showSalesHistory || managementTab === 'sales') && (
            <Card>
              <CardHeader>
                <CardTitle>Sales History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map(sale => (
                      <TableRow key={sale._id}>
                        <TableCell className="font-mono">{sale.receiptNumber}</TableCell>
                        <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{sale.cashier.name}</TableCell>
                        <TableCell>{sale.items.length} items</TableCell>
                        <TableCell>{formatPriceKSHS(sale.total)}</TableCell>
                        <TableCell>{sale.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge variant={sale.status === 'Completed' ? 'default' : 'destructive'}>{sale.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCurrentSale(sale);
                              setShowSalesHistory(false);
                            }}
                          >
                            <Receipt className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {(showReceipts || managementTab === 'receipts') && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Receipts Management</CardTitle>
                  <Button variant="outline" onClick={createMissingReceipts}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Missing Receipts
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">Total Receipts</h4>
                    <div className="text-2xl font-bold">{receiptStats.totalReceipts || receipts.length}</div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Total Revenue</h4>
                    <div className="text-2xl font-bold text-green-600">{formatPriceKSHS(receiptStats.totalRevenue || 0)}</div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Average Sale</h4>
                    <div className="text-2xl font-bold">{formatPriceKSHS(receiptStats.averageSale || 0)}</div>
                  </div>
                </div>

                {receipts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipts.map((receipt: any) => (
                        <TableRow key={receipt._id}>
                          <TableCell className="font-mono">{receipt.receiptNumber}</TableCell>
                          <TableCell>
                            <Badge variant={receipt.type === 'Order' ? 'secondary' : 'default'}>
                              {receipt.type || 'POS'}
                            </Badge>
                            {receipt.status && (
                              <Badge variant="outline" className="ml-1">
                                {receipt.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{new Date(receipt.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{receipt.receiptData?.items?.length || 0} items</TableCell>
                          <TableCell>{formatPriceKSHS(receipt.receiptData?.total || 0)}</TableCell>
                          <TableCell>{receipt.receiptData?.paymentMethod || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCurrentSale({
                                    ...receipt.receiptData,
                                    _id: receipt.saleId,
                                    receiptNumber: receipt.receiptNumber,
                                    createdAt: receipt.createdAt,
                                    type: receipt.type,
                                    status: receipt.status
                                  });
                                }}
                              >
                                <Receipt className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Set current sale and trigger PDF save
                                  setCurrentSale({
                                    ...receipt.receiptData,
                                    _id: receipt.saleId,
                                    receiptNumber: receipt.receiptNumber,
                                    createdAt: receipt.createdAt,
                                    type: receipt.type,
                                    status: receipt.status
                                  });
                                  // Trigger PDF save after a brief delay to ensure currentSale is set
                                  setTimeout(() => {
                                    const saleData = {
                                      ...receipt.receiptData,
                                      _id: receipt.saleId,
                                      receiptNumber: receipt.receiptNumber,
                                      createdAt: receipt.createdAt,
                                      type: receipt.type,
                                      status: receipt.status
                                    };
                                    saveReceiptAsPDFForSale(saleData);
                                  }, 100);
                                }}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No receipts found</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Receipt Dialog */}
      {currentSale && (
        <Dialog open={!!currentSale} onOpenChange={(open) => {
          if (!open) {
            if (cameFromProductSalesHistory) {
              // Go back to product sales history
              setCameFromProductSalesHistory(false);
              setShowProductSalesHistory(true);
            }
            setCurrentSale(null);
          }
        }}>
          <DialogContent className="max-w-md bg-blue-50 border-2 border-blue-200 shadow-xl">
            <DialogHeader className="text-center pb-4">
              <DialogTitle className="text-lg font-bold">
                {currentSale.type === 'Order' ? 'Order Receipt' : 'Point of Sale Receipt'}
              </DialogTitle>
              <div className="text-sm text-muted-foreground font-mono">
                {currentSale.receiptNumber}
              </div>
            </DialogHeader>
            
            <div className="bg-linear-to-b from-gray-50 to-white rounded-lg p-6 space-y-6 border">
              {/* Header */}
              <div className="text-center space-y-2 border-b pb-4">
                <div className="text-2xl font-bold text-gray-800">MS-COMPUTERS</div>
                <div className="text-xs text-gray-500">Your Trusted Technology Partner</div>
                <div className="text-xs text-gray-400">www.ms-computers.com</div>
                <div className="text-sm font-mono text-blue-600 mt-2">Receipt: {currentSale.receiptNumber}</div>
              </div>
              
              {/* Transaction Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Date:</span>
                  <span className="font-mono">{new Date(currentSale.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Cashier:</span>
                  <span>{currentSale.cashier?.name || 'Unknown'}</span>
                </div>
                {currentSale.customerName && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600 font-medium">Customer:</span>
                    <span>{currentSale.customerName}</span>
                  </div>
                )}
                {currentSale.type === 'Order' && currentSale.status && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600 font-medium">Status:</span>
                    <Badge variant={currentSale.status === 'Completed' ? 'default' : 'secondary'}>
                      {currentSale.status}
                    </Badge>
                  </div>
                )}
              </div>
              
              {/* Items */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Items</div>
                <div className="border rounded-lg bg-white divide-y">
                  {currentSale.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3">
                      <div className="flex-1">
                        <div className="font-medium text-black">{item.name}</div>
                        <div className="text-xs text-black">{item.quantity} × {formatPriceKSHS(item.price)}</div>
                      </div>
                      <div className="font-mono font-semibold text-black">
                        {formatPriceKSHS(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Summary */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-mono">{formatPriceKSHS(currentSale.subtotal)}</span>
                </div>
                {currentSale.tax > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-mono">{formatPriceKSHS(currentSale.tax)}</span>
                  </div>
                )}
                {currentSale.discount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600">Discount:</span>
                    <span className="font-mono text-green-600">-{formatPriceKSHS(currentSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-bold text-black">Total:</span>
                  <span className="text-lg font-bold font-mono text-black">
                    {formatPriceKSHS(currentSale.total)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-black">Payment ({currentSale.paymentMethod}):</span>
                  <span className="font-mono">{formatPriceKSHS(currentSale.paymentAmount)}</span>
                </div>
                {currentSale.change > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600">Change:</span>
                    <span className="font-mono text-blue-600">{formatPriceKSHS(currentSale.change)}</span>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="text-center space-y-2 border-t pt-4">
                <div className="text-sm font-medium text-black">Thank you for shopping with us!</div>
                <div className="text-xs text-black">Please come again</div>
                {currentSale.type === 'Order' && (
                  <div className="text-xs text-orange-600 mt-2">
                    Order status updates will be sent to your contact
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={printReceipt} className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
              <Button onClick={saveReceiptAsPDF} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Save as PDF
              </Button>
              <Button variant="outline" onClick={() => {
                if (cameFromProductSalesHistory) {
                  // Go back to product sales history
                  setCameFromProductSalesHistory(false);
                  setShowProductSalesHistory(true);
                }
                setCurrentSale(null);
              }}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Sale Confirmation Dialog */}
      {showSaleConfirmation && pendingSale && (
        <Dialog open={showSaleConfirmation} onOpenChange={() => setShowSaleConfirmation(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Sale Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Sale Summary</h4>
                
                {/* Items List */}
                <div className="space-y-2 mb-4">
                  <div className="font-medium">Items ({pendingSale.items.length} items):</div>
                  {pendingSale.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name} x{item.quantity}</span>
                      <span>{formatPriceKSHS(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="space-y-1 border-t pt-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatPriceKSHS(pendingSale.subtotal)}</span>
                  </div>
                  {pendingSale.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>{formatPriceKSHS(pendingSale.tax)}</span>
                    </div>
                  )}
                  {pendingSale.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Discount:</span>
                      <span>{formatPriceKSHS(pendingSale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>{formatPriceKSHS(pendingSale.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Payment ({pendingSale.paymentMethod}):</span>
                    <span>{formatPriceKSHS(pendingSale.paymentAmount)}</span>
                  </div>
                  {pendingSale.change > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Change:</span>
                      <span>{formatPriceKSHS(pendingSale.change)}</span>
                    </div>
                  )}
                </div>

                {/* Customer Info */}
                {(pendingSale.customerName || pendingSale.customerPhone) && (
                  <div className="border-t pt-2">
                    <div className="font-medium mb-1">Customer Information:</div>
                    {pendingSale.customerName && (
                      <div className="text-sm">Name: {pendingSale.customerName}</div>
                    )}
                    {pendingSale.customerPhone && (
                      <div className="text-sm">Phone: {pendingSale.customerPhone}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirmation Question */}
              <div className="text-center">
                <p className="text-lg font-medium mb-4">
                  Do you want to confirm this sale?
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={confirmSale}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? 'Processing...' : 'Yes, Confirm Sale'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowSaleConfirmation(false);
                      setPendingSale(null);
                    }}
                    disabled={isProcessing}
                  >
                    No, Cancel
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Product Detail Modal */}
      {selectedProductDetail && (
        <Dialog open={!!selectedProductDetail} onOpenChange={() => setSelectedProductDetail(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedProductDetail.name}</span>
                <Badge variant={selectedProductDetail.stock > 0 ? "default" : "destructive"}>
                  {selectedProductDetail.stock > 0 ? `In Stock (${selectedProductDetail.stock})` : "Out of Stock"}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Gallery */}
              <div className="space-y-4">
                <h3 className="font-medium">Product Images</h3>
                {(selectedProductDetail.images && selectedProductDetail.images.length > 0) || (selectedProductDetail.image) ? (
                  <div className="space-y-2">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={selectedProductDetail.images?.[0] || selectedProductDetail.image} 
                        alt={selectedProductDetail.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {selectedProductDetail.images && selectedProductDetail.images.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {selectedProductDetail.images.slice(1, 5).map((image: string, index: number) => (
                          <div key={index} className="aspect-square bg-gray-100 rounded overflow-hidden cursor-pointer hover:opacity-80">
                            <img 
                              src={image} 
                              alt={`${selectedProductDetail.name} ${index + 2}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                    No Image Available
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Product Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span>{selectedProductDetail.category || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Brand:</span>
                      <span>{selectedProductDetail.brand || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Condition:</span>
                      <span className="capitalize">{selectedProductDetail.condition || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-medium">{formatPriceKSHS(selectedProductDetail.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Stock:</span>
                      <span className={`font-medium ${selectedProductDetail.stock <= 10 ? 'text-orange-600' : ''}`}>
                        {selectedProductDetail.stock || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedProductDetail.description && (
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-sm text-gray-600">{selectedProductDetail.description}</p>
                  </div>
                )}

                {/* Specifications */}
                {selectedProductDetail.specifications && Object.keys(selectedProductDetail.specifications).length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Specifications</h3>
                    <div className="space-y-1 text-sm">
                      {Object.entries(selectedProductDetail.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 capitalize">{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                <div>
                  <h3 className="font-medium mb-2">Additional Details</h3>
                  <div className="space-y-1 text-sm">
                    {selectedProductDetail.size && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Size:</span>
                        <span>{selectedProductDetail.size}</span>
                      </div>
                    )}
                    {selectedProductDetail.color && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Color:</span>
                        <span>{selectedProductDetail.color}</span>
                      </div>
                    )}
                    {selectedProductDetail.material && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Material:</span>
                        <span>{selectedProductDetail.material}</span>
                      </div>
                    )}
                    {selectedProductDetail.year && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Year:</span>
                        <span>{selectedProductDetail.year}</span>
                      </div>
                    )}
                    {selectedProductDetail.location && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span>{selectedProductDetail.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {selectedProductDetail.tags && selectedProductDetail.tags.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedProductDetail.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Quick Actions</h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedStockProduct(selectedProductDetail._id);
                        setStockOperation('set');
                        setSelectedProductDetail(null);
                      }}
                    >
                      Update Stock
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        if (selectedProductDetail?._id) {
                          fetchProductSalesHistory(selectedProductDetail._id);
                          setShowProductSalesHistory(true);
                        }
                      }}
                    >
                      View Sales History
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Product Sales History Modal */}
      {showProductSalesHistory && (
        <Dialog open={showProductSalesHistory} onOpenChange={setShowProductSalesHistory}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Sales History - {selectedProductDetail?.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Showing all sales that include this product
              </div>
              
              {productSalesHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No sales found for this product
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSalesHistory.map((sale) => {
                      const productItem = sale.items.find(item => item.productId === selectedProductDetail?._id);
                      return (
                        <TableRow 
                          key={sale._id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setCurrentSale(sale);
                            setCameFromProductSalesHistory(true);
                            setShowProductSalesHistory(false);
                          }}
                        >
                          <TableCell className="font-mono">{sale.receiptNumber}</TableCell>
                          <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{sale.cashier.name}</TableCell>
                          <TableCell>{productItem?.quantity || 0}</TableCell>
                          <TableCell>{formatPriceKSHS(productItem?.price || 0)}</TableCell>
                          <TableCell>{formatPriceKSHS((productItem?.price || 0) * (productItem?.quantity || 0))}</TableCell>
                          <TableCell>{sale.paymentMethod}</TableCell>
                          <TableCell>
                            <Badge variant={sale.status === 'Completed' ? 'default' : 'destructive'}>
                              {sale.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              
              {/* Summary Statistics */}
              {productSalesHistory.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Sales:</span>
                      <div className="font-medium">{productSalesHistory.length}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Quantity Sold:</span>
                      <div className="font-medium">
                        {productSalesHistory.reduce((sum, sale) => {
                          const item = sale.items.find(item => item.productId === selectedProductDetail?._id);
                          return sum + (item?.quantity || 0);
                        }, 0)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Revenue:</span>
                      <div className="font-medium">
                        {formatPriceKSHS(
                          productSalesHistory.reduce((sum, sale) => {
                            const item = sale.items.find(item => item.productId === selectedProductDetail?._id);
                            return sum + ((item?.price || 0) * (item?.quantity || 0));
                          }, 0)
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Average Price:</span>
                      <div className="font-medium">
                        {formatPriceKSHS(
                          productSalesHistory.reduce((sum, sale) => {
                            const item = sale.items.find(item => item.productId === selectedProductDetail?._id);
                            return sum + (item?.price || 0);
                          }, 0) / productSalesHistory.length
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}