import { NextRequest, NextResponse } from 'next/server';
import {
  authorizePermanentDeletion,
  PermanentDeletionError,
  retryPendingDeletionJobs,
} from '@/lib/server/permanent-deletion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { service, url } = await authorizePermanentDeletion(request);
    const result = await retryPendingDeletionJobs(service, url);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (cause) {
    const status = cause instanceof PermanentDeletionError ? cause.status : 500;
    const error = cause instanceof PermanentDeletionError
      ? cause.message : 'Não foi possível processar a limpeza de fotografias.';
    return NextResponse.json({ error }, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
