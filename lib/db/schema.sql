-- AI Visibility Tracker Database Schema
-- PostgreSQL database schema for storing brands, prompt runs, and mentions

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prompt runs table
CREATE TABLE IF NOT EXISTS prompt_runs (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  raw_response TEXT NOT NULL,
  ai_provider VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mentions table (association between prompt runs and brands)
CREATE TABLE IF NOT EXISTS mentions (
  id SERIAL PRIMARY KEY,
  prompt_run_id INTEGER NOT NULL REFERENCES prompt_runs(id) ON DELETE CASCADE,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  mentioned BOOLEAN NOT NULL DEFAULT false,
  mention_count INTEGER NOT NULL DEFAULT 0,
  context TEXT[],
  citation_urls TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(prompt_run_id, brand_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mentions_prompt_run_id ON mentions(prompt_run_id);
CREATE INDEX IF NOT EXISTS idx_mentions_brand_id ON mentions(brand_id);
CREATE INDEX IF NOT EXISTS idx_prompt_runs_created_at ON prompt_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_runs_category ON prompt_runs(category);
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

