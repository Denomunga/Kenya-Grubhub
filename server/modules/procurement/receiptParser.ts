import PDFParser from 'pdf2json';
import fs from 'fs';

export interface ExtractedReceiptItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
}

export interface ExtractedReceiptData {
  vendor?: string;
  date?: string;
  items: ExtractedReceiptItem[];
  total?: number;
  rawText: string;
}

/**
 * Extract text and data from PDF receipt using pdf2json
 */
export async function extractReceiptData(pdfPath: string): Promise<ExtractedReceiptData> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)(null, 1);
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        // Extract text from all pages
        const rawText = pdfData.Pages.map((page: any) => 
          page.Texts.map((text: any) => decodeURIComponent(text.R[0].T)).join(' ')
        ).join('\n');

        // Parse structured data
        const extractedData = parseReceiptText(rawText);
        
        resolve({
          ...extractedData,
          rawText
        });
      } catch (error) {
        reject(new Error('Failed to parse PDF content: ' + (error as Error).message));
      }
    });

    pdfParser.on('pdfParser_dataError', (error: any) => {
      reject(new Error('PDF parsing error: ' + error.parserError));
    });

    // Load and parse PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    pdfParser.parseBuffer(pdfBuffer);
  });
}

/**
 * Parse receipt text to extract structured data
 */
function parseReceiptText(text: string): Omit<ExtractedReceiptData, 'rawText'> {
  const lines = text.split(/\n|\r/).filter(line => line.trim());
  
  const items: ExtractedReceiptItem[] = [];
  let vendor: string | undefined;
  let date: string | undefined;
  let total: number | undefined;

  // Extract vendor (usually first non-empty line or contains company keywords)
  const vendorKeywords = ['ltd', 'limited', 'company', 'co.', 'inc', 'corp', 'store', 'market', 'suppliers'];
  for (const line of lines.slice(0, 5)) {
    const lowerLine = line.toLowerCase();
    if (line.length > 3 && !line.match(/^\d+$/) && 
        (vendorKeywords.some(kw => lowerLine.includes(kw)) || lines.indexOf(line) === 0)) {
      vendor = line.trim();
      break;
    }
  }

  // Extract date (common formats)
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,  // DD/MM/YYYY, MM-DD-YY
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,  // YYYY/MM/DD
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,  // 15 Jan 2024
  ];
  
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        date = match[1];
        break;
      }
    }
    if (date) break;
  }

  // Extract total (usually has "total" keyword followed by number)
  const totalPatterns = [
    /total[:\s]*([\d,]+\.?\d*)/i,
    /amount[:\s]*([\d,]+\.?\d*)/i,
    /grand\s*total[:\s]*([\d,]+\.?\d*)/i,
  ];
  
  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        total = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    if (total) break;
  }

  // Extract items - look for patterns like:
  // "Item Name 10 @ 50.00 = 500.00"
  // "2 x Milk 100.00"
  // "Bread 5 pcs 250.00"
  const itemPatterns = [
    // Pattern: "Item Name Qty @ UnitPrice = Total"
    /([A-Za-z\s]+?)\s+(\d+)\s*[@×x]\s*([\d,.]+)\s*=\s*([\d,.]+)/,
    // Pattern: "Qty x Item Price"
    /(\d+)\s*[×x]\s*([A-Za-z\s]+?)\s+([\d,.]+)/,
    // Pattern: "Item Qty Unit Price"
    /([A-Za-z\s]+?)\s+(\d+)\s*(?:pcs?|units?|kg|g|l|ml)?\s+([\d,.]+)/i,
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length < 3) continue;
    
    // Skip lines that are likely headers or totals
    if (/total|subtotal|tax|vat|balance|change|date|time/i.test(trimmedLine)) continue;
    
    for (const pattern of itemPatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        let name: string;
        let quantity: number;
        let unitPrice: number | undefined;
        let itemTotal: number | undefined;

        if (match[0].includes('@') || match[0].includes('=')) {
          // Pattern 1: "Item Name Qty @ UnitPrice = Total"
          name = match[1].trim();
          quantity = parseInt(match[2]);
          unitPrice = parseFloat(match[3].replace(/,/g, ''));
          itemTotal = parseFloat(match[4].replace(/,/g, ''));
        } else if (match[0].match(/^\d+\s*[×x]/)) {
          // Pattern 2: "Qty x Item Price"
          quantity = parseInt(match[1]);
          name = match[2].trim();
          itemTotal = parseFloat(match[3].replace(/,/g, ''));
          unitPrice = itemTotal / quantity;
        } else {
          // Pattern 3: "Item Qty Unit Price"
          name = match[1].trim();
          quantity = parseInt(match[2]);
          itemTotal = parseFloat(match[3].replace(/,/g, ''));
          unitPrice = itemTotal / quantity;
        }

        // Validate extracted data
        if (name && quantity > 0 && quantity < 10000) {
          items.push({
            name,
            quantity,
            unitPrice,
            total: itemTotal
          });
        }
        break;
      }
    }
  }

  return {
    vendor,
    date,
    items,
    total
  };
}

