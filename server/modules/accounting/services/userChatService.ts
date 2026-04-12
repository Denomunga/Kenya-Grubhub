import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { Product } from '../../../models/Product';
import { Order } from '../../../models/Order';
import { z } from 'zod';

// ========== CONFIGURATION ==========
const PRIMARY_MODEL = "gemini-2.5-flash-lite";
const FALLBACK_MODEL = "llama-3.3-70b-versatile";
const MAX_OUTPUT_TOKENS = 800;

const SYSTEM_INSTRUCTIONS = `You are the "Boom Customer Assistant." You help customers browse the menu, check product prices and availability, track their orders, and answer general questions about the business.
You can help with:
- "What's on the menu?"
- "How much is [product]?"
- "Is [product] available?"
- "What's the status of my order?"
- "What categories do you have?"
- "Show me products under 500 KES"

Be friendly, helpful, and concise. Prices are in Kenyan Shillings (KES).`;

// ========== USER-FACING TOOLS ==========
const userTools = [
  {
    name: 'browse_menu',
    description: 'Browse the food/product menu. Can search by name, filter by category, or show all available items with prices.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: 'Search term for product name' },
        category: { type: SchemaType.STRING, description: 'Category filter (e.g. Food, Drinks, Snacks)' },
        maxPrice: { type: SchemaType.NUMBER, description: 'Maximum price filter in KES' },
        available: { type: SchemaType.BOOLEAN, description: 'Only show available items (default true)' },
        limit: { type: SchemaType.NUMBER, description: 'Maximum results (default 15)' },
      },
    },
  },
  {
    name: 'get_product_details',
    description: 'Get detailed information about a specific product including price, description, availability, and stock status.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: 'Product name to look up' },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_categories',
    description: 'List all available product categories with item counts.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'track_order',
    description: 'Track an order by phone number or order ID. Shows order status, items, and estimated delivery info.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        phone: { type: SchemaType.STRING, description: 'Customer phone number' },
        orderId: { type: SchemaType.STRING, description: 'Order ID (if known)' },
      },
    },
  },
];

// ========== ZOD SCHEMAS ==========
const BrowseMenuSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  maxPrice: z.number().optional(),
  available: z.boolean().optional(),
  limit: z.number().min(1).max(50).default(15),
});

const GetProductDetailsSchema = z.object({
  name: z.string(),
});

const TrackOrderSchema = z.object({
  phone: z.string().optional(),
  orderId: z.string().optional(),
});

// ========== USER CHAT SERVICE ==========
export class UserChatService {
  private genAI: GoogleGenerativeAI | undefined;
  private geminiModel: any;
  private groqClient: Groq | undefined;
  private _userId: string;

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
    if (this.geminiModel) {
      try {
        console.log(`[UserChat] Attempting primary model: ${PRIMARY_MODEL}`);
        const response = await this.callGeminiWithTools(message, history);
        console.log(`[UserChat] Success with ${PRIMARY_MODEL}`);
        return response;
      } catch (error: any) {
        console.error(`[UserChat] Gemini failed:`, error.message);
      }
    }

    if (this.groqClient) {
      try {
        console.log(`[UserChat] Falling back to Groq: ${FALLBACK_MODEL}`);
        const response = await this.callGroqWithPrompt(message, history);
        console.log(`[UserChat] Success with Groq`);
        return response;
      } catch (error: any) {
        console.error(`[UserChat] Groq failed:`, error.message);
        throw new Error('All AI services are currently unavailable.');
      }
    }

