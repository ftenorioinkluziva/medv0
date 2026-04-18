import { generateText, Output } from 'ai'
import { z } from 'zod'
import { resolveModel } from '@/lib/ai/core/resolve-model'

const MAX_CONTENT_CHARS = 200_000
const DEFAULT_EXTRACTION_MODEL = 'google/gemini-2.5-flash'
const EXTRACTION_MODEL = resolveExtractionModel(process.env.DOCUMENT_EXTRACTION_MODEL)

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

export const EXTRACTION_FAILURE_SUMMARY = 'Não foi possível extrair os dados'

const FALLBACK: SanitizedMedicalDocument = {
  documentType: 'UNKNOWN',
  overallSummary: EXTRACTION_FAILURE_SUMMARY,
  patientInfo: {},
  modules: [],
}

export function hasUsableMedicalDocumentData(document: SanitizedMedicalDocument | null | undefined): boolean {
  if (!document) return false

  const hasKnownType = document.documentType.trim() !== '' && document.documentType !== 'UNKNOWN'
  const hasMeaningfulSummary =
    document.overallSummary.trim() !== '' && document.overallSummary !== EXTRACTION_FAILURE_SUMMARY
  const hasPatientInfo = Object.keys(document.patientInfo).length > 0
  const hasProviderInfo = Object.keys(document.providerInfo ?? {}).length > 0
  const hasExtractedParameters = document.modules.some((module) => module.parameters.length > 0)

  if (hasExtractedParameters) return true
  if (hasPatientInfo || hasProviderInfo) return true
  if (hasKnownType && hasMeaningfulSummary) return true

  return false
}

const SYSTEM_PROMPT = `Você é um especialista em análise de documentos médicos.
Extraia os dados do documento com máxima precisão numérica.
- Datas no formato ISO (YYYY-MM-DD)
- Unidades de medida conforme o documento original
- Valores numéricos sem arredondamento
- Nunca inclua nome completo, CPF, RG ou qualquer PII do paciente
- Se um campo não existir no documento, omita-o ou use null`

type ExtractionMessageContent =
  | string
  | Array<
      | { type: 'image'; image: string; mediaType: string }
      | { type: 'text'; text: string }
      | { type: 'file'; data: string; mediaType: string }
    >

function resolveExtractionModel(rawModel?: string): string {
  if (!rawModel) return DEFAULT_EXTRACTION_MODEL

  const normalized = rawModel.trim()
  const slashIndex = normalized.indexOf('/')

  if (slashIndex <= 0 || slashIndex === normalized.length - 1) {
    console.warn(
      `[extractor] Invalid DOCUMENT_EXTRACTION_MODEL "${rawModel}", falling back to ${DEFAULT_EXTRACTION_MODEL}`,
    )
    return DEFAULT_EXTRACTION_MODEL
  }

  return normalized
}

function truncateWithWarning(text: string): string {
  if (text.length <= MAX_CONTENT_CHARS) return text
  const truncated = text.slice(0, MAX_CONTENT_CHARS)
  return `${truncated}\n\n[AVISO: Documento truncado em ${MAX_CONTENT_CHARS} caracteres]`
}

function extractJsonBlock(text: string): string | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

async function tryExtractWithSchema(
  userContent: ExtractionMessageContent,
): Promise<SanitizedMedicalDocument> {
  const { output } = await generateText({
    model: resolveModel(EXTRACTION_MODEL),
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
    output: Output.object({ schema: MedicalDocumentSchema }),
    temperature: 0.1,
  })

  return output
}

async function tryExtractWithJsonFallback(
  userContent: ExtractionMessageContent,
): Promise<SanitizedMedicalDocument> {
  const fallbackPrompt =
    'Retorne APENAS um JSON válido (sem markdown) com os campos: documentType, examDate?, overallSummary, patientInfo, providerInfo?, modules[].'

  const { text } = await generateText({
    model: resolveModel(EXTRACTION_MODEL),
    system: `${SYSTEM_PROMPT}\n${fallbackPrompt}`,
    messages: [{ role: 'user', content: userContent }],
    temperature: 0.1,
  })

  const jsonBlock = extractJsonBlock(text)
  if (!jsonBlock) throw new Error('No JSON object found in fallback extraction')

  const parsed = JSON.parse(jsonBlock)
  const validated = MedicalDocumentSchema.safeParse(parsed)
  if (!validated.success) throw new Error('Fallback JSON did not match MedicalDocumentSchema')

  return validated.data
}

export async function extractMedicalDocument(
  content: Buffer | string,
  fileName: string,
  mimeType: string,
): Promise<SanitizedMedicalDocument> {
  try {
    const isImage = mimeType === 'image/jpeg' || mimeType === 'image/png'
    const isPdf = mimeType === 'application/pdf'

    let userContent: ExtractionMessageContent

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
      userContent = [
        {
          type: 'file' as const,
          data: pdfBuffer.toString('base64'),
          mediaType: 'application/pdf',
        },
        {
          type: 'text' as const,
          text: `Analise este PDF médico chamado "${fileName}" e extraia os dados estruturados com OCR quando necessário.`,
        },
      ]
    } else {
      const text = typeof content === 'string' ? content : content.toString('utf-8')
      userContent = `Analise este documento médico chamado "${fileName}":\n\n${truncateWithWarning(text)}`
    }

    try {
      return await tryExtractWithSchema(userContent)
    } catch (firstError) {
      try {
        return await tryExtractWithJsonFallback(userContent)
      } catch (secondError) {
        console.error('[extractor] structured extraction failed on both attempts:', {
          firstError,
          secondError,
        })
        return FALLBACK
      }
    }
  } catch (err) {
    console.error('[extractor] extractMedicalDocument failed:', err)
    return FALLBACK
  }
}
