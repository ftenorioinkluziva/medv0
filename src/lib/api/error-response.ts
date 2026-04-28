import { NextResponse } from 'next/server'

export function errorResponse(message: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json(
    details === undefined ? { error: message } : { error: message, details },
    { status },
  )
}
