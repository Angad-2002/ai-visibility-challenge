import { Pool, PoolConfig } from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

/**
 * Database connection configuration
 * Supports both direct PostgreSQL and Supabase
 * Uses environment variables for connection details (following cursor rules)
 */

let pool: Pool | null = null;
let supabaseClient: SupabaseClient | null = null;
let useSupabase = false;

/**
 * Initialize database connection
 * Supports both direct PostgreSQL and Supabase
 * Follows cursor rules: reads from environment variables, no hardcoded values
 */
function initializeConnection() {
  // Check if Supabase is configured (either via SUPABASE_URL or DATABASE_URL containing supabase)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  const hasSupabaseUrl = supabaseUrl || (databaseUrl && databaseUrl.includes('supabase'));
  
  if (hasSupabaseUrl) {
    // Use Supabase client
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Supabase URL or key not found, falling back to direct PostgreSQL connection');
      useSupabase = false;
    } else {
      useSupabase = true;
      supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
        },
      });
      logger.info('Supabase client initialized', { url: supabaseUrl.substring(0, 30) + '...' });
      return;
    }
  }

  // Use direct PostgreSQL connection
  useSupabase = false;
  const poolConfig: PoolConfig = {
    connectionString: databaseUrl, // Use connection string if provided
    user: process.env.DB_USER || process.env.PGUSER,
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    database: process.env.DB_NAME || process.env.PGDATABASE,
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
    port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  pool = new Pool(poolConfig);

  // Handle pool errors
  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', { error: err });
  });
  
  logger.info('PostgreSQL connection pool initialized');
}

// Initialize on module load
initializeConnection();

/**
 * Get Supabase client (if using Supabase)
 */
export function getSupabaseClient(): SupabaseClient | null {
  return supabaseClient;
}

/**
 * Check if using Supabase
 */
export function isUsingSupabase(): boolean {
  return useSupabase;
}

/**
 * Test database connection
 * Works with both PostgreSQL and Supabase
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (useSupabase && supabaseClient) {
      // Test Supabase connection
      const { data, error } = await supabaseClient.from('brands').select('count').limit(1);
      if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
        logger.error('Supabase connection failed', { error });
        return false;
      }
      logger.debug('Supabase connection successful');
      return true;
    } else if (pool) {
      // Test PostgreSQL connection
      const result = await pool.query('SELECT NOW()');
      logger.debug('Database connection successful', { timestamp: result.rows[0].now });
      return true;
    } else {
      logger.error('No database connection configured');
      return false;
    }
  } catch (error) {
    logger.error('Database connection failed', { error });
    return false;
  }
}

/**
 * Execute a query with parameterized values
 * Supports both PostgreSQL and Supabase
 * Uses parameterized queries to prevent SQL injection (following cursor rules)
 * @param text - SQL query text
 * @param params - Query parameters
 * @returns Query result
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    if (useSupabase && supabaseClient) {
      // For Supabase, we need to use RPC for custom queries
      // For standard operations, use the Supabase client methods in models
      // This is a fallback for raw SQL queries
      logger.warn('Raw SQL queries with Supabase should use Supabase client methods. Falling back to direct connection.');
      
      // If we have a connection string, try to use it directly
      const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
      if (databaseUrl) {
        const { Pool: DirectPool } = await import('pg');
        const directPool = new DirectPool({ connectionString: databaseUrl });
        const result = await directPool.query(text, params);
        await directPool.end();
        const duration = Date.now() - start;
        logger.debug('Executed query via Supabase connection string', { duration, query: text.substring(0, 100) });
        return result;
      }
      throw new Error('Supabase raw SQL queries require DATABASE_URL');
    } else if (pool) {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { duration, query: text.substring(0, 100) });
      return result;
    } else {
      throw new Error('No database connection available');
    }
  } catch (error) {
    logger.error('Query execution failed', { error, query: text.substring(0, 100) });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * Only works with direct PostgreSQL connections
 */
export function getClient() {
  if (!pool) {
    throw new Error('PostgreSQL pool not available. Use Supabase client methods for Supabase.');
  }
  return pool.connect();
}

/**
 * Close all connections in the pool
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    logger.info('Database pool closed');
  }
  // Supabase client doesn't need explicit closing
}

export default pool;

