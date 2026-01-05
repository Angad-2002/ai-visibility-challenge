/**
 * Visibility Service Layer
 * Handles business logic for AI visibility tracking
 * Follows cursor rules: service layer separated from route handlers
 */

import aiService, { AIProvider } from '../ai/providers';
import { BrandModel, PromptRunModel, MentionModel } from '../db/models';
import logger from '@/lib/logger';

export interface BrandMention {
  brand: string;
  count: number;
  context: string[];
  citationUrls: string[];
}

export interface VisibilityResult {
  category: string;
  brands: string[];
  mentions: BrandMention[];
  totalMentions: number;
  timestamp: string;
  promptRunId?: number;
}

/**
 * Extract brand mentions from AI response text
 * @param text - The AI response text
 * @param brands - Array of brand names to search for
 * @returns Array of brand mentions with counts and context
 */
function extractBrandMentions(
  text: string,
  brands: string[]
): BrandMention[] {
  const mentions: BrandMention[] = brands.map((brand) => ({
    brand,
    count: 0,
    context: [],
    citationUrls: [],
  }));

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  mentions.forEach((mention) => {
    const brandLower = mention.brand.toLowerCase();
    const regex = new RegExp(`\\b${brandLower}\\b`, 'gi');
    const matches = text.match(regex);
    mention.count = matches ? matches.length : 0;

    // Extract context sentences
    sentences.forEach((sentence) => {
      if (sentence.toLowerCase().includes(brandLower)) {
        mention.context.push(sentence.trim());
      }
    });
  });

  return mentions;
}

/**
 * Check AI visibility for given category and brands
 * @param category - Category to query
 * @param brands - Brands to track
 * @param provider - AI provider to use
 * @param isCompetitorMode - Whether this is competitor impersonation mode
 * @param mainBrand - Main brand (for competitor mode)
 * @returns Visibility result with mentions and metrics
 */
export async function checkVisibility(
  category: string,
  brands: string[],
  provider: AIProvider = 'openai',
  isCompetitorMode: boolean = false,
  mainBrand?: string
): Promise<VisibilityResult> {
  try {
    logger.info('Checking visibility', { 
      category, 
      brandsCount: brands.length, 
      provider,
      isCompetitorMode 
    });

    // Query AI
    const aiResponse = await aiService.queryAI(provider, category, brands);
    
    // Extract brand mentions
    const mentions = extractBrandMentions(aiResponse.text, brands);
    
    // Add citation URLs from AI response
    mentions.forEach((mention) => {
      if (mention.count > 0) {
        // Use citations from AI response
        mention.citationUrls = aiResponse.citations.filter((url: string) => 
          url.toLowerCase().includes(mention.brand.toLowerCase()) ||
          mention.brand.toLowerCase().includes(url.toLowerCase().split('.')[0])
        );
        
        // If no specific citations found, use all citations
        if (mention.citationUrls.length === 0 && aiResponse.citations.length > 0) {
          mention.citationUrls = aiResponse.citations.slice(0, 2);
        }
      }
    });

    const totalMentions = mentions.reduce((sum, m) => sum + m.count, 0);

    // Store in database
    let promptRunId: number | undefined;
    try {
      // Create prompt run
      const prompt = isCompetitorMode && mainBrand
        ? `Competitor analysis for ${category} - Main brand: ${mainBrand}, Competitors: ${brands.join(', ')}`
        : `Visibility check for ${category} - Brands: ${brands.join(', ')}`;
      
      const promptRun = await PromptRunModel.create(
        category,
        prompt,
        aiResponse.text,
        provider
      );
      promptRunId = promptRun.id;

      // Store brands and mentions
      for (const brandName of brands) {
        const brand = await BrandModel.getOrCreate(brandName);
        const mention = mentions.find(m => m.brand.toLowerCase() === brandName.toLowerCase());
        
        await MentionModel.createOrUpdate(
          promptRun.id,
          brand.id,
          mention ? mention.count > 0 : false,
          mention ? mention.count : 0,
          mention ? mention.context : [],
          mention ? mention.citationUrls : []
        );
      }

      logger.info('Visibility check stored in database', { promptRunId });
    } catch (dbError) {
      logger.warn('Failed to store visibility check in database', { error: dbError });
      // Continue even if DB storage fails
    }

    const result: VisibilityResult = {
      category,
      brands,
      mentions,
      totalMentions,
      timestamp: new Date().toISOString(),
      promptRunId,
    };

    return result;
  } catch (error) {
    logger.error('Error checking visibility', { error });
    throw error;
  }
}

/**
 * Get aggregated metrics for dashboard
 */
export async function getMetrics() {
  try {
    const promptRunsCount = await PromptRunModel.getCount();
    const brands = await BrandModel.getAll();
    
    return {
      promptsTracked: promptRunsCount,
      brandsTracked: brands.length,
    };
  } catch (error) {
    logger.error('Error getting metrics', { error });
    throw error;
  }
}

export interface PromptWithMentions {
  id: number;
  category: string;
  prompt: string;
  aiProvider: string;
  timestamp: string;
  brands: Array<{
    brandName: string;
    mentioned: boolean;
    mentionCount: number;
  }>;
}

/**
 * Get historical prompts with mention status
 * @param limit - Maximum number of prompts to return
 * @param offset - Number of prompts to skip
 * @param brandFilter - Optional brand name to filter by
 * @returns Array of prompts with their mention status
 */
export async function getPromptsWithMentions(
  limit: number = 50,
  offset: number = 0,
  brandFilter?: string
): Promise<PromptWithMentions[]> {
  try {
    logger.debug('Fetching prompts with mentions', { limit, offset, brandFilter });
    
    // Get prompt runs
    const promptRuns = await PromptRunModel.getAll(limit, offset);
    
    // Get all mentions for these prompt runs
    const promptsWithMentions: PromptWithMentions[] = [];
    
    for (const promptRun of promptRuns) {
      // Get mentions for this prompt run
      const mentions = await MentionModel.getByPromptRunId(promptRun.id);
      
      // Get brand names for mentions
      const brandMentions = await Promise.all(
        mentions.map(async (mention: { brand_id: number; mentioned: boolean; mention_count: number }) => {
          const brand = await BrandModel.getById(mention.brand_id);
          return {
            brandName: brand?.name || 'Unknown',
            mentioned: mention.mentioned,
            mentionCount: mention.mention_count,
          };
        })
      );
      
      // Filter by brand if specified
      if (brandFilter) {
        const hasBrand = brandMentions.some(
          (bm: { brandName: string; mentioned: boolean; mentionCount: number }) => 
            bm.brandName.toLowerCase() === brandFilter.toLowerCase()
        );
        if (!hasBrand) continue;
      }
      
      // Handle created_at which might be a Date object or string (from Supabase)
      const timestamp = promptRun.created_at instanceof Date
        ? promptRun.created_at.toISOString()
        : typeof promptRun.created_at === 'string'
        ? promptRun.created_at
        : new Date(promptRun.created_at).toISOString();

      promptsWithMentions.push({
        id: promptRun.id,
        category: promptRun.category,
        prompt: promptRun.prompt,
        aiProvider: promptRun.ai_provider,
        timestamp,
        brands: brandMentions,
      });
    }
    
    logger.debug('Fetched prompts with mentions', { count: promptsWithMentions.length });
    return promptsWithMentions;
  } catch (error) {
    logger.error('Error getting prompts with mentions', { error });
    throw error;
  }
}