/**
 * Compare extracted receipt items with PO items
 * Returns match results with details
 */
export interface ReceiptMatchResult {
  matched: boolean;
  poItems: any[];
  receiptItems: ExtractedReceiptItem[];
  matches: Array<{
    poItem: any;
    receiptItem: ExtractedReceiptItem;
    qtyMatch: boolean;
    nameMatch: boolean;
  }>;
  mismatches: Array<{
    type: 'missing_in_po' | 'qty_mismatch' | 'not_in_receipt';
    item?: ExtractedReceiptItem;
    receiptItem?: ExtractedReceiptItem;
    poItem?: any;
    expected?: number;
    actual?: number;
  }>;
}

export function compareReceiptWithPO(
  receiptData: ExtractedReceiptData,
  poItems: any[]
): ReceiptMatchResult {
  const matches: ReceiptMatchResult['matches'] = [];
  const mismatches: ReceiptMatchResult['mismatches'] = [];
  
  // Track which PO items have been matched
  const matchedPoIndices = new Set<number>();
  const matchedReceiptIndices = new Set<number>();

  // Try to match each receipt item with a PO item
  for (let i = 0; i < receiptData.items.length; i++) {
    const rItem = receiptData.items[i];
    let bestMatch: { index: number; score: number } | null = null;

    for (let j = 0; j < poItems.length; j++) {
      if (matchedPoIndices.has(j)) continue;

      const poItem = poItems[j];
      const score = calculateMatchScore(rItem.name, poItem.productName, poItem.sku);
      
      if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { index: j, score };
      }
    }

    if (bestMatch) {
      const poItem = poItems[bestMatch.index];
      const qtyMatch = rItem.quantity === poItem.quantity;
      
      matches.push({
        poItem,
        receiptItem: rItem,
        qtyMatch,
        nameMatch: bestMatch.score > 0.8
      });

      if (!qtyMatch) {
        mismatches.push({
          type: 'qty_mismatch',
          poItem,
          receiptItem: rItem,
          expected: poItem.quantity,
          actual: rItem.quantity
        });
      }

      matchedPoIndices.add(bestMatch.index);
      matchedReceiptIndices.add(i);
    } else {
      // Receipt item not found in PO
      mismatches.push({
        type: 'missing_in_po',
        item: rItem
      });
    }
  }

  // Check for PO items not in receipt
  for (let j = 0; j < poItems.length; j++) {
    if (!matchedPoIndices.has(j)) {
      mismatches.push({
        type: 'not_in_receipt',
        poItem: poItems[j]
      });
    }
  }

  return {
    matched: mismatches.length === 0,
    poItems,
    receiptItems: receiptData.items,
    matches,
    mismatches
  };
}

/**
 * Calculate fuzzy match score between receipt item name and PO item
 */
function calculateMatchScore(receiptName: string, poName: string, poSku?: string): number {
  const r = receiptName.toLowerCase().trim();
  const p = poName.toLowerCase().trim();
  const s = (poSku || '').toLowerCase().trim();

  // Exact match
  if (r === p || r === s) return 1.0;
  
  // Contains match
  if (p.includes(r) || r.includes(p)) return 0.9;
  if (s && (s.includes(r) || r.includes(s))) return 0.9;

  // Word overlap
  const rWords = r.split(/\s+/);
  const pWords = p.split(/\s+/);
  const commonWords = rWords.filter(w => pWords.includes(w));
  
  if (commonWords.length > 0) {
    return commonWords.length / Math.max(rWords.length, pWords.length);
  }

  return 0;
}
