export function buildChatSystemPrompt(
  agentSystemPrompt: string,
  patientContext: string,
  knowledgeContext: string,
): string {
  const parts = [agentSystemPrompt]

  if (knowledgeContext) {
    parts.push(`\n\n## Conhecimento Especializado\n${knowledgeContext}`)
  }

  if (patientContext) {
    parts.push(`\n\n## Dados do Paciente\n${patientContext}`)
  }

  parts.push(
    '\n\n---\nEsta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional.',
  )

  return parts.join('')
}
