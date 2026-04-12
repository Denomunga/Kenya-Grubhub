import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { Invoice, BankStatement } from '../models';
import { Product } from '../../../models/Product';
import { Order } from '../../../models/Order';
import { Sale } from '../../../models/Sale';
import { z } from 'zod';

// ========== CONFIGURATION ==========
const PRIMARY_MODEL = "gemini-2.5-flash-lite";
const FALLBACK_MODEL = "llama-3.3-70b-versatile";
const MAX_OUTPUT_TOKENS = 1000;

const SYSTEM_INSTRUCTIONS = `You are the "Boom Admin Assistant." You help administrators manage and find information about their business. 
You can answer questions like:
- "Show me unpaid invoices from last week."
- "Find bank statement for account 1000 in March."
- "What's the stock level and value of HP laptops?"
- "Give me a sales summary for this month."
- "How many orders are pending right now?"
- "What's the total value of our inventory?"
- "Show me today's revenue from POS and online orders."
- "List products that are low on stock."
- "What are the top selling products?"

You have access to real-time data from orders, products, sales, invoices, bank statements, and inventory.
Be concise, professional, and only provide information you are authorized to access.

IMPORTANT: All monetary values are in Kenyan Shillings. Always format prices as "Ksh 500" or "500 Ksh". NEVER use $ or USD. Always use Ksh for any monetary value including revenue, totals, and prices.`;

// ========== FUNCTION DEFINITIONS (Tools) ==========
const adminTools = [
  {
    name: 'search_invoices',
    description: 'Search for invoices by client name, invoice number, status, or date range.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: 'Search term for client name or invoice number' },
        status: { type: SchemaType.STRING, enum: ['unpaid', 'paid', 'overdue', 'partial'], description: 'Filter by status' },
        startDate: { type: SchemaType.STRING, description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: SchemaType.STRING, description: 'End date (YYYY-MM-DD)' },
        limit: { type: SchemaType.NUMBER, description: 'Maximum results (default 10)' },
      },
    },
  },
  {
    name: 'get_bank_statements',
    description: 'Retrieve bank statements by account code and date range.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        bankAccountCode: { type: SchemaType.STRING, description: 'Bank account code (e.g., 1000, 1010)' },
        startDate: { type: SchemaType.STRING, description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: SchemaType.STRING, description: 'End date (YYYY-MM-DD)' },
        status: { type: SchemaType.STRING, enum: ['pending', 'matched', 'reconciled'], description: 'Statement status' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'search_inventory',
    description: 'Search inventory items by name, SKU, or category, and check stock levels.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: 'Product name or SKU' },
        category: { type: SchemaType.STRING, description: 'Product category' },
        lowStock: { type: SchemaType.BOOLEAN, description: 'If true, only show items with stock below reorder level' },
        limit: { type: SchemaType.NUMBER, description: 'Maximum results (default 20)' },
      },
    },
  },
  {
    name: 'get_sales_summary',
    description: 'Get a sales summary for a specific period.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        period: { type: SchemaType.STRING, enum: ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'], description: 'Time period' },
        groupBy: { type: SchemaType.STRING, enum: ['day', 'week', 'month', 'product'], description: 'How to group results' },
      },
      required: ['period'],
    },
  },
  {
    name: 'get_orders',
    description: 'Get orders with optional filters for status, date range. Shows order details including items, totals, and delivery info.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: { type: SchemaType.STRING, enum: ['Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled'], description: 'Order status filter' },
        startDate: { type: SchemaType.STRING, description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: SchemaType.STRING, description: 'End date (YYYY-MM-DD)' },
        limit: { type: SchemaType.NUMBER, description: 'Maximum results (default 20)' },
      },
    },
  },
  {
    name: 'get_product_catalog',
    description: 'Browse the full product catalog with prices, stock levels, categories, and total inventory value. Can filter by category, availability, or search by name.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: 'Search product name' },
        category: { type: SchemaType.STRING, description: 'Product category filter' },
        available: { type: SchemaType.BOOLEAN, description: 'Filter by availability (true = in stock only)' },
        includeValue: { type: SchemaType.BOOLEAN, description: 'If true, include total stock value calculation (price * stock)' },
        limit: { type: SchemaType.NUMBER, description: 'Maximum results (default 30)' },
      },
    },
  },
  {
    name: 'get_dashboard_kpis',
    description: 'Get real-time dashboard KPIs: today revenue, order counts, top products, inventory value, and order status breakdown.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        includeInventoryValue: { type: SchemaType.BOOLEAN, description: 'Include total inventory value calculation' },
        includeTopProducts: { type: SchemaType.BOOLEAN, description: 'Include top selling products' },
      },
    },
  },
  {
    name: 'get_pos_sales',
    description: 'Get POS (Point of Sale) sales data with totals, item breakdown, and trends.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: { type: SchemaType.STRING, description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: SchemaType.STRING, description: 'End date (YYYY-MM-DD)' },
        groupBy: { type: SchemaType.STRING, enum: ['day', 'product', 'category'], description: 'How to group results' },
        limit: { type: SchemaType.NUMBER, description: 'Maximum results (default 20)' },
      },
      required: ['startDate', 'endDate'],
    },
  },
];

