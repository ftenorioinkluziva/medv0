export function buildChatSystemPrompt(
  agentSystemPrompt: string,
  analysisContext: string | null,
  knowledgeContext: string,
): string {
  const parts = [agentSystemPrompt]

  if (knowledgeContext) {
    parts.push(`\n\n## Conhecimento Especializado\n${knowledgeContext}`)
  }

  if (analysisContext) {
    parts.push(`\n\n## Contexto da Última Análise do Paciente\n${analysisContext}`)
  }

  parts.push(
    '\n\n---\nEsta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional.',
  )

  return parts.join('')
}
