/**
 * POST /api/check-visibility
 * Checks AI visibility for given category and brands
 * Follows cursor rules: validates input, uses service layer, consistent JSON response
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkVisibility, VisibilityResult } from '@/lib/services/visibility-service';
import { AIProvider } from '@/lib/ai/providers';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, brands, provider, isCompetitorMode, mainBrand } = body;

    // Validate input
    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Category is required and must be a string' },
        { status: 400 }
      );
    }

    if (!brands || !Array.isArray(brands) || brands.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Brands array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate provider
    const validProviders: AIProvider[] = ['openai', 'anthropic', 'groq'];
    const aiProvider: AIProvider = validProviders.includes(provider) 
      ? provider 
      : 'openai'; // Default to OpenAI

    // Validate competitor mode
    const competitorMode = Boolean(isCompetitorMode);
    if (competitorMode && !mainBrand) {
      return NextResponse.json(
        { success: false, error: 'Main brand is required when competitor mode is enabled' },
        { status: 400 }
      );
    }

    logger.info('Processing visibility check request', { 
      category, 
      brandsCount: brands.length,
      provider: aiProvider,
      competitorMode 
    });

    // Check visibility using service layer
    const result: VisibilityResult = await checkVisibility(
      category,
      brands,
      aiProvider,
      competitorMode,
      mainBrand
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error checking visibility', { error });
    
    // Return sanitized error message (following cursor rules)
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Internal server error';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

