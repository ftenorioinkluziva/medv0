import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { medicalProfiles, documents, livingAnalyses } from '@/lib/db/schema'

export type DashboardProfile = {
  age: number
  gender: string
  height: number
  weight: string
  bodyFatPercentage: string | null
  muscleMass: string | null
  inbodyScore: number | null
}

export type DashboardDocument = {
  id: string
  originalFileName: string
  category: string | null
  examDate: string | null
  processingStatus: string
  createdAt: Date
}

export type DashboardAnalysis = {
  id: string
  reportMarkdown: string
  status: string
  updatedAt: Date
}

export type DashboardQueryResult = {
  profile: DashboardProfile | null
  recentDocs: DashboardDocument[]
  livingAnalysis: DashboardAnalysis | null
}

export async function getDashboardData(userId: string): Promise<DashboardQueryResult> {
  const [profileRows, docsRows, analysisRows] = await Promise.all([
    db
      .select({
        age: medicalProfiles.age,
        gender: medicalProfiles.gender,
        height: medicalProfiles.height,
        weight: medicalProfiles.weight,
        bodyFatPercentage: medicalProfiles.bodyFatPercentage,
        muscleMass: medicalProfiles.muscleMass,
        inbodyScore: medicalProfiles.inbodyScore,
      })
      .from(medicalProfiles)
      .where(eq(medicalProfiles.userId, userId))
      .limit(1),

    db
      .select({
        id: documents.id,
        originalFileName: documents.originalFileName,
        category: documents.category,
        examDate: documents.examDate,
        processingStatus: documents.processingStatus,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt))
      .limit(5),

    db
      .select({
        id: livingAnalyses.id,
        reportMarkdown: livingAnalyses.reportMarkdown,
        status: livingAnalyses.status,
        updatedAt: livingAnalyses.updatedAt,
      })
      .from(livingAnalyses)
      .where(eq(livingAnalyses.userId, userId))
      .limit(1),
  ])

  return {
    profile: profileRows[0] ?? null,
    recentDocs: docsRows.map((d) => ({ ...d, category: d.category ?? null })),
    livingAnalysis: analysisRows[0] ?? null,
  }
}
