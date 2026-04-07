import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { knowledgeBase } from '@/lib/db/schema'
import { upsertKnowledgeArticle } from '@/lib/ai/rag/uploader'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const source = request.nextUrl.searchParams.get('source')
  if (!source) {
    return NextResponse.json({ error: 'Missing source param' }, { status: 400 })
  }

  const existing = await db
    .select({ id: knowledgeBase.id })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.source, source))
    .limit(1)

  return NextResponse.json({ exists: existing.length > 0 })
}

export const maxDuration = 60

const MAX_CONTENT_LENGTH = 500_000

const KnowledgeArticleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  summary: z.string().optional(),
  source: z.string().optional(),
  author: z.string().optional(),
  published_date: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z
    .string()
    .transform((val) => val.split(/,\s*/).filter(Boolean))
    .optional(),
  language: z.string().default('pt-BR'),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = KnowledgeArticleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const data = parsed.data

  if (data.content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: 'Content too large. Maximum 500,000 characters.' },
      { status: 413 },
    )
  }

  let result
  try {
    result = await upsertKnowledgeArticle({
      title: data.title,
      content: data.content,
      summary: data.summary,
      source: data.source,
      author: data.author,
      publishedDate: data.published_date,
      category: data.category,
      subcategory: data.subcategory,
      tags: data.tags,
      language: data.language,
    })
  } catch (error) {
    console.error('[auto-upload] upsertKnowledgeArticle failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    articleId: result.articleId,
    chunksCreated: result.chunksCreated,
    action: result.action,
  })
}
