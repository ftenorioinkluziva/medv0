import { generateText, Output } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

const MAX_CONTENT_CHARS = 200_000

const MedicalDocumentSchema = z.object({
  documentType: z.string(),
  examDate: z.string().optional(),
  overallSummary: z.string(),
  patientInfo: z.object({
    age: z.number().optional(),
    gender: z.string().optional(),
  }),
  providerInfo: z
    .object({
      laboratory: z.string().optional(),
      requestingPhysician: z.string().optional(),
    })
    .optional(),
  modules: z.array(
    z.object({
      moduleName: z.string(),
      category: z.string(),
      status: z.enum(['normal', 'high', 'low', 'abnormal', 'borderline', 'n/a']),
      summary: z.string(),
      parameters: z.array(
        z.object({
          name: z.string(),
          value: z.union([z.string(), z.number()]),
          unit: z.string().optional(),
          referenceRange: z.string().optional(),
          status: z
            .enum(['normal', 'high', 'low', 'abnormal', 'borderline', 'n/a'])
            .optional(),
        }),
      ),
    }),
  ),
})

export type SanitizedMedicalDocument = z.infer<typeof MedicalDocumentSchema>

const FALLBACK: SanitizedMedicalDocument = {
  documentType: 'UNKNOWN',
  overallSummary: 'Não foi possível extrair os dados',
  patientInfo: {},
  modules: [],
}

const SYSTEM_PROMPT = `Você é um especialista em análise de documentos médicos.
Extraia os dados do documento com máxima precisão numérica.
- Datas no formato ISO (YYYY-MM-DD)
- Unidades de medida conforme o documento original
- Valores numéricos sem arredondamento
- Nunca inclua nome completo, CPF, RG ou qualquer PII do paciente
- Se um campo não existir no documento, omita-o ou use null`

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) })
  const document = await loadingTask.promise

  try {
    const chunks: string[] = []

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const textContent = await page.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      })

      const lines: string[] = []
      let lastY: number | null = null

      for (const item of textContent.items as Array<{ str?: string; transform?: number[] }>) {
        if (!item.str) continue

        const y = item.transform?.[5] ?? null
        if (lastY === null || y === null || y === lastY) {
          const index = lines.length - 1
          if (index >= 0) {
            lines[index] = `${lines[index]}${item.str}`
          } else {
            lines.push(item.str)
          }
        } else {
          lines.push(item.str)
        }

        lastY = y
      }

      chunks.push(lines.join('\n'))
    }

    return chunks.join('\n\n')
  } finally {
    await document.destroy()
  }
}

function truncateWithWarning(text: string): string {
  if (text.length <= MAX_CONTENT_CHARS) return text
  const truncated = text.slice(0, MAX_CONTENT_CHARS)
  return `${truncated}\n\n[AVISO: Documento truncado em ${MAX_CONTENT_CHARS} caracteres]`
}

export async function extractMedicalDocument(
  content: Buffer | string,
  fileName: string,
  mimeType: string,
): Promise<SanitizedMedicalDocument> {
  try {
    const isImage = mimeType === 'image/jpeg' || mimeType === 'image/png'
    const isPdf = mimeType === 'application/pdf'

    let userContent: string | Array<{ type: 'image'; image: string; mediaType: string } | { type: 'text'; text: string }>

    if (isImage) {
      userContent = [
        {
          type: 'image' as const,
          image: typeof content === 'string' ? content : content.toString('base64'),
          mediaType: mimeType,
        },
        {
          type: 'text' as const,
          text: `Analise este documento médico chamado "${fileName}" e extraia os dados estruturados.`,
        },
      ]
    } else if (isPdf) {
      const pdfBuffer = typeof content === 'string' ? Buffer.from(content, 'base64') : content
      const rawText = await extractTextFromPdf(pdfBuffer)
      userContent = `Analise este documento médico chamado "${fileName}":\n\n${truncateWithWarning(rawText)}`
    } else {
      const text = typeof content === 'string' ? content : content.toString('utf-8')
      userContent = `Analise este documento médico chamado "${fileName}":\n\n${truncateWithWarning(text)}`
    }

    const { output } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
      output: Output.object({ schema: MedicalDocumentSchema }),
      temperature: 0.1,
    })

    return output
  } catch (err) {
    console.error('[extractor] extractMedicalDocument failed:', err)
    return FALLBACK
  }
}
