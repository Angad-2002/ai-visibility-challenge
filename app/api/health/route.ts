/**
 * GET /api/health
 * Health check endpoint
 */
import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db/connection';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const dbConnected = await testConnection();
    
    return NextResponse.json({
      success: true,
      status: 'healthy',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

