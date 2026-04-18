'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { MessageResponse } from '@/components/ai-elements/message'
import {
  FileText,
  Search,
  AlertTriangle,
  Lightbulb,
  Activity,
  TrendingUp,
  Pill,
  Dumbbell,
  Utensils,
  Heart,
  type LucideIcon,
} from 'lucide-react'

const SECTION_ICONS: Array<{ keywords: string[]; icon: LucideIcon }> = [
  { keywords: ['resumo'], icon: FileText },
  { keywords: ['achado', 'finding'], icon: Search },
  { keywords: ['prioridade', 'risco', 'alerta'], icon: AlertTriangle },
  { keywords: ['recomendaç', 'sugestão', 'plano'], icon: Lightbulb },
  { keywords: ['evolução', 'evolucao', 'progresso'], icon: TrendingUp },
  { keywords: ['atividade', 'exercício', 'treino'], icon: Dumbbell },
  { keywords: ['nutrição', 'alimentação', 'dieta'], icon: Utensils },
  { keywords: ['suplemento', 'medicamento'], icon: Pill },
  { keywords: ['cardio', 'coração', 'cardiovascular'], icon: Heart },
  { keywords: ['exame', 'laboratorial', 'biomarcador'], icon: Activity },
]

function getSectionIcon(title: string): LucideIcon {
  const lower = title.toLowerCase()
  for (const { keywords, icon } of SECTION_ICONS) {
    if (keywords.some((kw) => lower.includes(kw))) return icon
  }
  return FileText
}

interface ReportSection {
  title: string
  content: string
  id: string
}

const EXPANDED_KEYWORDS = ['resumo executivo', 'evolução', 'evolucao']

function parseSections(markdown: string): ReportSection[] {
  const lines = markdown.split('\n')
  const sections: ReportSection[] = []
  let currentTitle = ''
  let currentLines: string[] = []
  let index = 0

  const flush = () => {
    const content = currentLines.join('\n').trim()
    if (content) {
      sections.push({ title: currentTitle, content, id: `section-${index++}` })
    }
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush()
      currentTitle = line.replace(/^## /, '').trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  flush()

  return sections
}

export function parseSectionsForToc(markdown: string): Array<{ id: string; title: string }> {
  return parseSections(markdown).map(({ id, title }) => ({ id, title }))
}

function SectionCard({ section, defaultOpen }: { section: ReportSection; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const Icon = getSectionIcon(section.title)

  return (
    <div className="rounded-lg border bg-card overflow-hidden" id={section.id}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <p className="text-sm font-medium text-foreground truncate">{section.title}</p>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t text-sm leading-relaxed">
          <MessageResponse content={section.content} />
        </div>
      )}
    </div>
  )
}

export function ReportAccordion({ markdown }: { markdown: string }) {
  const sections = parseSections(markdown)

  if (sections.length === 0) {
    return (
      <div className="rounded-lg border bg-card px-6 py-5">
        <MessageResponse content={markdown} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const isDefaultOpen = EXPANDED_KEYWORDS.some((kw) =>
          section.title.toLowerCase().includes(kw),
        )
        return <SectionCard key={section.id} section={section} defaultOpen={isDefaultOpen} />
      })}
    </div>
  )
}
