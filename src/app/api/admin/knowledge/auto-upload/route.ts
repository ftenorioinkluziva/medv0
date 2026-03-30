import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { upsertKnowledgeArticle } from '@/lib/ai/rag/uploader'

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
  tags: z.array(z.string()).optional(),
  language: z.string().default('pt-BR'),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.KNOWLEDGE_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const result = await upsertKnowledgeArticle({
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

  return NextResponse.json({
    success: true,
    articleId: result.articleId,
    chunksCreated: result.chunksCreated,
    action: result.action,
  })
}
