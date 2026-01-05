/**
 * Supabase-specific database models
 * Uses Supabase client for database operations
 * Follows cursor rules: parameterized queries, model/DAO patterns
 */

import { getSupabaseClient, isUsingSupabase } from './connection';
import logger from '@/lib/logger';
import type { Brand, PromptRun, Mention } from './models';

/**
 * Supabase Brand Model
 */
export class SupabaseBrandModel {
  /**
   * Get or create a brand by name
   */
  static async getOrCreate(name: string): Promise<Brand> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      // Try to get existing brand (case-insensitive)
      const { data: existing, error: selectError } = await supabase
        .from('brands')
        .select('*')
        .ilike('name', name)
        .limit(1)
        .single();

      if (existing && !selectError) {
        return existing as Brand;
      }

      // Create new brand
      const { data: newBrand, error: insertError } = await supabase
        .from('brands')
        .insert({ name })
        .select('*')
        .single();

      if (insertError) {
        // If unique constraint violation, try to fetch again
        if (insertError.code === '23505') {
          const { data: fetched } = await supabase
            .from('brands')
            .select('*')
            .ilike('name', name)
            .limit(1)
            .single();
          if (fetched) return fetched as Brand;
        }
        throw insertError;
      }

      logger.debug('Brand created via Supabase', { brandId: newBrand?.id, name });
      return newBrand as Brand;
    } catch (error) {
      logger.error('Error getting or creating brand via Supabase', { error, name });
      throw error;
    }
  }

  /**
   * Get all brands
   */
  static async getAll(): Promise<Brand[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');

      if (error) throw error;
      return (data || []) as Brand[];
    } catch (error) {
      logger.error('Error getting all brands via Supabase', { error });
      throw error;
    }
  }

  /**
   * Get brand by ID
   */
  static async getById(id: number): Promise<Brand | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data as Brand | null;
    } catch (error) {
      logger.error('Error getting brand by ID via Supabase', { error, id });
      throw error;
    }
  }
}

/**
 * Supabase PromptRun Model
 */
export class SupabasePromptRunModel {
  /**
   * Create a new prompt run
   */
  static async create(
    category: string,
    prompt: string,
    rawResponse: string,
    aiProvider: string
  ): Promise<PromptRun> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await supabase
        .from('prompt_runs')
        .insert({
          category,
          prompt,
          raw_response: rawResponse,
          ai_provider: aiProvider,
        })
        .select()
        .single();

      if (error) throw error;

      logger.debug('Prompt run created via Supabase', {
        promptRunId: data?.id,
        category,
        provider: aiProvider,
      });

      return data as PromptRun;
    } catch (error) {
      logger.error('Error creating prompt run via Supabase', { error });
      throw error;
    }
  }

  /**
   * Get prompt run by ID
   */
  static async getById(id: number): Promise<PromptRun | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await supabase
        .from('prompt_runs')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as PromptRun | null;
    } catch (error) {
      logger.error('Error getting prompt run by ID via Supabase', { error, id });
      throw error;
    }
  }

  /**
   * Get all prompt runs with pagination
   */
  static async getAll(limit: number = 50, offset: number = 0): Promise<PromptRun[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await supabase
        .from('prompt_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data || []) as PromptRun[];
    } catch (error) {
      logger.error('Error getting all prompt runs via Supabase', { error });
      throw error;
    }
  }

  /**
   * Get prompt runs count
   */
  static async getCount(): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { count, error } = await supabase
        .from('prompt_runs')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    } catch (error) {
      logger.error('Error getting prompt runs count via Supabase', { error });
      throw error;
    }
  }
}

/**
 * Supabase Mention Model
 */
export class SupabaseMentionModel {
  /**
   * Create or update a mention
   */
  static async createOrUpdate(
    promptRunId: number,
    brandId: number,
    mentioned: boolean,
    mentionCount: number,
    context: string[],
    citationUrls: string[]
  ): Promise<Mention> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      // Use upsert for create or update
      const { data, error } = await supabase
        .from('mentions')
        .upsert(
          {
            prompt_run_id: promptRunId,
            brand_id: brandId,
            mentioned,
            mention_count: mentionCount,
            context,
            citation_urls: citationUrls,
          },
          {
            onConflict: 'prompt_run_id,brand_id',
          }
        )
        .select()
        .single();

      if (error) throw error;

      logger.debug('Mention created/updated via Supabase', {
        mentionId: data?.id,
        promptRunId,
        brandId,
        mentioned,
      });

      return data as Mention;
    } catch (error) {
      logger.error('Error creating/updating mention via Supabase', { error });
      throw error;
    }
  }

  /**
   * Get mentions for a prompt run
   */
  static async getByPromptRunId(promptRunId: number): Promise<Mention[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await supabase
        .from('mentions')
        .select('*')
        .eq('prompt_run_id', promptRunId)
        .order('mention_count', { ascending: false });

      if (error) throw error;
      return (data || []) as Mention[];
    } catch (error) {
      logger.error('Error getting mentions by prompt run ID via Supabase', {
        error,
        promptRunId,
      });
      throw error;
    }
  }

  /**
   * Get all mentions for a brand
   */
  static async getByBrandId(brandId: number): Promise<Mention[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await supabase
        .from('mentions')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Mention[];
    } catch (error) {
      logger.error('Error getting mentions by brand ID via Supabase', { error, brandId });
      throw error;
    }
  }
}

