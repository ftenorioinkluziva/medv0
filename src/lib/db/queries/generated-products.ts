import { desc, eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { generatedProducts, healthAgents } from '@/lib/db/schema'

export type ProductType = 'supplementation' | 'meals' | 'workout'

export interface GeneratedProductWithAgent {
  id: string
  productType: string
  content: unknown
  status: string
  errorMessage: string | null
  tokensUsed: number | null
  durationMs: number | null
  createdAt: Date
  updatedAt: Date
  agentName: string
}

export async function getLatestProductByType(
  userId: string,
  productType: ProductType,
): Promise<GeneratedProductWithAgent | null> {
  const rows = await db
    .select({
      id: generatedProducts.id,
      productType: generatedProducts.productType,
      content: generatedProducts.content,
      status: generatedProducts.status,
      errorMessage: generatedProducts.errorMessage,
      tokensUsed: generatedProducts.tokensUsed,
      durationMs: generatedProducts.durationMs,
      createdAt: generatedProducts.createdAt,
      updatedAt: generatedProducts.updatedAt,
      agentName: healthAgents.name,
    })
    .from(generatedProducts)
    .innerJoin(healthAgents, eq(generatedProducts.agentId, healthAgents.id))
    .where(
      and(
        eq(generatedProducts.userId, userId),
        eq(generatedProducts.productType, productType),
        eq(generatedProducts.status, 'completed'),
      ),
    )
    .orderBy(desc(generatedProducts.createdAt))
    .limit(1)

  return rows[0] ?? null
}

export async function getLatestProductsSummary(
  userId: string,
): Promise<{ productType: string; createdAt: Date; status: string }[]> {
  const types: ProductType[] = ['supplementation', 'meals', 'workout']
  const results = await Promise.all(
    types.map(async (type) => {
      const [row] = await db
        .select({
          productType: generatedProducts.productType,
          createdAt: generatedProducts.createdAt,
          status: generatedProducts.status,
        })
        .from(generatedProducts)
        .where(
          and(
            eq(generatedProducts.userId, userId),
            eq(generatedProducts.productType, type),
          ),
        )
        .orderBy(desc(generatedProducts.createdAt))
        .limit(1)
      return row ?? null
    }),
  )
  return results.filter(Boolean) as { productType: string; createdAt: Date; status: string }[]
}
