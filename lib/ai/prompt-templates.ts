/**
 * AI prompt templates for structured query generation
 * Follows cursor rules: prompts should use templates defined in shared prompt utils
 */

/**
 * Generate a prompt for AI visibility tracking
 * @param category - The category being queried (e.g., "CRM software")
 * @param brands - Array of brand names to track
 * @returns Formatted prompt string
 */
export function generateVisibilityPrompt(category: string, brands: string[]): string {
  const brandsList = brands.join(', ');
  
  return `You are a helpful assistant providing recommendations. When asked about ${category}, please provide a comprehensive answer that mentions specific brands and tools when relevant.

Question: What are the best options for ${category}?

Please provide:
1. A detailed answer mentioning specific brands and tools
2. Include URLs/citations when mentioning brands (format: [brand name](url))
3. Explain the strengths and use cases for each option

Brands to consider: ${brandsList}

Provide a natural, helpful response as if answering a user's question.`;
}

/**
 * Generate a competitor analysis prompt
 * @param category - The category being queried
 * @param mainBrand - The main brand being tracked
 * @param competitorBrands - Array of competitor brand names
 * @returns Formatted prompt string
 */
export function generateCompetitorPrompt(
  category: string,
  mainBrand: string,
  competitorBrands: string[]
): string {
  const competitorsList = competitorBrands.join(', ');
  
  return `You are a helpful assistant providing recommendations. When asked about ${category}, please provide a comprehensive answer that mentions specific brands and tools when relevant.

Question: What are the best options for ${category}?

Please provide:
1. A detailed answer mentioning specific brands and tools
2. Include URLs/citations when mentioning brands (format: [brand name](url))
3. Explain the strengths and use cases for each option

Brands to consider: ${mainBrand}, ${competitorsList}

Provide a natural, helpful response as if answering a user's question.`;
}

