import { GoogleGenerativeAI } from '@google/generative-ai';


const MODEL_NAME = "gemini-1.5-flash"; // ✅ Use this
// Alternative: "gemini-1.5-flash-001"
const MAX_OUTPUT_TOKENS = 1000;

const SYSTEM_INSTRUCTIONS = `You are "KenyaGrubHub Assistant," a helpful support agent. 
You can answer questions about placing orders, tracking deliveries, menu items, and general platform help.
Be polite, concise, and professional.`;

export class ChatService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTIONS
    });
  }

  async sendMessage(
    message: string,
    history: { role: "user" | "model"; parts: { text: string }[] }[] = []
  ): Promise<string> {
    try {
      // 🔧 FIX: Ensure history starts with a user message (Gemini requirement)
      const firstUserIndex = history.findIndex((entry) => entry.role === 'user');
      const validHistory = firstUserIndex === -1 ? [] : history.slice(firstUserIndex);

      const chat = this.model.startChat({
        history: validHistory,
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS }
      });
      const result = await chat.sendMessage(message);
      return result.response.text();
    } catch (error: any) {
      console.error('Gemini API error:', error);
      if (error.message?.includes('429')) {
        throw new Error('Rate limit exceeded. Please wait a moment.');
      }
      throw new Error('Failed to get response from assistant.');
    }
  }
}