import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Trash2, CreditCard, DollarSign, Receipt, Printer, Search, BarChart3, Users, TrendingUp, Heart, LogOut, Download, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { formatPriceKSHS } from '@/lib/format';
import { useData } from '@/lib/data';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentSales, setRecentSales] = useState<{ saleId: string; timestamp: string }[]>([]);
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

  // Sale confirmation state
  const [showSaleConfirmation, setShowSaleConfirmation] = useState(false);
  const [pendingSale, setPendingSale] = useState<any>(null);

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
    };
  }, []);

  // Load reports when reports section is shown
  useEffect(() => {
    if (showReports) {
      loadReports();
    }
  }, [showReports]);

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

  const loadPOSSettings = async () => {
    try {
      const response = await apiFetch('/api/pos/settings');
      if (response.ok) {
        const settings = await response.json();
        setPosSettings(settings);
        setFavorites(settings.favorites || []);
        setRecentSales(settings.recentSales || []);
      }
    } catch (error) {
      console.error('Failed to load POS settings:', error);
    }
  };

  const savePOSSettings = async (updates: Partial<POSSettings>) => {
    try {
      const newSettings = { ...posSettings, ...updates } as POSSettings;
      const response = await apiFetch('/api/pos/settings', {
        method: 'PATCH',
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
    
    // Warning at 50 minutes
    inactivityTimeoutRef.current = setTimeout(() => {
      setSessionWarning(true);
    }, 50 * 60 * 1000);
    
    // Auto-logout at 60 minutes
    setTimeout(() => {
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

  const addToCart = () => {
    if (!selectedProduct) {
      toast({ title: "Error", description: "Please select a product", variant: "destructive" });
      return;
    }

    const product = products.find((p: Product) => p.id === selectedProduct);
    if (!product) {
      toast({ title: "Error", description: "Product not found", variant: "destructive" });
      return;
    }

    // Check for low stock warning
    if (product.stock !== undefined && product.stock <= 5 && product.stock > 0) {
      toast({ 
        title: "Low Stock Warning", 
        description: `Only ${product.stock} left in stock for ${product.name}`, 
        variant: "default" 
      });
    }

    if (product.stock !== undefined && product.stock < quantity) {
      toast({ title: "Error", description: `Insufficient stock. Available: ${product.stock}`, variant: "destructive" });
      return;
    }

    const existingItem = cart.find(item => item.productId === selectedProduct);
    if (existingItem) {
      updateQuantity(selectedProduct, existingItem.quantity + quantity);
    } else {
      setCart([...cart, {
        productId: selectedProduct,
        name: product.name,
        price: product.price,
        quantity,
        stock: product.stock
      }]);
    }

    setSelectedProduct('');
    setQuantity(1);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p: Product) => p.id === productId);
    if (product?.stock !== undefined && product.stock < newQuantity) {
      toast({ title: "Error", description: `Insufficient stock. Available: ${product.stock}`, variant: "destructive" });
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const getSubtotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const getTotal = () => getSubtotal() + tax - discount;

  const processSale = () => {
    if (cart.length === 0) {
      toast({ title: "Error", description: "Cart is empty", variant: "destructive" });
      return;
    }

    const total = getTotal();
    const payment = parseFloat(paymentAmount);

    if (isNaN(payment) || payment < total) {
      toast({ title: "Error", description: "Invalid payment amount", variant: "destructive" });
      return;
    }

    // Set pending sale data and show confirmation dialog
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
      customerPhone: customerPhone || undefined
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
        addToRecentSales(sale._id);
        
        // Refresh reports if they are currently shown
        if (showReports) {
          loadReports();
        }
        
        // Automatically save receipt to database
        try {
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
            storeLocation: sale.storeLocation
          };

          await apiFetch('/api/receipts/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              saleId: sale._id,
              receiptData
            })
          });
          
          // Refresh receipts list
          loadReceipts();
          loadReceiptStats();
        } catch (receiptError) {
          console.warn('Failed to save receipt automatically:', receiptError);
        }
        
        // Update local product inventory to reflect changes
        setCart([]);
        setPaymentAmount('');
        setCustomerName('');
        setCustomerPhone('');
        setDiscount(0);
        setTax(0);
        
        // Dispatch event to notify dashboard of new sale
        window.dispatchEvent(new CustomEvent('pos:sale-completed', {
          detail: {
            sale,
            total: sale.total,
            timestamp: new Date().toISOString()
          }
        }));
        
        // Refresh reports data to update Today's Sales
        loadReports();
        
        toast({ title: "Success", description: "Sale completed successfully" });
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to process sale", variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setShowSaleConfirmation(false);
      setPendingSale(null);
    }
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
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const toggleFavorite = async (productId: string) => {
    const newFavorites = favorites.includes(productId)
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];
    
    setFavorites(newFavorites);
    await savePOSSettings({ favorites: newFavorites });
  };

  const addToRecentSales = async (saleId: string) => {
    const newRecentSales = [
      { saleId, timestamp: new Date().toISOString() },
      ...recentSales.filter(item => item.saleId !== saleId).slice(0, 9)
    ];
    setRecentSales(newRecentSales);
    await savePOSSettings({ recentSales: newRecentSales });
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

  const printReceipt = async () => {
    if (!currentSale) return;

    try {
      // Save receipt to database
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

      const saveResponse = await apiFetch('/api/receipts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: currentSale._id,
          receiptData
        })
      });

      if (!saveResponse.ok) {
        console.warn('Failed to save receipt to database:', await saveResponse.text());
        // Continue with printing even if save fails
      }
    } catch (error) {
      console.error('Error saving receipt:', error);
      // Continue with printing
    }

    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    if (!receiptWindow) return;

    const receiptHTML = `
      <html>
        <head>
          <title>Receipt - ${currentSale.receiptNumber}</title>
          <style>
            body { font-family: monospace; font-size: 12px; max-width: 300px; margin: 0 auto; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="center bold">KENYA GRUBHUB</div>
          <div class="center">Point of Sale Receipt</div>
          <div class="line"></div>
          <div>Receipt: ${currentSale.receiptNumber}</div>
          <div>Date: ${new Date(currentSale.createdAt).toLocaleString()}</div>
          <div>Cashier: ${currentSale.cashier.name}</div>
          ${currentSale.customerName ? `<div>Customer: ${currentSale.customerName}</div>` : ''}
          <div class="line"></div>
          <table>
            ${currentSale.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="right">${item.quantity}x</td>
                <td class="right">${formatPriceKSHS(item.price * item.quantity)}</td>
              </tr>
            `).join('')}
          </table>
          <div class="line"></div>
          <table>
            <tr><td>Subtotal:</td><td class="right">${formatPriceKSHS(currentSale.subtotal)}</td></tr>
            ${currentSale.tax > 0 ? `<tr><td>Tax:</td><td class="right">${formatPriceKSHS(currentSale.tax)}</td></tr>` : ''}
            ${currentSale.discount > 0 ? `<tr><td>Discount:</td><td class="right">${formatPriceKSHS(currentSale.discount)}</td></tr>` : ''}
            <tr class="bold"><td>Total:</td><td class="right">${formatPriceKSHS(currentSale.total)}</td></tr>
            <tr><td>Payment (${currentSale.paymentMethod}):</td><td class="right">${formatPriceKSHS(currentSale.paymentAmount)}</td></tr>
            ${currentSale.change > 0 ? `<tr><td>Change:</td><td class="right">${formatPriceKSHS(currentSale.change)}</td></tr>` : ''}
          </table>
          <div class="line"></div>
          <div class="center">Thank you for shopping with us!</div>
        </body>
      </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  const saveReceiptAsPDF = async () => {
    if (!currentSale) return;

    try {
      // Save receipt to database first
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

      const saveResponse = await apiFetch('/api/receipts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: currentSale._id,
          receiptData
        })
      });

      if (!saveResponse.ok) {
        console.warn('Failed to save receipt to database:', await saveResponse.text());
      }

      // Create a temporary div for the receipt
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '300px';
      tempDiv.style.fontFamily = 'monospace';
      tempDiv.style.fontSize = '12px';
      tempDiv.innerHTML = `
        <div style="text-align: center; font-weight: bold;">KENYA GRUBHUB</div>
        <div style="text-align: center;">Point of Sale Receipt</div>
        <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
        <div>Receipt: ${currentSale.receiptNumber}</div>
        <div>Date: ${new Date(currentSale.createdAt).toLocaleString()}</div>
        <div>Cashier: ${currentSale.cashier.name}</div>
        ${currentSale.customerName ? `<div>Customer: ${currentSale.customerName}</div>` : ''}
        <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
        ${currentSale.items.map(item => `
          <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span>${item.name}</span>
            <span>${item.quantity}x ${formatPriceKSHS(item.price * item.quantity)}</span>
          </div>
        `).join('')}
        <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Subtotal:</span>
          <span>${formatPriceKSHS(currentSale.subtotal)}</span>
        </div>
        ${currentSale.tax > 0 ? `
          <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span>Tax:</span>
            <span>${formatPriceKSHS(currentSale.tax)}</span>
          </div>
        ` : ''}
        ${currentSale.discount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span>Discount:</span>
            <span>${formatPriceKSHS(currentSale.discount)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin: 2px 0; font-weight: bold;">
          <span>Total:</span>
          <span>${formatPriceKSHS(currentSale.total)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Payment (${currentSale.paymentMethod}):</span>
          <span>${formatPriceKSHS(currentSale.paymentAmount)}</span>
        </div>
        ${currentSale.change > 0 ? `
          <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span>Change:</span>
            <span>${formatPriceKSHS(currentSale.change)}</span>
          </div>
        ` : ''}
        <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center;">Thank you for shopping with us!</div>
      `;

      document.body.appendChild(tempDiv);

      // Convert to canvas and then to PDF
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      document.body.removeChild(tempDiv);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      const fileName = `receipt_${currentSale.receiptNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({ 
        title: "Success", 
        description: "Receipt saved as PDF successfully" 
      });

    } catch (error) {
      console.error('Error saving PDF:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save PDF receipt", 
        variant: "destructive" 
      });
    }
  };

  // Stock Management Functions
  const loadStockProducts = async () => {
    try {
      const response = await apiFetch('/api/pos/stock');
      if (response.ok) {
        const data = await response.json();
        setStockProducts(data);
      }
    } catch (error) {
      console.error('Error loading stock products:', error);
      toast({ 
        title: "Error", 
        description: "Failed to load stock data", 
        variant: "destructive" 
      });
    }
  };

  const updateSingleStock = async () => {
    if (!selectedStockProduct || !stockAmount) {
      toast({ 
        title: "Error", 
        description: "Please select a product and enter an amount", 
        variant: "destructive" 
      });
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
        const result = await response.json();
        toast({ 
          title: "Success", 
          description: `Stock updated successfully. New stock: ${result.newStock}` 
        });
        
        // Reset form and reload data
        setSelectedStockProduct('');
        setStockAmount('');
        loadStockProducts();
        
        // Also refresh the main products data to update POS
        window.location.reload(); // Simple way to refresh all product data
      } else {
        const error = await response.json();
        toast({ 
          title: "Error", 
          description: error.message, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update stock", 
        variant: "destructive" 
      });
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const updateBulkStock = async () => {
    if (bulkStockUpdates.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please add products to update", 
        variant: "destructive" 
      });
      return;
    }

    setIsUpdatingStock(true);
    try {
      const response = await apiFetch('/api/pos/stock/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: bulkStockUpdates
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({ 
          title: "Success", 
          description: `Updated ${result.results.filter((r: any) => !r.error).length} products successfully` 
        });
        
        // Reset form and reload data
        setBulkStockUpdates([]);
        loadStockProducts();
        
        // Also refresh the main products data to update POS
        window.location.reload(); // Simple way to refresh all product data
      } else {
        const error = await response.json();
        toast({ 
          title: "Error", 
          description: error.message, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Error in bulk stock update:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update stock", 
        variant: "destructive" 
      });
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const addToBulkUpdates = () => {
    if (!selectedStockProduct || !stockAmount) {
      toast({ 
        title: "Error", 
        description: "Please select a product and enter an amount", 
        variant: "destructive" 
      });
      return;
    }

    const existingIndex = bulkStockUpdates.findIndex(
      update => update.productId === selectedStockProduct
    );

    if (existingIndex >= 0) {
      // Update existing entry
      const updated = [...bulkStockUpdates];
      updated[existingIndex] = {
        productId: selectedStockProduct,
        stock: parseInt(stockAmount),
        operation: stockOperation
      };
      setBulkStockUpdates(updated);
    } else {
      // Add new entry
      setBulkStockUpdates([...bulkStockUpdates, {
        productId: selectedStockProduct,
        stock: parseInt(stockAmount),
        operation: stockOperation
      }]);
    }

    // Reset form
    setSelectedStockProduct('');
    setStockAmount('');
  };

  const removeFromBulkUpdates = (productId: string) => {
    setBulkStockUpdates(bulkStockUpdates.filter(update => update.productId !== productId));
  };

  return (
    <div className="space-y-6">
      {/* Session Warning Dialog */}
      {sessionWarning && (
        <Dialog open={sessionWarning} onOpenChange={() => {}}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Session Timeout Warning</DialogTitle>
            </DialogHeader>
            <p>Your session will expire in 10 minutes due to inactivity. Would you like to extend your session?</p>
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

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Point of Sale System</h2>
        <div className="flex gap-2">
          <Button onClick={() => {
            setShowReports(!showReports);
            setShowSalesHistory(false);
            setShowReceipts(false);
            setShowStockManagement(false);
          }} variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            {showReports ? 'Hide' : 'Show'} Reports
          </Button>
          <Button onClick={() => {
            setShowSalesHistory(!showSalesHistory);
            setShowReports(false);
            setShowReceipts(false);
            setShowStockManagement(false);
          }} variant="outline">
            <Receipt className="h-4 w-4 mr-2" />
            {showSalesHistory ? 'Hide' : 'Show'} Sales History
          </Button>
          <Button onClick={() => {
            setShowReceipts(!showReceipts);
            setShowSalesHistory(false);
            setShowReports(false);
            setShowStockManagement(false);
            if (!showReceipts) {
              loadReceipts();
              loadReceiptStats();
            }
          }} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            {showReceipts ? 'Hide' : 'Show'} Receipts
          </Button>
          <Button onClick={() => {
            setShowStockManagement(!showStockManagement);
            setShowSalesHistory(false);
            setShowReports(false);
            setShowReceipts(false);
            if (!showStockManagement) {
              loadStockProducts();
            }
          }} variant="outline">
            <Package className="h-4 w-4 mr-2" />
            {showStockManagement ? 'Hide' : 'Show'} Stock Management
          </Button>
        </div>
      </div>

      {/* Search and Favorites */}
      <Card>
        <CardHeader>
          <CardTitle>Product Search & Favorites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search products by name, brand, or category..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchProducts(e.target.value);
                }}
                className="w-full"
              />
            </div>
            <Button variant="outline" onClick={() => searchProducts(searchQuery)}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Search Results:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {searchResults.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{formatPriceKSHS(product.price)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleFavorite(product.id)}
                      >
                        <Heart className={`h-3 w-3 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(product.id);
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

          {favorites.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Favorite Products:</h4>
              <div className="flex flex-wrap gap-2">
                {favorites.map(productId => {
                  const product = products.find((p: Product) => p.id === productId);
                  return product ? (
                    <Badge key={productId} variant="secondary" className="cursor-pointer" onClick={() => setSelectedProduct(productId)}>
                      {product.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports Section */}
      {showReports && (
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
              {/* Daily Sales */}
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

              {/* Inventory Status */}
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

              {/* Top Customers */}
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

      {!showSalesHistory && !showReports && !showReceipts && !showStockManagement ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Add Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="product">Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.filter((p: Product) => p.available).map((product: Product) => {
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
              <Button onClick={addToCart} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle>Shopping Cart</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Cart is empty</p>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.productId} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPriceKSHS(item.price)} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPriceKSHS(getSubtotal())}</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor="tax">Tax</Label>
                        <Input
                          id="tax"
                          type="number"
                          min="0"
                          step="0.01"
                          value={tax}
                          onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="discount">Discount</Label>
                        <Input
                          id="discount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={discount}
                          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatPriceKSHS(getTotal())}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Customer Phone (Optional)</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
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
      ) : (
        /* Stock Management and Sales History */
        <div>
          {/* Stock Management */}
          {showStockManagement && (
            <Card>
              <CardHeader>
                <CardTitle>Stock Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mode Selection */}
                <div className="flex gap-2">
                  <Button 
                    variant={stockUpdateMode === 'single' ? 'default' : 'outline'}
                    onClick={() => setStockUpdateMode('single')}
                  >
                    Single Product Update
                  </Button>
                  <Button 
                    variant={stockUpdateMode === 'bulk' ? 'default' : 'outline'}
                    onClick={() => setStockUpdateMode('bulk')}
                  >
                    Bulk Update
                  </Button>
                </div>

                {stockUpdateMode === 'single' ? (
                  /* Single Stock Update */
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
                  /* Bulk Stock Update */
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
                        <Button 
                          onClick={addToBulkUpdates} 
                          disabled={!selectedStockProduct || !stockAmount}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add to List
                        </Button>
                      </div>
                    </div>

                    {/* Bulk Updates List */}
                    {bulkStockUpdates.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Pending Updates ({bulkStockUpdates.length}):</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {bulkStockUpdates.map((update, index) => {
                            const product = stockProducts.find((p: any) => p._id === update.productId);
                            return (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">
                                  {product?.name} - {update.operation} {update.stock}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeFromBulkUpdates(update.productId)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={updateBulkStock} 
                            disabled={isUpdatingStock}
                            className="flex-1"
                          >
                            {isUpdatingStock ? 'Processing...' : 'Apply All Updates'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setBulkStockUpdates([])}
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Stock Levels Table */}
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
                            <TableRow key={product._id}>
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

          {/* Sales History */}
          {(showSalesHistory || showStockManagement) && (
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
                          <Badge variant={sale.status === 'Completed' ? 'default' : 'destructive'}>
                            {sale.status}
                          </Badge>
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
        </div>
      )}

      {/* Receipts Section */}
      {showReceipts && (
        <Card>
          <CardHeader>
            <CardTitle>Receipts Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Receipt Stats */}
              <div className="space-y-2">
                <h4 className="font-medium">Total Receipts</h4>
                <div className="text-2xl font-bold">
                  {receiptStats.totalReceipts || receipts.length}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Total Revenue</h4>
                <div className="text-2xl font-bold text-green-600">
                  {formatPriceKSHS(receiptStats.totalRevenue || 0)}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Average Sale</h4>
                <div className="text-2xl font-bold">
                  {formatPriceKSHS(receiptStats.averageSale || 0)}
                </div>
              </div>
            </div>
            
            {receipts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
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
                      <TableCell>{new Date(receipt.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{receipt.receiptData?.items?.length || 0} items</TableCell>
                      <TableCell>{formatPriceKSHS(receipt.receiptData?.total || 0)}</TableCell>
                      <TableCell>{receipt.receiptData?.paymentMethod || 'N/A'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCurrentSale({
                              ...receipt.receiptData,
                              _id: receipt.saleId,
                              receiptNumber: receipt.receiptNumber,
                              createdAt: receipt.createdAt
                            });
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No receipts found
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Receipt Dialog */}
      {currentSale && (
        <Dialog open={!!currentSale} onOpenChange={() => setCurrentSale(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Receipt - {currentSale.receiptNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 font-mono text-sm">
              <div className="text-center border-b pb-2">
                <div className="font-bold">KENYA GRUBHUB</div>
                <div>Point of Sale Receipt</div>
              </div>
              <div>
                <div>Receipt: {currentSale.receiptNumber}</div>
                <div>Date: {new Date(currentSale.createdAt).toLocaleString()}</div>
                <div>Cashier: {currentSale.cashier.name}</div>
                {currentSale.customerName && <div>Customer: {currentSale.customerName}</div>}
              </div>
              <div className="border-t border-b py-2">
                {currentSale.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.name}</span>
                    <span>{item.quantity}x {formatPriceKSHS(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPriceKSHS(currentSale.subtotal)}</span>
                </div>
                {currentSale.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatPriceKSHS(currentSale.tax)}</span>
                  </div>
                )}
                {currentSale.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>{formatPriceKSHS(currentSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Total:</span>
                  <span>{formatPriceKSHS(currentSale.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment ({currentSale.paymentMethod}):</span>
                  <span>{formatPriceKSHS(currentSale.paymentAmount)}</span>
                </div>
                {currentSale.change > 0 && (
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span>{formatPriceKSHS(currentSale.change)}</span>
                  </div>
                )}
              </div>
              <div className="text-center border-t pt-2">
                Thank you for shopping with us!
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={printReceipt} className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
              <Button onClick={saveReceiptAsPDF} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Save as PDF
              </Button>
              <Button variant="outline" onClick={() => setCurrentSale(null)}>
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
    </div>
  );
}