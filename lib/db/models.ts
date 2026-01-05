/**
 * Database Models/DAOs
 * Follows cursor rules: use model/DAO patterns, parameterized queries
 * Automatically uses Supabase models when Supabase is configured
 */

import { query, isUsingSupabase } from './connection';
import logger from '@/lib/logger';
import {
  SupabaseBrandModel,
  SupabasePromptRunModel,
  SupabaseMentionModel,
} from './supabase-models';

export interface Brand {
  id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface PromptRun {
  id: number;
  category: string;
  prompt: string;
  raw_response: string;
  ai_provider: string;
  created_at: Date;
}

export interface Mention {
  id: number;
  prompt_run_id: number;
  brand_id: number;
  mentioned: boolean;
  mention_count: number;
  context: string[];
  citation_urls: string[];
  created_at: Date;
}

/**
 * Brand Model
 * Automatically uses Supabase when available, falls back to PostgreSQL
 */
export class BrandModel {
  /**
   * Get or create a brand by name
   */
  static async getOrCreate(name: string): Promise<Brand> {
    if (isUsingSupabase()) {
      return SupabaseBrandModel.getOrCreate(name);
    }

    try {
      // Try to get existing brand
      const existing = await query(
        'SELECT * FROM brands WHERE LOWER(name) = LOWER($1)',
        [name]
      );

      if (existing.rows.length > 0) {
        return existing.rows[0] as Brand;
      }

      // Create new brand
      const result = await query(
        'INSERT INTO brands (name) VALUES ($1) RETURNING *',
        [name]
      );

      logger.debug('Brand created', { brandId: result.rows[0].id, name });
      return result.rows[0] as Brand;
    } catch (error) {
      logger.error('Error getting or creating brand', { error, name });
      throw error;
    }
  }

  /**
   * Get all brands
   */
  static async getAll(): Promise<Brand[]> {
    if (isUsingSupabase()) {
      return SupabaseBrandModel.getAll();
    }

    try {
      const result = await query('SELECT * FROM brands ORDER BY name');
      return result.rows as Brand[];
    } catch (error) {
      logger.error('Error getting all brands', { error });
      throw error;
    }
  }

  /**
   * Get brand by ID
   */
  static async getById(id: number): Promise<Brand | null> {
    if (isUsingSupabase()) {
      return SupabaseBrandModel.getById(id);
    }

    try {
      const result = await query('SELECT * FROM brands WHERE id = $1', [id]);
      return result.rows.length > 0 ? (result.rows[0] as Brand) : null;
    } catch (error) {
      logger.error('Error getting brand by ID', { error, id });
      throw error;
    }
  }
}

/**
 * PromptRun Model
 * Automatically uses Supabase when available, falls back to PostgreSQL
 */
export class PromptRunModel {
  /**
   * Create a new prompt run
   */
  static async create(
    category: string,
    prompt: string,
    rawResponse: string,
    aiProvider: string
  ): Promise<PromptRun> {
    if (isUsingSupabase()) {
      return SupabasePromptRunModel.create(category, prompt, rawResponse, aiProvider);
    }

    try {
      const result = await query(
        'INSERT INTO prompt_runs (category, prompt, raw_response, ai_provider) VALUES ($1, $2, $3, $4) RETURNING *',
        [category, prompt, rawResponse, aiProvider]
      );

      logger.debug('Prompt run created', { 
        promptRunId: result.rows[0].id, 
        category,
        provider: aiProvider 
      });
      
      return result.rows[0] as PromptRun;
    } catch (error) {
      logger.error('Error creating prompt run', { error });
      throw error;
    }
  }

  /**
   * Get prompt run by ID
   */
  static async getById(id: number): Promise<PromptRun | null> {
    if (isUsingSupabase()) {
      return SupabasePromptRunModel.getById(id);
    }

    try {
      const result = await query('SELECT * FROM prompt_runs WHERE id = $1', [id]);
      return result.rows.length > 0 ? (result.rows[0] as PromptRun) : null;
    } catch (error) {
      logger.error('Error getting prompt run by ID', { error, id });
      throw error;
    }
  }

  /**
   * Get all prompt runs with pagination
   */
  static async getAll(limit: number = 50, offset: number = 0): Promise<PromptRun[]> {
    if (isUsingSupabase()) {
      return SupabasePromptRunModel.getAll(limit, offset);
    }

    try {
      const result = await query(
        'SELECT * FROM prompt_runs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      return result.rows as PromptRun[];
    } catch (error) {
      logger.error('Error getting all prompt runs', { error });
      throw error;
    }
  }

  /**
   * Get prompt runs count
   */
  static async getCount(): Promise<number> {
    if (isUsingSupabase()) {
      return SupabasePromptRunModel.getCount();
    }

    try {
      const result = await query('SELECT COUNT(*) as count FROM prompt_runs');
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error getting prompt runs count', { error });
      throw error;
    }
  }
}

/**
 * Mention Model
 * Automatically uses Supabase when available, falls back to PostgreSQL
 */
export class MentionModel {
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
    if (isUsingSupabase()) {
      return SupabaseMentionModel.createOrUpdate(
        promptRunId,
        brandId,
        mentioned,
        mentionCount,
        context,
        citationUrls
      );
    }

    try {
      const result = await query(
        `INSERT INTO mentions (prompt_run_id, brand_id, mentioned, mention_count, context, citation_urls)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (prompt_run_id, brand_id)
         DO UPDATE SET
           mentioned = EXCLUDED.mentioned,
           mention_count = EXCLUDED.mention_count,
           context = EXCLUDED.context,
           citation_urls = EXCLUDED.citation_urls
         RETURNING *`,
        [promptRunId, brandId, mentioned, mentionCount, context, citationUrls]
      );

      logger.debug('Mention created/updated', { 
        mentionId: result.rows[0].id,
        promptRunId,
        brandId,
        mentioned 
      });
      
      return result.rows[0] as Mention;
    } catch (error) {
      logger.error('Error creating/updating mention', { error });
      throw error;
    }
  }

  /**
   * Get mentions for a prompt run
   */
  static async getByPromptRunId(promptRunId: number): Promise<Mention[]> {
    if (isUsingSupabase()) {
      return SupabaseMentionModel.getByPromptRunId(promptRunId);
    }

    try {
      const result = await query(
        `SELECT m.*, b.name as brand_name
         FROM mentions m
         JOIN brands b ON m.brand_id = b.id
         WHERE m.prompt_run_id = $1
         ORDER BY m.mention_count DESC`,
        [promptRunId]
      );
      return result.rows as Mention[];
    } catch (error) {
      logger.error('Error getting mentions by prompt run ID', { error, promptRunId });
      throw error;
    }
  }

  /**
   * Get all mentions for a brand
   */
  static async getByBrandId(brandId: number): Promise<Mention[]> {
    if (isUsingSupabase()) {
      return SupabaseMentionModel.getByBrandId(brandId);
    }

    try {
      const result = await query(
        'SELECT * FROM mentions WHERE brand_id = $1 ORDER BY created_at DESC',
        [brandId]
      );
      return result.rows as Mention[];
    } catch (error) {
      logger.error('Error getting mentions by brand ID', { error, brandId });
      throw error;
    }
  }
}