// ========== ZOD SCHEMAS FOR VALIDATION ==========
const SearchInvoicesSchema = z.object({
  query: z.string().optional(),
  status: z.enum(['unpaid', 'paid', 'overdue', 'partial']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

const GetBankStatementsSchema = z.object({
  bankAccountCode: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['pending', 'matched', 'reconciled']).optional(),
});

const SearchInventorySchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  lowStock: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const GetSalesSummarySchema = z.object({
  period: z.enum(['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month']),
  groupBy: z.enum(['day', 'week', 'month', 'product']).default('day'),
});

const GetOrdersSchema = z.object({
  status: z.enum(['Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const GetProductCatalogSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  available: z.coerce.boolean().optional(),
  includeValue: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(30),
});

const GetDashboardKPIsSchema = z.object({
  includeInventoryValue: z.coerce.boolean().optional(),
  includeTopProducts: z.coerce.boolean().optional(),
});

const GetPOSSalesSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupBy: z.enum(['day', 'product', 'category']).default('day'),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ========== CHAT SERVICE CLASS ==========
export class ChatService {
  private genAI: GoogleGenerativeAI | undefined;
  private geminiModel: any;
  private groqClient: Groq | undefined;
  private _userId: string; // Injected from controller for authorization & audit

  constructor(userId: string) {
    this._userId = userId;

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not configured. Gemini will not be available.');
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.geminiModel = this.genAI.getGenerativeModel({
        model: PRIMARY_MODEL,
        systemInstruction: SYSTEM_INSTRUCTIONS,
      });
    }

    if (!process.env.GROQ_API_KEY) {
      console.warn('GROQ_API_KEY is not configured. Groq fallback will not be available.');
    } else {
      this.groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
  }

  async sendMessage(message: string, history: any[] = []): Promise<string> {
    // Attempt with Primary Model (Gemini) with function calling
    if (this.geminiModel) {
      try {
        console.log(`Attempting to use primary model: ${PRIMARY_MODEL}`);
        const response = await this.callGeminiWithTools(message, history);
        console.log(`Success with ${PRIMARY_MODEL}`);
        return response;
      } catch (error: any) {
        console.error(`Gemini (${PRIMARY_MODEL}) failed:`, error.message);
      }
    }

    // Fallback to Secondary Model (Groq) – no native tools, use prompt engineering
    if (this.groqClient) {
      try {
        console.log(`Falling back to secondary model via Groq: ${FALLBACK_MODEL}`);
        const response = await this.callGroqWithPrompt(message, history);
        console.log(`Success with Groq (${FALLBACK_MODEL})`);
        return response;
      } catch (error: any) {
        console.error(`Groq fallback also failed:`, error.message);
        throw new Error('All AI services are currently unavailable.');
      }
    }

    throw new Error('No AI services are configured. Please set GEMINI_API_KEY or GROQ_API_KEY.');
  }

  // ========== GEMINI WITH FUNCTION CALLING ==========
  private async callGeminiWithTools(message: string, history: any[]): Promise<string> {
    const firstUserIndex = history.findIndex((entry) => entry.role === 'user');
    const validHistory = firstUserIndex === -1 ? [] : history.slice(firstUserIndex);

    const chat = this.geminiModel.startChat({
      history: validHistory,
      tools: [{ functionDeclarations: adminTools }],
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
    });

    let result = await chat.sendMessage(message);
    let response = result.response;

    // Handle function calls
    while (this.hasFunctionCall(response)) {
      const functionCall = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;
      if (!functionCall) break;

      console.log(`🔧 Gemini requested action: ${functionCall.name} (user: ${this._userId})`);
      const functionResponse = await this.executeFunction(functionCall.name, functionCall.args);

      result = await chat.sendMessage([{
        functionResponse: {
          name: functionCall.name,
          response: functionResponse,
        },
      }]);
      response = result.response;
    }

    return response.text();
  }

  private hasFunctionCall(response: any): boolean {
    return !!(response?.candidates?.[0]?.content?.parts?.[0]?.functionCall);
  }

  // ========== GROQ FALLBACK (Prompt-based) ==========
  private async callGroqWithPrompt(message: string, history: any[]): Promise<string> {
    const groqHistory = history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: msg.parts?.[0]?.text || '',
    }));

    // Add a system prompt that instructs the model how to format responses
    const toolPrompt = `
You have access to the following functions:
- search_invoices(query?, status?, startDate?, endDate?, limit?)
- get_bank_statements(bankAccountCode?, startDate, endDate, status?)
- search_inventory(query?, category?, lowStock?, limit?)
- get_sales_summary(period, groupBy?)

If the user asks for information that requires one of these functions, respond with a JSON object like:
{"function": "search_invoices", "args": {"query": "client name", "status": "unpaid"}}

Otherwise, respond normally. Today's date is ${new Date().toISOString().split('T')[0]}.
`;

    const messages = [
      { role: 'system', content: SYSTEM_INSTRUCTIONS + '\n\n' + toolPrompt },
      ...groqHistory,
      { role: 'user', content: message },
    ];

    const chatCompletion = await this.groqClient!.chat.completions.create({
      messages,
      model: FALLBACK_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      response_format: { type: 'json_object' }, // helps with structured output
    });

    const content = chatCompletion.choices[0]?.message?.content || '';
    
    // Try to parse function call from response
    try {
      const parsed = JSON.parse(content);
      if (parsed.function) {
        const result = await this.executeFunction(parsed.function, parsed.args);
        // Generate final response with the result
        const finalMessages = [
          ...messages,
          { role: 'assistant', content: content },
          { role: 'user', content: `Function result: ${JSON.stringify(result)}. Please provide a natural language response.` },
        ];
        const finalCompletion = await this.groqClient!.chat.completions.create({
          messages: finalMessages,
          model: FALLBACK_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
        });
        return finalCompletion.choices[0]?.message?.content || 'Unable to process request.';
      }
      return content;
    } catch {
      return content;
    }
  }

  // ========== FUNCTION EXECUTION ==========
  private async executeFunction(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'search_invoices': {
          const validated = SearchInvoicesSchema.parse(args);
          return await this.searchInvoices(validated);
        }
        case 'get_bank_statements': {
          const validated = GetBankStatementsSchema.parse(args);
          return await this.getBankStatements(validated);
        }
        case 'search_inventory': {
          const validated = SearchInventorySchema.parse(args);
          return await this.searchInventory(validated);
        }
        case 'get_sales_summary': {
          const validated = GetSalesSummarySchema.parse(args);
          return await this.getSalesSummary(validated);
        }
                case 'get_orders': {
          const validated = GetOrdersSchema.parse(args);
          return await this.getOrders(validated);
        }
        case 'get_product_catalog': {
          const validated = GetProductCatalogSchema.parse(args);
          return await this.getProductCatalog(validated);
        }
        case 'get_dashboard_kpis': {
          const validated = GetDashboardKPIsSchema.parse(args);
          return await this.getDashboardKPIs(validated);
        }
        case 'get_pos_sales': {
          const validated = GetPOSSalesSchema.parse(args);
          return await this.getPOSSales(validated);
        }
        default:
          return { error: `Unknown function: ${name}` };
      }
    } catch (error: any) {
      console.error(`Error executing ${name} (user: ${this._userId}):`, error);
      return { error: error.message };
    }
  }

  // ========== DATABASE QUERIES ==========
  private async searchInvoices(args: z.infer<typeof SearchInvoicesSchema>) {
    const filter: any = {};
    if (args.query) {
      filter.$or = [
        { invoiceNumber: new RegExp(args.query, 'i') },
        { clientName: new RegExp(args.query, 'i') },
      ];
    }
    if (args.status) filter.status = args.status;
    if (args.startDate || args.endDate) {
      filter.createdAt = {};
      if (args.startDate) filter.createdAt.$gte = new Date(args.startDate);
      if (args.endDate) filter.createdAt.$lte = new Date(args.endDate);
    }

    const invoices = await Invoice.find(filter).limit(args.limit).lean();
    return {
      count: invoices.length,
      invoices: invoices.map((inv: any) => ({
        id: inv._id,
        number: inv.invoiceNumber,
        client: inv.clientName,
        amount: inv.totalAmount,
        status: inv.status,
        date: inv.createdAt,
      })),
    };
  }

  private async getBankStatements(args: z.infer<typeof GetBankStatementsSchema>) {
    const filter: any = {
      statementDate: {
        $gte: new Date(args.startDate),
        $lte: new Date(args.endDate),
      },
    };
    if (args.bankAccountCode) filter.bankAccountCode = args.bankAccountCode;
    if (args.status) filter.status = args.status;

    const statements = await BankStatement.find(filter).sort({ statementDate: -1 }).lean();
    return {
      count: statements.length,
      statements: statements.map((stmt: any) => ({
        id: stmt.statementId,
        account: stmt.bankAccountCode,
        date: stmt.statementDate,
        startBalance: stmt.startingBalance,
        endBalance: stmt.endingBalance,
        status: stmt.status,
        transactionCount: stmt.transactions?.length || 0,
      })),
    };
  }

  private async searchInventory(args: z.infer<typeof SearchInventorySchema>) {
    const filter: any = {};
    if (args.query) {
      filter.$or = [
        { name: new RegExp(args.query, 'i') },
        { sku: new RegExp(args.query, 'i') },
      ];
    }
    if (args.category) filter.category = args.category;
    if (args.lowStock) {
      filter.$expr = { $lt: ['$stockQuantity', '$reorderLevel'] };
    }

    const products = await Product.find(filter).limit(args.limit).lean();
    return {
      count: products.length,
      products: products.map((p: any) => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        stock: p.stockQuantity,
        reorderLevel: p.reorderLevel,
        price: p.price,
      })),
    };
  }

  private async getSalesSummary(args: z.infer<typeof GetSalesSummarySchema>) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    switch (args.period) {
      case 'today': startDate = new Date(); startDate.setHours(0,0,0,0); break;
      case 'yesterday': startDate = new Date(); startDate.setDate(startDate.getDate()-1); startDate.setHours(0,0,0,0); endDate = new Date(startDate); endDate.setHours(23,59,59,999); break;
      case 'this_week': startDate = new Date(); startDate.setDate(startDate.getDate()-startDate.getDay()); startDate.setHours(0,0,0,0); break;
      case 'last_week': startDate = new Date(); startDate.setDate(startDate.getDate()-startDate.getDay()-7); startDate.setHours(0,0,0,0); endDate = new Date(startDate); endDate.setDate(endDate.getDate()+6); endDate.setHours(23,59,59,999); break;
      case 'this_month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'last_month': startDate = new Date(now.getFullYear(), now.getMonth()-1, 1); endDate = new Date(now.getFullYear(), now.getMonth(), 0); endDate.setHours(23,59,59,999); break;
      default: startDate = new Date(0);
    }

    const [onlineOrders, posSales] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' }, orderCount: { $sum: 1 }, avgOrderValue: { $avg: '$total' } } }
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' }, saleCount: { $sum: 1 } } }
      ]),
    ]);

    const onlineRev = onlineOrders[0]?.totalRevenue || 0;
    const onlineCount = onlineOrders[0]?.orderCount || 0;
    const posRev = posSales[0]?.totalRevenue || 0;
    const posCount = posSales[0]?.saleCount || 0;

    return {
      period: args.period,
      totalRevenue: onlineRev + posRev,
      onlineRevenue: onlineRev,
      posRevenue: posRev,
      totalOrders: onlineCount + posCount,
      onlineOrders: onlineCount,
      posSales: posCount,
      averageOrderValue: onlineCount > 0 ? Math.round(onlineRev / onlineCount) : 0,
    };
  }

  private async getOrders(args: z.infer<typeof GetOrdersSchema>) {
    const filter: any = {};
    if (args.status) filter.status = args.status;
    if (args.startDate || args.endDate) {
      filter.createdAt = {};
      if (args.startDate) filter.createdAt.$gte = new Date(args.startDate);
      if (args.endDate) filter.createdAt.$lte = new Date(args.endDate + 'T23:59:59.999Z');
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(args.limit).lean();
    return {
      count: orders.length,
      orders: orders.map((o: any) => ({
        id: o._id,
        status: o.status,
        items: o.items?.map((i: any) => ({ name: i.name, qty: i.quantity, price: i.price })),
        total: o.total,
        customer: o.customerName || o.name || 'N/A',
        phone: o.phone || 'N/A',
        date: o.createdAt,
        location: o.location?.address,
      })),
    };
  }

  private async getProductCatalog(args: z.infer<typeof GetProductCatalogSchema>) {
    const filter: any = {};
    if (args.query) {
      filter.$or = [
        { name: new RegExp(args.query, 'i') },
        { category: new RegExp(args.query, 'i') },
        { brand: new RegExp(args.query, 'i') },
      ];
    }
    if (args.category) filter.category = args.category;
    if (args.available !== undefined) filter.available = args.available;

    const products = await Product.find(filter).limit(args.limit).lean();

    let totalStockValue = 0;
    const productList = products.map((p: any) => {
      const stockQty = p.stock ?? 0;
      const stockValue = stockQty * (p.price || 0);
      if (args.includeValue) {
        totalStockValue += stockValue;
      }
      return {
        id: p._id,
        name: p.name,
        category: p.category,
        subcategory: p.subcategory,
        brand: p.brand,
        price: p.price,
        costPrice: p.costPrice,
        stock: stockQty,
        stockValue: args.includeValue ? stockValue : undefined,
        profitPerUnit: p.costPrice ? Math.round(p.price - p.costPrice) : undefined,
        costValue: args.includeValue ? (stockQty * (p.costPrice || 0)) : undefined,
        available: p.available,
        unit: p.unit,
        condition: p.condition,
      };
    });

    const result: any = {
      count: products.length,
      products: productList,
    };
    if (args.includeValue) {
      result.totalStockValue = totalStockValue;
      result.totalProducts = products.length;
    }
    return result;
  }

  private async getDashboardKPIs(args: z.infer<typeof GetDashboardKPIsSchema>) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [orderStats, posStats, statusBreakdown, productCount, lowStockProducts] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: today, $lt: tomorrow }, status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Product.countDocuments({ available: true }),
      Product.find({ stock: { $lte: 5, $exists: true } }).select('name stock price category').limit(10).lean(),
    ]);

    const result: any = {
      todayRevenue: (orderStats[0]?.revenue || 0) + (posStats[0]?.revenue || 0),
      todayOnlineOrders: orderStats[0]?.count || 0,
      todayPOSSales: posStats[0]?.count || 0,
      orderStatusBreakdown: statusBreakdown.reduce((acc: any, s: any) => { acc[s._id] = s.count; return acc; }, {}),
      availableProducts: productCount,
      lowStockItems: lowStockProducts.map((p: any) => ({ name: p.name, stock: p.stock, category: p.category })),
    };

    if (args.includeInventoryValue) {
      const inventoryVal = await Product.aggregate([
        { $match: { stock: { $exists: true, $gt: 0 } } },
        { $group: { _id: null, totalRetailValue: { $sum: { $multiply: ['$stock', '$price'] } }, totalCostValue: { $sum: { $multiply: ['$stock', { $ifNull: ['$costPrice', '$price'] }] } }, totalItems: { $sum: '$stock' } } }
      ]);
      result.inventoryValue = {
        totalRetailValue: inventoryVal[0]?.totalRetailValue || 0,
        totalCostValue: inventoryVal[0]?.totalCostValue || 0,
        totalItems: inventoryVal[0]?.totalItems || 0,
        potentialProfit: (inventoryVal[0]?.totalRetailValue || 0) - (inventoryVal[0]?.totalCostValue || 0),
      };
    }

    if (args.includeTopProducts) {
      const topProducts = await Sale.aggregate([
        { $unwind: '$items' },
        { $group: { _id: '$items.name', totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }, totalQty: { $sum: '$items.quantity' } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 }
      ]);
      result.topProducts = topProducts.map((p: any) => ({ name: p._id, revenue: p.totalRevenue, quantity: p.totalQty }));
    }

    return result;
  }

  private async getPOSSales(args: z.infer<typeof GetPOSSalesSchema>) {
    const startDate = new Date(args.startDate);
    const endDate = new Date(args.endDate + 'T23:59:59.999Z');

    let pipeline: any[];
    if (args.groupBy === 'product') {
      pipeline = [
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }, quantity: { $sum: '$items.quantity' } } },
        { $sort: { revenue: -1 } },
        { $limit: args.limit }
      ];
    } else if (args.groupBy === 'category') {
      pipeline = [
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'productInfo' } },
        { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$productInfo.category', revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }, quantity: { $sum: '$items.quantity' } } },
        { $sort: { revenue: -1 } },
        { $limit: args.limit }
      ];
    } else {
      pipeline = [
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, saleCount: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: args.limit }
      ];
    }

    const results = await Sale.aggregate(pipeline);
    const totalRevenue = await Sale.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);

    return {
      period: { start: args.startDate, end: args.endDate },
      groupBy: args.groupBy,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalSales: totalRevenue[0]?.count || 0,
      results: results.map((r: any) => ({
        label: r._id,
        revenue: r.revenue,
        quantity: r.quantity || r.saleCount,
      })),
    };
  }
}