    throw new Error('No AI services are configured.');
  }

  // ========== GEMINI ==========
  private async callGeminiWithTools(message: string, history: any[]): Promise<string> {
    const firstUserIndex = history.findIndex((entry) => entry.role === 'user');
    const validHistory = firstUserIndex === -1 ? [] : history.slice(firstUserIndex);

    const chat = this.geminiModel.startChat({
      history: validHistory,
      tools: [{ functionDeclarations: userTools }],
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
    });

    let result = await chat.sendMessage(message);
    let response = result.response;

    while (this.hasFunctionCall(response)) {
      const functionCall = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;
      if (!functionCall) break;

      console.log(`[UserChat] Function call: ${functionCall.name} (user: ${this._userId})`);
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
    return response.candidates?.[0]?.content?.parts?.some(
      (part: any) => part.functionCall
    ) || false;
  }

  // ========== GROQ FALLBACK ==========
  private async callGroqWithPrompt(message: string, history: any[]): Promise<string> {
    const groqHistory = history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: msg.parts?.[0]?.text || '',
    }));

    const toolPrompt = `
You have access to the following functions:
- browse_menu(query?, category?, maxPrice?, available?, limit?)
- get_product_details(name)
- get_categories()
- track_order(phone?, orderId?)

If the user asks for information that requires one of these functions, respond with a JSON object like:
{"function": "browse_menu", "args": {"category": "Food"}}

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
      response_format: { type: 'json_object' },
    });

    const content = chatCompletion.choices[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(content);
      if (parsed.function) {
        const result = await this.executeFunction(parsed.function, parsed.args);
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
        case 'browse_menu': {
          const validated = BrowseMenuSchema.parse(args);
          return await this.browseMenu(validated);
        }
        case 'get_product_details': {
          const validated = GetProductDetailsSchema.parse(args);
          return await this.getProductDetails(validated);
        }
        case 'get_categories': {
          return await this.getCategories();
        }
        case 'track_order': {
          const validated = TrackOrderSchema.parse(args);
          return await this.trackOrder(validated);
        }
        default:
          return { error: `Unknown function: ${name}` };
      }
    } catch (error: any) {
      console.error(`[UserChat] Error executing ${name}:`, error);
      return { error: error.message };
    }
  }

  // ========== DATABASE QUERIES ==========
  private async browseMenu(args: z.infer<typeof BrowseMenuSchema>) {
    const filter: any = {};
    if (args.query) {
      filter.$or = [
        { name: new RegExp(args.query, 'i') },
        { category: new RegExp(args.query, 'i') },
        { tags: new RegExp(args.query, 'i') },
      ];
    }
    if (args.category) filter.category = args.category;
    if (args.available !== undefined) filter.available = args.available;
    else filter.available = true; // default: only show available items
    if (args.maxPrice) filter.price = { $lte: args.maxPrice };

    const products = await Product.find(filter)
      .select('name price category subcategory available stock unit description images')
      .limit(args.limit)
      .lean();

    return {
      count: products.length,
      products: products.map((p: any) => ({
        name: p.name,
        price: p.price,
        category: p.category,
        subcategory: p.subcategory,
        available: p.available,
        inStock: p.stock != null ? (p.stock > 0 ? 'Yes' : 'Out of stock') : 'N/A',
        unit: p.unit,
        description: p.description?.substring(0, 100),
      })),
    };
  }

  private async getProductDetails(args: z.infer<typeof GetProductDetailsSchema>) {
    const product = await Product.findOne({
      name: new RegExp(args.name, 'i'),
      available: true,
    }).lean();

    if (!product) {
      return { found: false, message: `No product found matching "${args.name}".` };
    }

    return {
      found: true,
      name: product.name,
      price: product.price,
      category: product.category,
      subcategory: product.subcategory,
      description: product.description,
      available: product.available,
      inStock: product.stock != null ? product.stock : 'N/A',
      unit: product.unit,
      brand: product.brand,
      condition: product.condition,
      size: product.size,
      color: product.color,
    };
  }

  private async getCategories() {
    const categories = await Product.aggregate([
      { $match: { available: true } },
      { $group: { _id: '$category', count: { $sum: 1 }, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } },
      { $sort: { count: -1 } },
    ]);

    return {
      categories: categories.map((c: any) => ({
        name: c._id,
        itemCount: c.count,
        priceRange: `${c.minPrice} - ${c.maxPrice} KES`,
      })),
    };
  }

  private async trackOrder(args: z.infer<typeof TrackOrderSchema>) {
    const filter: any = {};
    if (args.orderId) {
      try {
        const { ObjectId } = await import('mongodb');
        filter._id = new ObjectId(args.orderId);
      } catch {
        return { found: false, message: 'Invalid order ID format.' };
      }
    } else if (args.phone) {
      filter.phone = new RegExp(args.phone.replace(/\D/g, ''), '');
    } else {
      return { found: false, message: 'Please provide a phone number or order ID to track your order.' };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (orders.length === 0) {
      return { found: false, message: 'No orders found. Please check your phone number or order ID.' };
    }

    return {
      found: true,
      count: orders.length,
      orders: orders.map((o: any) => ({
        orderId: o._id.toString(),
        status: o.status,
        items: o.items?.map((i: any) => `${i.name} x${i.quantity} @ ${i.price} KES`),
        total: o.total,
        date: o.createdAt,
        estimatedDelivery: o.status === 'Pending' ? 'Being processed' :
          o.status === 'Preparing' ? '~30 minutes' :
          o.status === 'Ready' ? 'Ready for pickup/delivery' :
          o.status === 'Delivered' ? 'Delivered' :
          o.status === 'Cancelled' ? 'Cancelled' : 'Unknown',
      })),
    };
  }
}
