'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { MessageResponse } from '@/components/ai-elements/message'

interface ReportSection {
  title: string
  content: string
}

const EXPANDED_KEYWORDS = ['resumo executivo', 'evolução', 'evolucao']

function parseSections(markdown: string): ReportSection[] {
  const lines = markdown.split('\n')
  const sections: ReportSection[] = []
  let currentTitle = ''
  let currentLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentTitle) {
        sections.push({ title: currentTitle, content: currentLines.join('\n').trim() })
      }
      currentTitle = line.replace(/^## /, '').trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  if (currentTitle) {
    sections.push({ title: currentTitle, content: currentLines.join('\n').trim() })
  }

  return sections
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

  const defaultOpen = sections
    .filter(({ title }) =>
      EXPANDED_KEYWORDS.some((kw) => title.toLowerCase().includes(kw)),
    )
    .map(({ title }) => title)

  return (
    <Accordion multiple defaultValue={defaultOpen} className="space-y-2">
      {sections.map((section) => (
        <AccordionItem
          key={section.title}
          value={section.title}
          className="rounded-lg border bg-card px-4 data-[state=open]:pb-2"
        >
          <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
            {section.title}
          </AccordionTrigger>
          <AccordionContent className="pt-0 pb-2">
            <div className="text-sm">
              <MessageResponse content={section.content} />
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
