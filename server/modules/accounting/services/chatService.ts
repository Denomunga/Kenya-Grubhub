import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { Invoice, BankStatement } from '../models';
import { Product } from '../../../models/Product';
import { z } from 'zod';

// ========== CONFIGURATION ==========
const PRIMARY_MODEL = "gemini-2.5-flash-lite";
const FALLBACK_MODEL = "llama-3.3-70b-versatile";
const MAX_OUTPUT_TOKENS = 1000;

const SYSTEM_INSTRUCTIONS = `You are the "Boom Admin Assistant." You help administrators find information about invoices, bank statements, sales, and inventory. 
You can answer questions like:
- "Show me unpaid invoices from last week."
- "Find bank statement for account 1000 in March."
- "What's the stock level of HP laptops?"
- "Give me a sales summary for this month."

Be concise, professional, and only provide information you are authorized to access.`;

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
];

// ========== ZOD SCHEMAS FOR VALIDATION ==========
const SearchInvoicesSchema = z.object({
  query: z.string().optional(),
  status: z.enum(['unpaid', 'paid', 'overdue', 'partial']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().min(1).max(50).default(10),
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
  lowStock: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
});

const GetSalesSummarySchema = z.object({
  period: z.enum(['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month']),
  groupBy: z.enum(['day', 'week', 'month', 'product']).default('day'),
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
      tools: adminTools,
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
      role: msg.role,
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
    // This is a simplified example – in production you'd query your Orders collection
    const now = new Date();
    let startDate: Date;
    switch (args.period) {
      case 'today': startDate = new Date(now.setHours(0,0,0,0)); break;
      case 'yesterday': startDate = new Date(now.setDate(now.getDate()-1)); startDate.setHours(0,0,0,0); break;
      case 'this_week': startDate = new Date(now.setDate(now.getDate()-now.getDay())); break;
      case 'last_week': startDate = new Date(now.setDate(now.getDate()-now.getDay()-7)); break;
      case 'this_month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'last_month': startDate = new Date(now.getFullYear(), now.getMonth()-1, 1); break;
      default: startDate = new Date(0);
    }

    // Placeholder – replace with actual aggregation from your Orders model
    return {
      period: args.period,
      totalSales: 125000,
      orderCount: 42,
      averageOrderValue: 2976,
      message: 'Sales data would be fetched from Orders collection.',
    };
  }
}