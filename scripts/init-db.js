/**
 * Database initialization script (JavaScript version for direct execution)
 * Run with: node scripts/init-db.js
 */
require('dotenv').config();
const { readFileSync } = require('fs');
const { join } = require('path');
const { Pool } = require('pg');

// Use DATABASE_URL if available, otherwise use individual variables
let poolConfig;

if (process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL) {
  // Use connection string (handles special characters automatically)
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  // Remove any trailing quotes if present
  const cleanConnectionString = connectionString.replace(/^["']|["']$/g, '');
  poolConfig = {
    connectionString: cleanConnectionString,
  };
  console.log('Using DATABASE_URL connection string');
} else {
  // Use individual variables
  poolConfig = {
    user: process.env.DB_USER || process.env.PGUSER,
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    database: process.env.DB_NAME || process.env.PGDATABASE,
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
    port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
  };
  console.log('Using individual database variables');
}

const pool = new Pool(poolConfig);

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    console.log('Testing connection...');

    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful');
    console.log('  Server time:', testResult.rows[0].now);

    // Read schema file
    const schemaPath = join(process.cwd(), 'lib', 'db', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema - handle multi-line statements properly
    // Split by semicolon, but preserve function definitions
    const lines = schema.split('\n');
    const statements = [];
    let currentStatement = '';
    let inFunction = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments
      if (trimmed.startsWith('--') || trimmed.length === 0) {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // Check if we're entering a function definition
      if (trimmed.includes('CREATE OR REPLACE FUNCTION') || trimmed.includes('CREATE FUNCTION')) {
        inFunction = true;
      }
      
      // Check if we're exiting a function definition
      if (inFunction && trimmed.includes("$$ language 'plpgsql'")) {
        inFunction = false;
        statements.push(currentStatement.trim());
        currentStatement = '';
        continue;
      }
      
      // Regular statement end (semicolon not in function)
      if (!inFunction && trimmed.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await pool.query(statement);
        const preview = statement.substring(0, 60).replace(/\n/g, ' ');
        console.log(`✓ [${i + 1}/${statements.length}] Executed: ${preview}...`);
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.code === '42P07' || // duplicate_table
            error.code === '42710') { // duplicate_object
          const preview = statement.substring(0, 60).replace(/\n/g, ' ');
          console.log(`⚠ [${i + 1}/${statements.length}] Already exists, skipping: ${preview}...`);
        } else {
          console.error(`\n✗ Error executing statement ${i + 1}:`);
          console.error(`Statement: ${statement.substring(0, 200)}...`);
          throw error;
        }
      }
    }

    console.log('✓ Database initialized successfully!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Database initialization failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Troubleshooting tips:');
      console.error('  1. Check if your Supabase project is active (not paused)');
      console.error('  2. Verify the DATABASE_URL hostname is correct');
      console.error('  3. Try using the connection pooler format:');
      console.error('     postgresql://postgres:[password]@[project-ref].supabase.co:6543/postgres');
      console.error('  4. Check your internet connection');
    } else if (error.message.includes('password')) {
      console.error('\n💡 Password error - make sure special characters are URL-encoded');
    } else if (error.message.includes('authentication')) {
      console.error('\n💡 Authentication failed - check your database password');
    }
    
    await pool.end();
    process.exit(1);
  }
}

initializeDatabase();

