export const REQUIRED_SECTIONS = [
  '## 📋 Resumo Executivo',
  '## 🔍 Análise Detalhada por Eixos Funcionais',
  '## ⚠️ Padrões e Pontos de Atenção',
  '## 💡 Insights e Hipóteses de Causa Raiz',
  '## 📚 Recomendações Educacionais',
] as const

export function validateReportSections(markdown: string): string[] {
  const missing = REQUIRED_SECTIONS.filter((section) => !markdown.includes(section))
  if (missing.length > 0) {
    console.warn('[validate-report-sections] Missing sections:', missing)
  }
  return missing
}
