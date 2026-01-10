import jsPDF from 'jspdf';
import { formatPriceKSHS } from './format';

interface OrderItem {
  item: {
    name: string;
    price: number;
    category: string;
  };
  quantity: number;
}

interface OrderData {
  id: string;
  items: OrderItem[];
  total: number;
  user: string;
  userPhone?: string;
  status: string;
  date: string;
  location?: {
    address: string;
  };
  paymentMethod: 'mpesa' | 'cash' | 'card';
  paymentStatus: string;
}

export class OfflineReceipt {
  private static readonly RECEIPT_WIDTH = 80; // mm for thermal printer
  private static readonly LINE_HEIGHT = 4;

  static generateReceipt(order: OrderData): string {
    // Generate text receipt for thermal printing
    let receipt = '';
    
    // Header
    receipt += '='.repeat(32) + '\n';
    receipt += '     KENYA GRUBHUB\n';
    receipt += '    POS RECEIPT\n';
    receipt += '='.repeat(32) + '\n\n';

    // Order info
    receipt += `Order #: ${order.id}\n`;
    receipt += `Date: ${new Date(order.date).toLocaleString()}\n`;
    receipt += `Status: ${order.status}\n\n`;

    // Customer info
    receipt += 'Customer:\n';
    receipt += `Name: ${order.user}\n`;
    if (order.userPhone) {
      receipt += `Phone: ${order.userPhone}\n`;
    }
    if (order.location?.address) {
      receipt += `Address: ${order.location.address}\n`;
    }
    receipt += '\n';

    // Items
    receipt += '-'.repeat(32) + '\n';
    receipt += 'ITEM                     QTY   PRICE\n';
    receipt += '-'.repeat(32) + '\n';

    order.items.forEach((item) => {
      const name = item.item.name.substring(0, 20).padEnd(20);
      const qty = item.quantity.toString().padStart(3);
      const price = formatPriceKSHS(item.item.price * item.quantity).padStart(9);
      receipt += `${name} ${qty} ${price}\n`;
    });

    receipt += '-'.repeat(32) + '\n';

    // Total
    receipt += 'TOTAL:'.padStart(25) + formatPriceKSHS(order.total).padStart(9) + '\n';
    receipt += '\n';

    // Payment info
    receipt += `Payment Method: ${order.paymentMethod.toUpperCase()}\n`;
    receipt += `Payment Status: ${order.paymentStatus}\n\n`;

    // Footer
    receipt += '='.repeat(32) + '\n';
    receipt += '  Thank you for your order!\n';
    receipt += '='.repeat(32) + '\n';

    return receipt;
  }

  static generatePDFReceipt(order: OrderData): jsPDF {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // Thermal printer size
    });

    // Set font
    pdf.setFontSize(8);
    pdf.setFont('helvetica');

    let y = 10;

    // Helper function to add text and move to next line
    const addText = (text: string, align: 'left' | 'center' | 'right' = 'left') => {
      if (align === 'center') {
        const textWidth = pdf.getTextWidth(text);
        const x = (this.RECEIPT_WIDTH - textWidth) / 2;
        pdf.text(text, x, y);
      } else if (align === 'right') {
        const textWidth = pdf.getTextWidth(text);
        pdf.text(text, this.RECEIPT_WIDTH - textWidth, y);
      } else {
        pdf.text(text, 5, y);
      }
      y += this.LINE_HEIGHT;
    };

    // Header
    addText('='.repeat(32), 'center');
    addText('KENYA GRUBHUB', 'center');
    addText('POS RECEIPT', 'center');
    addText('='.repeat(32), 'center');
    y += 2;

    // Order info
    addText(`Order #: ${order.id}`);
    addText(`Date: ${new Date(order.date).toLocaleString()}`);
    addText(`Status: ${order.status}`);
    y += 2;

    // Customer info
    addText('Customer:');
    addText(`Name: ${order.user}`);
    if (order.userPhone) {
      addText(`Phone: ${order.userPhone}`);
    }
    if (order.location?.address) {
      addText(`Address: ${order.location.address}`);
    }
    y += 2;

    // Items header
    addText('-'.repeat(32));
    addText('ITEM                     QTY   PRICE');
    addText('-'.repeat(32));

    // Items
    order.items.forEach((item) => {
      const name = item.item.name.substring(0, 20).padEnd(20);
      const qty = item.quantity.toString().padStart(3);
      const price = formatPriceKSHS(item.item.price * item.quantity).padStart(9);
      addText(`${name} ${qty} ${price}`);
    });

    addText('-'.repeat(32));

    // Total
    addText('TOTAL:'.padStart(25) + formatPriceKSHS(order.total).padStart(9));
    y += 2;

    // Payment info
    addText(`Payment Method: ${order.paymentMethod.toUpperCase()}`);
    addText(`Payment Status: ${order.paymentStatus}`);
    y += 2;

    // Footer
    addText('='.repeat(32), 'center');
    addText('Thank you for your order!', 'center');
    addText('='.repeat(32), 'center');

    return pdf;
  }

  static async printReceipt(order: OrderData): Promise<boolean> {
    try {
      // Try to use browser print API if available
      if ('print' in window) {
        const pdf = this.generatePDFReceipt(order);
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const printWindow = window.open(pdfUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            // Clean up after printing
            printWindow.onafterprint = () => {
              printWindow.close();
              URL.revokeObjectURL(pdfUrl);
            };
          };
          return true;
        }
      }

      // Fallback: download PDF
      const pdf = this.generatePDFReceipt(order);
      pdf.save(`receipt-${order.id}.pdf`);
      return true;
    } catch (error) {
      console.error('Error printing receipt:', error);
      return false;
    }
  }

  static async printTextReceipt(order: OrderData): Promise<boolean> {
    try {
      const receiptText = this.generateReceipt(order);
      
      // Create a blob and download as text file
      const blob = new Blob([receiptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${order.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Error generating text receipt:', error);
      return false;
    }
  }

  // For thermal printer integration (if available)
  static async printToThermalPrinter(order: OrderData): Promise<boolean> {
    try {
      // Check if Web Bluetooth/Serial API is available for thermal printer
      if ('bluetooth' in navigator) {
        // This would require specific thermal printer implementation
        // For now, return false as fallback
        console.log('Thermal printer integration not implemented');
        return false;
      }

      // Fallback to regular printing
      return await this.printReceipt(order);
    } catch (error) {
      console.error('Error printing to thermal printer:', error);
      return false;
    }
  }
}
