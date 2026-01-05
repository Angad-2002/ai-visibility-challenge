/**
 * GET /api/prompts
 * Returns historical prompts with mention status
 * Follows cursor rules: validates input, uses service layer, consistent JSON response
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPromptsWithMentions } from '@/lib/services/visibility-service';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const brandFilter = searchParams.get('brand');

    // Validate and parse limit
    let limit = 50; // Default
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        limit = parsedLimit;
      } else {
        return NextResponse.json(
          { success: false, error: 'Limit must be a number between 1 and 100' },
          { status: 400 }
        );
      }
    }

    // Validate and parse offset
    let offset = 0; // Default
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        offset = parsedOffset;
      } else {
        return NextResponse.json(
          { success: false, error: 'Offset must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    logger.debug('Fetching historical prompts', { limit, offset, brandFilter });

    // Get prompts with mentions using service layer
    const prompts = await getPromptsWithMentions(limit, offset, brandFilter || undefined);

    return NextResponse.json({
      success: true,
      data: prompts,
    });
  } catch (error) {
    logger.error('Error fetching prompts', { error });

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

