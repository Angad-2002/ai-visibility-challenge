/**
 * AI Provider Service Layer
 * Supports multiple AI providers: OpenAI, Anthropic, and Groq
 * Follows cursor rules: AI prompts use templates, parse responses safely
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import logger from '@/lib/logger';
import { generateVisibilityPrompt } from './prompt-templates';

export type AIProvider = 'openai' | 'anthropic' | 'groq';

interface AIResponse {
  text: string;
  citations: string[];
}

/**
 * Extract citation URLs from AI response text
 * Looks for markdown links [text](url) and plain URLs
 */
function extractCitations(text: string): string[] {
  const citations: string[] = [];
  
  // Extract markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    citations.push(match[2]);
  }
  
  // Extract plain URLs
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1].replace(/[.,;!?]+$/, ''); // Remove trailing punctuation
    if (!citations.includes(url)) {
      citations.push(url);
    }
  }
  
  return citations;
}

/**
 * OpenAI Provider
 */
class OpenAIProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({ apiKey });
  }

  async query(prompt: string): Promise<AIResponse> {
    try {
      logger.debug('Querying OpenAI', { promptLength: prompt.length });
      
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // Using cost-effective model
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      const text = completion.choices[0]?.message?.content || '';
      const citations = extractCitations(text);

      logger.debug('OpenAI response received', { textLength: text.length, citationsCount: citations.length });
      
      return { text, citations };
    } catch (error) {
      logger.error('OpenAI query failed', { error });
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Anthropic (Claude) Provider
 */
class AnthropicProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.client = new Anthropic({ apiKey });
  }

  async query(prompt: string): Promise<AIResponse> {
    try {
      logger.debug('Querying Anthropic', { promptLength: prompt.length });
      
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
      const citations = extractCitations(text);

      logger.debug('Anthropic response received', { textLength: text.length, citationsCount: citations.length });
      
      return { text, citations };
    } catch (error) {
      logger.error('Anthropic query failed', { error });
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Groq Provider
 */
class GroqProvider {
  private client: Groq;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error('Groq API key is required');
    }
    this.client = new Groq({ apiKey });
  }

  async query(prompt: string): Promise<AIResponse> {
    try {
      logger.debug('Querying Groq', { promptLength: prompt.length });
      
      const completion = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Updated to current model (replaces decommissioned llama-3.1-70b-versatile)
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      const text = completion.choices[0]?.message?.content || '';
      const citations = extractCitations(text);

      logger.debug('Groq response received', { textLength: text.length, citationsCount: citations.length });
      
      return { text, citations };
    } catch (error) {
      logger.error('Groq query failed', { error });
      throw new Error(`Groq API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * AI Service Factory
 * Creates and manages AI provider instances
 */
class AIService {
  private providers: Map<AIProvider, OpenAIProvider | AnthropicProvider | GroqProvider> = new Map();

  constructor() {
    // Initialize providers if API keys are available
    if (process.env.OPENAI_API_KEY) {
      try {
        this.providers.set('openai', new OpenAIProvider(process.env.OPENAI_API_KEY));
      } catch (error) {
        logger.warn('OpenAI provider initialization failed', { error });
      }
    }

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.providers.set('anthropic', new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
      } catch (error) {
        logger.warn('Anthropic provider initialization failed', { error });
      }
    }

    if (process.env.GROQ_API_KEY) {
      try {
        this.providers.set('groq', new GroqProvider(process.env.GROQ_API_KEY));
      } catch (error) {
        logger.warn('Groq provider initialization failed', { error });
      }
    }
  }

  /**
   * Query AI with specified provider
   * @param provider - AI provider to use
   * @param category - Category being queried
   * @param brands - Brands to track
   * @returns AI response with text and citations
   */
  async queryAI(
    provider: AIProvider,
    category: string,
    brands: string[]
  ): Promise<AIResponse> {
    const providerInstance = this.providers.get(provider);
    
    if (!providerInstance) {
      throw new Error(`Provider ${provider} is not configured or available. Please check your API keys.`);
    }

    const prompt = generateVisibilityPrompt(category, brands);
    logger.info(`Querying ${provider} for category: ${category}`, { brandsCount: brands.length });
    
    return await providerInstance.query(prompt);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }
}

// Singleton instance
const aiService = new AIService();
export default aiService;

