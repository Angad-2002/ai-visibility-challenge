/**
 * GET /api/metrics
 * Returns aggregated dashboard metrics
 * Follows cursor rules: uses service layer, consistent JSON response
 */
import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/services/visibility-service';
import logger from '@/lib/logger';

export async function GET() {
  try {
    logger.debug('Fetching dashboard metrics');
    
    const metrics = await getMetrics();

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Error fetching metrics', { error });
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

