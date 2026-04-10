import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

// chatService.ts
const PRIMARY_MODEL = "gemini-2.5-flash-lite"; // Best free daily limit
const FALLBACK_MODEL = "llama-3.3-70b-versatile"; // Actively supported on Groq
const MAX_OUTPUT_TOKENS = 1000;

// ... (the rest of your ChatService class remains the same)

const SYSTEM_INSTRUCTIONS = `You are "KenyaGrubHub Assistant," a helpful support agent...`;

export class ChatService {
  private genAI: GoogleGenerativeAI | undefined;
  private geminiModel: any;
  private groqClient: Groq | undefined;

  constructor() {
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
    // Attempt with Primary Model (Gemini)
    if (this.geminiModel) {
      try {
        console.log(`Attempting to use primary model: ${PRIMARY_MODEL}`);
        const response = await this.callGemini(message, history);
        console.log(`Success with ${PRIMARY_MODEL}`);
        return response;
      } catch (error: any) {
        console.error(`Gemini (${PRIMARY_MODEL}) failed:`, error.message);
      }
    }

    // Fallback to Secondary Model (Groq)
    if (this.groqClient) {
      try {
        console.log(`Falling back to secondary model via Groq: ${FALLBACK_MODEL}`);
        const response = await this.callGroq(message, history);
        console.log(`Success with Groq (${FALLBACK_MODEL})`);
        return response;
      } catch (error: any) {
        console.error(`Groq fallback also failed:`, error.message);
        throw new Error('All AI services are currently unavailable.');
      }
    }

    throw new Error('No AI services are configured. Please set GEMINI_API_KEY or GROQ_API_KEY.');
  }

  private async callGemini(message: string, history: any[]): Promise<string> {
    const firstUserIndex = history.findIndex((entry) => entry.role === 'user');
    const validHistory = firstUserIndex === -1 ? [] : history.slice(firstUserIndex);
    const chat = this.geminiModel.startChat({
      history: validHistory,
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
    });
    const result = await chat.sendMessage(message);
    return result.response.text();
  }

  private async callGroq(message: string, history: any[]): Promise<string> {
    const groqHistory = history.map(msg => ({
      role: msg.role,
      content: msg.parts[0].text,
    }));
    
    // Add the system prompt for Groq
    const messages = [
      { role: 'system', content: SYSTEM_INSTRUCTIONS },
      ...groqHistory,
      { role: 'user', content: message }
    ];

    const chatCompletion = await this.groqClient!.chat.completions.create({
      messages: messages,
      model: FALLBACK_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
    });

    return chatCompletion.choices[0]?.message?.content || '';
  }
}