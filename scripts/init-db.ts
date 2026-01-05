/**
 * Database initialization script
 * Creates tables and indexes for the AI Visibility Tracker
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { query, testConnection } from '../lib/db/connection';
import logger from '../lib/logger';

async function initializeDatabase() {
  try {
    logger.info('Initializing database...');

    // Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database. Please check your connection settings.');
    }

    // Read schema file
    const schemaPath = join(process.cwd(), 'lib', 'db', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema (split by semicolons and execute each statement)
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await query(statement);
        logger.debug('Executed SQL statement', { statement: statement.substring(0, 50) });
      } catch (error) {
        // Ignore "already exists" errors
        if (error instanceof Error && error.message.includes('already exists')) {
          logger.debug('Table/index already exists, skipping');
        } else {
          throw error;
        }
      }
    }

    logger.info('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Database initialization failed', { error });
    process.exit(1);
  }
}

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

initializeDatabase();

