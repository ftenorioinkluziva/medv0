# UI Specs — SAMI v1.1

| Date | Author | Status | Depends On |
|------|--------|--------|------------|
| 2026-04-08 | Uma (UX Design Expert) | Proposed | PRD v1.1, ADR v1.1, Schema v1.1 |

---

## Design System Reference

**Existing tokens (from `globals.css`):**

| Token | Dark Mode Value | Usage |
|-------|----------------|-------|
| `--background` | `oklch(0.145 0 0)` | Page background (zinc-950) |
| `--card` | `oklch(0.205 0 0)` | Card surface (zinc-900) |
| `--foreground` | `oklch(0.985 0 0)` | Primary text |
| `--muted-foreground` | `oklch(0.708 0 0)` | Secondary text |
| `--primary` | `oklch(0.922 0 0)` | CTAs, active states |
| `--border` | `oklch(1 0 0 / 10%)` | Dividers, card borders |
| `--destructive` | `oklch(0.704 0.191 22.216)` | Errors, alerts |
| `--success` | `oklch(0.7 0.17 145)` | Positive indicators |
| `--warning` | `oklch(0.78 0.16 85)` | Attention indicators |
| `--info` | `oklch(0.65 0.18 240)` | Informational |

**Typography:** Geist Sans. Headings via `font-heading` (same family).

**Radius:** Base `0.625rem` (10px). Cards use `rounded-xl` (12px) or `rounded-2xl` (16px).

**Spacing pattern (established):** Pages use `p-4 md:p-6`. Cards use `p-4` or `p-5`.

**Component library:** Shadcn UI + Radix + Lucide icons.

**Target viewport:** Mobile-first, primary `390px` width. Desktop as secondary.

---

## 1. Bottom Navigation — Restructured (Story 13.1)

### Current State

3 items: Dashboard, Historico, Perfil.

### New State

5 items: Dashboard, Upload, Chat, Historico, Perfil.

### Spec

```
┌──────────────────────────────────────────────────────┐
│  Dashboard    Upload     Chat    Historico    Perfil  │
│  ┌──────┐   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │Grid  │   │ Plus │  │ Msg  │  │Clock │  │ User │  │
│  │ icon  │   │Circle│  │Circle│  │      │  │      │  │
│  └──────┘   └──────┘  └──────┘  └──────┘  └──────┘  │
└──────────────────────────────────────────────────────┘
```

**Layout:**
- Container: `fixed bottom-0 left-0 right-0 z-50`, `border-t border-border bg-background`
- Height: `calc(4rem + env(safe-area-inset-bottom, 0px))` (unchanged)
- Distribution: `flex items-center justify-around`
- Each item: `min-h-[44px] min-w-[44px]` (WCAG touch target)

**Icons (Lucide):**
- Dashboard: `LayoutDashboard` (unchanged)
- Upload: `PlusCircle` (new)
- Chat: `MessageCircle` (new)
- Historico: `History` (unchanged)
- Perfil: `User` (unchanged)

**States:**
- Active: `text-primary` (unchanged)
- Inactive: `text-muted-foreground hover:text-foreground` (unchanged)

**Typography:** `text-xs` labels below each icon.

**File:** `src/app/app/components/bottom-nav.tsx`

**Implementation notes:**
- With 5 items on 390px, each item gets ~78px width. `px-4` on each item should be reduced to `px-2` to prevent overflow.
- Upload item navigates to `/app/upload`
- Chat item navigates to `/app/chat`

---

## 2. Chat UI — Agent Selection & Conversation (Story 12.2)

### 2a. Chat Home — Agent Selection

**Route:** `/app/chat`

**Layout:** Full-screen, no scroll unless many agents. Header + agent grid.

```
┌──────────────────────────────────────────┐
│ Conversas                                │
│ Tire dúvidas com nossos especialistas    │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ 🧬 Medicina Integrativa             │ │
│ │ Análise funcional holística          │ │
│ │ Última conversa: 2 dias atrás    →  │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ 🥗 Nutrição                         │ │
│ │ Plano alimentar e orientações       │ │
│ │ Nova conversa                    →  │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ 🏋️ Exercício                        │ │
│ │ Treino personalizado                │ │
│ │ Última conversa: 5 horas atrás  →  │ │
│ └──────────────────────────────────────┘ │
│ ...                                      │
└──────────────────────────────────────────┘
```

**Components:**
- Page header: `h1 text-2xl font-bold` + `p text-sm text-muted-foreground`
- Agent cards: `rounded-xl border border-foreground/10 bg-card p-4`
  - Agent name: `text-sm font-semibold text-foreground`
  - Agent specialty/description: `text-xs text-muted-foreground line-clamp-1`
  - Session indicator: `text-[11px] text-muted-foreground` with relative time OR "Nova conversa"
  - Arrow icon: `ArrowRight` `size-4 text-muted-foreground` aligned right
- Empty state: if no active agents, centered message with `MessageCircle` icon + "Nenhum agente disponivel para chat"

**Data source:** `healthAgents` where `isActive = true`, joined with latest `chatSession` per agent for the current user.

**Navigation:** Tap on agent card → navigates to `/app/chat/[agentId]`
- If user has existing session with that agent → resume latest session
- If no session → create new session on first message

**Skeleton:** 4 cards with `Skeleton` component, matching card dimensions.

---

### 2b. Chat Conversation

**Route:** `/app/chat/[agentId]` (optional `?session=<id>` to resume specific session)

**Layout:** Full-screen chat, fixed header + scrollable messages + fixed input.

```
┌──────────────────────────────────────────┐
│ ← Nutrição                    Sessões ▾  │
│   Plano alimentar e orientações          │
├──────────────────────────────────────────┤
│ ⚠ Esta análise é gerada por IA para     │
│ fins educacionais e NÃO substitui        │
│ consulta médica profissional.            │
├──────────────────────────────────────────┤
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ Olá! Sou o agente de Nutrição.      │ │
│ │ Como posso ajudar?                   │ │
│ └──────────────────────────────────────┘ │
│                                          │
│                    ┌─────────────────────┤
│                    │ Quais alimentos     │ │
│                    │ ajudam a baixar o   │ │
│                    │ colesterol?         │ │
│                    └─────────────────────┤
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ Com base na sua última análise e     │ │
│ │ nas evidências da nossa base de      │ │
│ │ conhecimento, recomendo...           │ │
│ │ [streaming response with cursor]     │ │
│ └──────────────────────────────────────┘ │
│                                          │
├──────────────────────────────────────────┤
│ ┌────────────────────────────┐  ┌──────┐ │
│ │ Digite sua mensagem...     │  │  ➤   │ │
│ └────────────────────────────┘  └──────┘ │
└──────────────────────────────────────────┘
```

**Header (fixed top):**
- Back button: `←` (`ChevronLeft` icon) → navigates to `/app/chat`
- Agent name: `text-base font-semibold text-foreground`
- Agent specialty: `text-xs text-muted-foreground`
- Sessions dropdown: `text-xs text-muted-foreground` → sheet/dropdown listing past sessions with this agent

**Disclaimer banner:**
- Position: below header, always visible (not scrollable)
- Style: `bg-warning/10 border border-warning/20 rounded-lg px-3 py-2 mx-4 mt-2`
- Icon: `AlertTriangle` `size-3.5 text-warning` inline
- Text: `text-[11px] text-warning-foreground/80`
- Content: "Esta analise e gerada por IA para fins educacionais e NAO substitui consulta medica profissional."

**Message area (scrollable, flex-1):**
- Container: `flex-1 overflow-y-auto px-4 py-3 space-y-3`
- Assistant message bubble:
  - Alignment: left
  - Style: `rounded-2xl rounded-tl-md bg-card border border-foreground/8 px-4 py-3`
  - Text: `text-sm text-foreground leading-relaxed`
  - Supports Markdown rendering (reuse existing `ReactMarkdown` setup from report view)
- User message bubble:
  - Alignment: right (`ml-auto`)
  - Style: `rounded-2xl rounded-tr-md bg-primary/15 px-4 py-3 max-w-[85%]`
  - Text: `text-sm text-foreground`
- Streaming indicator: pulsing `●●●` in an assistant bubble during response generation
- Timestamp: `text-[10px] text-muted-foreground mt-0.5` below each message (optional, show on tap)

**Input area (fixed bottom, above bottom nav):**
- Container: `fixed bottom-16 left-0 right-0 border-t border-border bg-background px-4 py-3`
  - `bottom-16` accounts for the 4rem bottom nav
- Input: `flex items-center gap-2`
  - Textarea (auto-resize, max 4 lines): `flex-1 rounded-xl border border-foreground/15 bg-card px-4 py-2.5 text-sm resize-none`
  - Send button: `rounded-xl bg-primary p-2.5 text-primary-foreground disabled:opacity-40`
    - Icon: `Send` or `ArrowUp` `size-4`
    - Disabled when: input empty OR streaming in progress
- Submit: Enter sends (mobile keyboard), Shift+Enter for newline

**Session management:**
- "Sessoes" dropdown shows list: title + relative date
- Tap on session → load that session's messages
- Current session highlighted with `text-primary`
- "Nova conversa" option at top of dropdown

**Rate limit feedback:**
- When approaching limit (25/30 messages): `text-[11px] text-warning` subtle notice below input
- When limit reached: input disabled, message: "Limite de mensagens atingido. Tente novamente em [X] minutos."

**Skeleton (loading state):**
- Header with agent name skeleton
- 3 alternating message bubble skeletons (left, right, left)

**Files:**
- `src/app/app/chat/page.tsx` — agent selection
- `src/app/app/chat/[agentId]/page.tsx` — conversation
- `src/app/app/chat/[agentId]/chat-view.tsx` — client component with `useChat` from AI SDK
- `src/app/app/chat/[agentId]/message-bubble.tsx` — message rendering

---

## 3. Structured Output Components (Story 10.2)

### 3a. Workout Plan Component

Renders when `analysis.outputType === 'structured'` and schema matches workout plan.

```
┌──────────────────────────────────────────┐
│ 🏋️ Plano de Exercícios                  │
│ Baseado no seu perfil e análise          │
├──────────────────────────────────────────┤
│                                          │
│ ┌ Segunda ──────────────────────────────┐│
│ │ Treino A — Superior (45min)          ││
│ │                                      ││
│ │  1. Supino reto                      ││
│ │     3×12  •  Controlar descida       ││
│ │  2. Remada curvada                   ││
│ │     3×12  •  Foco em escapulas       ││
│ │  3. Desenvolvimento                  ││
│ │     3×10  •  Sem impulso             ││
│ │                                      ││
│ │  Aquecimento: 5min esteira leve      ││
│ │  Desaquecimento: Alongamento 5min    ││
│ └──────────────────────────────────────┘│
│                                          │
│ ┌ Terça ────────────────────────────────┐│
│ │ Descanso ativo                       ││
│ │ Caminhada leve 30min                 ││
│ └──────────────────────────────────────┘│
│                                          │
│ ┌ Quarta ───────────────────────────────┐│
│ │ Treino B — Inferior (50min)          ││
│ │ ...                                  ││
│ └──────────────────────────────────────┘│
│                                          │
│ ┌ Meta Semanal ─────────────────────────┐│
│ │ 4 treinos + 2 dias de descanso ativo ││
│ │                                      ││
│ │ Progressão:                          ││
│ │ • Aumentar carga 5% a cada 2 semanas ││
│ │ • Registrar pesos usados             ││
│ └──────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

**Day cards:**
- Container: `rounded-xl border border-foreground/10 bg-card overflow-hidden`
- Day header: `px-4 py-2.5 bg-foreground/5 text-xs font-semibold text-foreground uppercase tracking-wide` with day name
- Workout info (below header): `px-4 py-1 text-sm font-medium text-foreground` — workout name + type + duration
- Exercise list: `px-4 py-3 space-y-2.5`
  - Each exercise: `flex items-baseline gap-2`
    - Number: `text-xs font-semibold text-primary w-5 shrink-0`
    - Name: `text-sm font-medium text-foreground`
    - Detail: `text-xs text-muted-foreground` — sets x reps + notes
- Rest day card: simpler, `bg-card/50` with muted text
- Warmup/Cooldown: `border-t border-foreground/6 px-4 py-2 text-xs text-muted-foreground`

**Weekly goal card:**
- `rounded-xl border border-primary/20 bg-primary/5 p-4`
- Title: `text-sm font-semibold text-foreground`
- Progression tips: `text-xs text-muted-foreground` as bullet list

**File:** `src/components/structured-outputs/workout-plan.tsx`

---

### 3b. Nutrition Plan Component

```
┌──────────────────────────────────────────┐
│ 🥗 Plano Alimentar                      │
│ Personalizado para seus objetivos        │
├──────────────────────────────────────────┤
│                                          │
│ ┌ Cafe da Manha — 7:00 ────────────────┐│
│ │                                      ││
│ │  Omelete de espinafre (2 ovos)       ││
│ │  Pao integral (1 fatia)              ││
│ │  Abacate (1/4 unidade)              ││
│ │                                      ││
│ │  ~420 kcal  P:28g  C:32g  G:18g     ││
│ └──────────────────────────────────────┘│
│                                          │
│ ┌ Almoco — 12:30 ──────────────────────┐│
│ │ ...                                  ││
│ └──────────────────────────────────────┘│
│                                          │
│ ┌ Restricoes ──────────────────────────┐│
│ │ • Sem gluten (alergia)              ││
│ │ • Reduzir acucar refinado           ││
│ └──────────────────────────────────────┘│
│                                          │
│ ┌ Hidratacao ──────────────────────────┐│
│ │ Meta: 2.5L/dia                      ││
│ │ Distribuir ao longo do dia           ││
│ └──────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

**Meal cards:**
- Container: `rounded-xl border border-foreground/10 bg-card overflow-hidden`
- Meal header: `px-4 py-2.5 bg-foreground/5 flex justify-between items-center`
  - Meal name: `text-xs font-semibold text-foreground uppercase tracking-wide`
  - Time: `text-xs text-muted-foreground`
- Foods list: `px-4 py-3 space-y-1.5`
  - Each food: `text-sm text-foreground` — item name + portion
- Macros bar: `px-4 py-2 border-t border-foreground/6 flex gap-3`
  - Each macro: `text-[11px] font-medium` with color coding:
    - Calories: `text-foreground`
    - Protein: `text-info`
    - Carbs: `text-warning`
    - Fat: `text-destructive/80`

**Restrictions card:** `rounded-xl border border-warning/20 bg-warning/5 p-4`
**Hydration card:** `rounded-xl border border-info/20 bg-info/5 p-4`

**File:** `src/components/structured-outputs/nutrition-plan.tsx`

---

### 3c. Supplement Plan Component

```
┌──────────────────────────────────────────┐
│ 💊 Plano de Suplementacao                │
│ Baseado na sua analise e perfil          │
├──────────────────────────────────────────┤
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ Vitamina D3                          │ │
│ │ 2000 UI  •  Manha, com refeicao     │ │
│ │                                      │ │
│ │ Objetivo: Corrigir deficiencia       │ │
│ │ detectada (18 ng/mL)                 │ │
│ │                                      │ │
│ │ ⚠ Interacao: potencializa calcio     │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ Omega-3                              │ │
│ │ 1000mg  •  Almoco                    │ │
│ │                                      │ │
│ │ Objetivo: Anti-inflamatorio,         │ │
│ │ suporte cardiovascular               │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌ Revisao ─────────────────────────────┐ │
│ │ Reavaliar em 90 dias                 │ │
│ │ Repetir exame de vitamina D          │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Supplement cards:**
- Container: `rounded-xl border border-foreground/10 bg-card p-4 space-y-2`
- Name: `text-sm font-semibold text-foreground`
- Dosage + timing: `text-xs text-muted-foreground` — inline with `•` separator
- Purpose: `text-xs text-foreground/80`
- Interaction warning (if present): `text-[11px] text-warning flex items-center gap-1` with `AlertTriangle` icon

**Review card:** `rounded-xl border border-info/20 bg-info/5 p-4`
- Date: `text-sm font-medium text-foreground`
- Notes: `text-xs text-muted-foreground`

**File:** `src/components/structured-outputs/supplement-plan.tsx`

---

### 3d. Generic JSON Fallback

For structured outputs without a dedicated component.

```
┌──────────────────────────────────────────┐
│ 📋 {agent.name} — Resultado Estruturado  │
├──────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐ │
│ │ {key}: {value}                       │ │
│ │ {key}: {value}                       │ │
│ │ {nested}:                            │ │
│ │   {key}: {value}                     │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

- Recursive key-value renderer
- Arrays rendered as numbered lists
- Objects rendered as indented blocks
- Primitives rendered as `text-sm text-foreground`
- Keys: `text-xs font-semibold text-muted-foreground uppercase`

**File:** `src/components/structured-outputs/generic-json.tsx`

---

### 3e. Structured Output Detector & Router

Placed in the analysis report page, below the synthesis Markdown.

```typescript
interface StructuredOutputSectionProps {
  analyses: Array<{
    agentName: string
    outputType: 'text' | 'structured'
    content: string
  }>
}
```

Logic:
1. Filter analyses where `outputType === 'structured'`
2. Parse `content` as JSON
3. Match against known schemas:
   - Has `workouts` array with `exercises` → `WorkoutPlan`
   - Has `meals` array with `foods` → `NutritionPlan`
   - Has `supplements` array with `dosage` → `SupplementPlan`
   - Otherwise → `GenericJson`
4. Render each matched component in a vertical stack with `space-y-6`

**Section header in report:**
- Divider: `border-t border-foreground/10 my-6`
- Title: `text-lg font-bold text-foreground mb-4` — "Planos Personalizados"

**File:** `src/components/structured-outputs/structured-section.tsx`

---

## 4. Body Composition Section — Profile (Story 11.3)

### 4a. Profile Page — Body Composition Card

Added as a new section in the existing profile page, below the current form.

```
┌──────────────────────────────────────────┐
│ Composicao Corporal                      │
│ Atualizado via bioimpedancia             │
├──────────────────────────────────────────┤
│                                          │
│  Gordura corporal    Massa muscular      │
│  ┌────────────┐      ┌────────────┐      │
│  │   22.4%    │      │   35.2 kg  │      │
│  │   ↓ 1.8%  │      │   ↑ 0.6 kg │      │
│  └────────────┘      └────────────┘      │
│                                          │
│  Gordura visceral    Massa ossea         │
│  ┌────────────┐      ┌────────────┐      │
│  │    7        │      │   2.8 kg   │      │
│  │   estavel  │      │   estavel  │      │
│  └────────────┘      └────────────┘      │
│                                          │
│  TMB                 Agua corporal       │
│  ┌────────────┐      ┌────────────┐      │
│  │  1680 kcal │      │   58.3%    │      │
│  └────────────┘      └────────────┘      │
│                                          │
│  Ver historico completo →                │
└──────────────────────────────────────────┘
```

**Container:** `rounded-xl border border-foreground/10 bg-card p-4 mt-6`

**Header:**
- Title: `text-base font-semibold text-foreground`
- Subtitle: `text-xs text-muted-foreground` — "Atualizado via bioimpedancia" + relative date of last measurement

**Metric grid:** `grid grid-cols-2 gap-3 mt-3`

**Each metric tile:**
- Container: `rounded-lg bg-foreground/5 p-3`
- Label: `text-[11px] text-muted-foreground uppercase tracking-wide`
- Value: `text-lg font-bold text-foreground`
- Delta (if available):
  - Up: `text-[11px] font-medium` — color depends on metric (fat up = `text-destructive`, muscle up = `text-success`)
  - Down: inverse logic
  - Stable: `text-[11px] text-muted-foreground` — "estavel"
  - No previous: no delta shown

**Delta color logic (specific to body composition):**
| Metric | Up color | Down color |
|--------|----------|------------|
| Body fat | `text-destructive` (bad) | `text-success` (good) |
| Visceral fat | `text-destructive` | `text-success` |
| Muscle mass | `text-success` (good) | `text-destructive` (bad) |
| Bone mass | `text-success` | `text-destructive` |
| BMR | `text-info` (neutral) | `text-info` |
| Body water | `text-info` | `text-info` |

**"Ver historico completo" link:** `text-xs font-medium text-primary hover:underline flex items-center gap-1 mt-2` with `ArrowRight` icon. Opens an expandable section or navigates to history section.

**Empty state (no bioimpedance data yet):**
```
┌──────────────────────────────────────────┐
│ Composicao Corporal                      │
│                                          │
│  Nenhum dado de bioimpedancia encontrado │
│  Envie um exame de bioimpedancia para    │
│  acompanhar sua composicao corporal.     │
│                                          │
│  [Enviar exame]                          │
└──────────────────────────────────────────┘
```

**Files:**
- `src/app/app/profile/body-composition-card.tsx` — metric display
- `src/app/app/profile/page.tsx` — add section below form

---

### 4b. Body Composition History (expandable or inline in profile)

```
┌──────────────────────────────────────────┐
│ Historico de Composicao Corporal         │
├──────────────────────────────────────────┤
│                                          │
│ 08/04/2026                               │
│ Gordura: 22.4% (↓1.8%) • Musculo: 35.2kg│
│ (↑0.6kg) • Visceral: 7 (estavel)        │
│                                          │
│ 15/03/2026                               │
│ Gordura: 24.2% • Musculo: 34.6kg        │
│ Visceral: 7                              │
│                                          │
│ 01/03/2026                               │
│ Gordura: 25.1% • Musculo: 34.0kg        │
│ Visceral: 8                              │
└──────────────────────────────────────────┘
```

**Each history entry:**
- Date: `text-sm font-semibold text-foreground`
- Metrics: `text-xs text-muted-foreground` — inline, separated by `•`
- Deltas: compared to the entry immediately before

**Empty state:** "Nenhum registro ainda."

---

## 5. Dashboard Updates (Story 13.2)

### 5a. Body Composition Card on Dashboard

If user has body composition data, show a compact card on the dashboard.

```
┌──────────────────────────────────────────┐
│ 📊 Composicao Corporal                  │
│ Ultima atualizacao: 3 dias atras         │
│                                          │
│  Gordura  22.4%  ↓1.8%                  │
│  Musculo  35.2kg ↑0.6kg                 │
│  IMC      24.1                           │
│                                          │
│  Ver perfil completo →                   │
└──────────────────────────────────────────┘
```

- Container: `rounded-xl border border-foreground/10 bg-card p-4`
- 3 key metrics only (gordura, musculo, IMC) — compact
- Delta badges with color coding (same rules as profile)
- Link to profile page

**Placement:** After "Meus Exames" section, before any future sections.

---

### 5b. Dashboard Density Improvements

**Current issues identified:**
1. Header card has large padding and gradient — consumes vertical space
2. Exam rows have generous spacing
3. No anchor links for quick navigation

**Changes:**
- Reduce header card padding: `p-5` → `p-4`
- Reduce gradient height: `h-20` → `h-12`
- Exam row spacing: `space-y-2` → `space-y-1.5`
- Add skeleton loaders to all async sections (already present)
- CTA buttons: reduce gap from `gap-2` to `gap-1.5`

---

## 6. Report UX Improvements (Story 13.2)

### 6a. Collapsible Sections

Each major section (Resumo Executivo, Analise por Eixos, etc.) becomes collapsible.

```
┌──────────────────────────────────────────┐
│ Relatorio de Saude — v3                  │
│ 08/04/2026                               │
├──────────────────────────────────────────┤
│ Sumario                                  │
│  • Resumo Executivo                      │
│  • Analise por Eixos Funcionais          │
│  • Padroes e Pontos de Atencao           │
│  • Insights e Hipoteses                  │
│  • Recomendacoes Educacionais            │
├──────────────────────────────────────────┤
│ ▼ Resumo Executivo                       │
│   [full content visible]                 │
│                                          │
│ ▶ Analise por Eixos Funcionais           │
│   [collapsed — tap to expand]            │
│                                          │
│ ▶ Padroes e Pontos de Atencao            │
│   [collapsed]                            │
│ ...                                      │
├──────────────────────────────────────────┤
│ ── Planos Personalizados ──              │
│ [Structured output components here]      │
├──────────────────────────────────────────┤
│ ⚠ Disclaimer                            │
└──────────────────────────────────────────┘
```

**Table of contents (sumario):**
- Container: `rounded-lg bg-foreground/5 p-3 mb-4`
- Each item: `text-xs text-primary hover:underline cursor-pointer` — anchor links
- Tap → smooth scroll to section + expand if collapsed

**Collapsible section:**
- Use Radix `Collapsible` or native `<details>/<summary>`
- Trigger: `flex items-center gap-2 py-3 cursor-pointer`
  - Chevron: `ChevronDown` rotates on open
  - Title: `text-base font-semibold text-foreground`
- Content: standard Markdown rendering (already implemented)
- First section ("Resumo Executivo") expanded by default

**Structured outputs section:** Rendered below the Markdown report, separated by divider.

**Disclaimer:** Always visible at bottom, not collapsible.

**Files:** Modified `src/app/app/analyses/[id]/report-view.tsx`

---

## 7. Admin Agent Form — New Fields (Stories 8.2, 9.1, 9.2)

### 7a. Model Configuration Section

Added to existing agent form (`src/app/admin/agents/_components/agent-form.tsx`).

```
┌──────────────────────────────────────────┐
│ Configuracao do Modelo                   │
├──────────────────────────────────────────┤
│                                          │
│ Provider                                 │
│ ┌──────────────────────────────┐         │
│ │ Google                    ▾  │         │
│ └──────────────────────────────┘         │
│                                          │
│ Modelo                                   │
│ ┌──────────────────────────────┐         │
│ │ gemini-2.5-flash             │         │
│ └──────────────────────────────┘         │
│                                          │
│ Temperatura            Max Tokens        │
│ ┌──────────┐           ┌──────────┐      │
│ │ ───●──── │  0.7      │ 4096     │      │
│ └──────────┘           └──────────┘      │
│                                          │
│ Parametros Avancados                  ▶  │
│ ┌──────────────────────────────────────┐ │
│ │ {                                    │ │
│ │   "topP": 0.9,                       │ │
│ │   "topK": 40                         │ │
│ │ }                                    │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Provider dropdown:** `Select` component with options: Google, OpenAI, Anthropic
- On change: update the `model` field prefix (`google/`, `openai/`, `anthropic/`)

**Model text input:** Model slug after the provider prefix.

**Temperature slider:** Reuse existing `Slider` component, range 0-2, step 0.1, display value.

**Max Tokens input:** Number input, min 256, max 16384.

**Advanced params:** Collapsible section with JSON `Textarea`
- Placeholder: `{ "topP": 0.9, "topK": 40 }`
- Validation: must be valid JSON or empty
- Error state: `text-destructive text-xs` below textarea

---

### 7b. Output Schema Section

```
┌──────────────────────────────────────────┐
│ Output Estruturado                       │
├──────────────────────────────────────────┤
│                                          │
│ Tipo de Output                           │
│ ┌──────────────────────────────┐         │
│ │ ○ Texto (Markdown)           │         │
│ │ ● Estruturado (JSON)         │         │
│ └──────────────────────────────┘         │
│                                          │
│ Template                                 │
│ ┌──────────────────────────────┐         │
│ │ Plano de Exercicios       ▾  │         │
│ └──────────────────────────────┘         │
│                                          │
│ JSON Schema                              │
│ ┌──────────────────────────────────────┐ │
│ │ {                                    │ │
│ │   "type": "object",                  │ │
│ │   "properties": {                    │ │
│ │     "workouts": {                    │ │
│ │       "type": "array",               │ │
│ │       ...                            │ │
│ │     }                                │ │
│ │   }                                  │ │
│ │ }                                    │ │
│ └──────────────────────────────────────┘ │
│ ✓ Schema valido                          │
└──────────────────────────────────────────┘
```

**Output type selector:** Radio group or segmented control
- "Texto (Markdown)" — default, hides schema section
- "Estruturado (JSON)" — shows template dropdown + schema editor

**Template dropdown:** Pre-built schemas
- "Plano de Exercicios" → loads workout JSON Schema
- "Plano Alimentar" → loads nutrition JSON Schema
- "Plano de Suplementacao" → loads supplement JSON Schema
- "Personalizado" → empty schema editor

**JSON Schema editor:** `Textarea` with monospace font
- Height: `min-h-[200px]`
- Font: `font-mono text-xs`
- Validation: on blur, parse JSON + check `type` field exists
- Status indicator:
  - Valid: `text-success text-xs` — "Schema valido"
  - Invalid: `text-destructive text-xs` — error message

---

### 7c. Knowledge Association Section

```
┌──────────────────────────────────────────┐
│ Base de Conhecimento                     │
│ Artigos associados a este agente         │
├──────────────────────────────────────────┤
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ 🔍 Buscar artigo por titulo...       │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Associados (3)                           │
│ ┌──────────────────────────────────────┐ │
│ │ ☑ Principios de nutricao funcional   │ │
│ │   Nutrição • 12 chunks    [Remover]  │ │
│ ├──────────────────────────────────────┤ │
│ │ ☑ Micronutrientes essenciais         │ │
│ │   Nutrição • 8 chunks     [Remover]  │ │
│ ├──────────────────────────────────────┤ │
│ │ ☑ Dieta anti-inflamatoria            │ │
│ │   Nutrição • 15 chunks    [Remover]  │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Disponiveis (12)                         │
│ ┌──────────────────────────────────────┐ │
│ │ ☐ Exercicio e metabolismo            │ │
│ │   Exercício • 10 chunks  [Associar] │ │
│ ├──────────────────────────────────────┤ │
│ │ ☐ Hormônios e sono                   │ │
│ │   Endocrinologia • 6 ch  [Associar] │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [Selecionar todos filtrados]             │
└──────────────────────────────────────────┘
```

**Search input:** `Input` component with search icon, filters both lists by title.

**Associated articles list:**
- Each row: `flex items-center justify-between py-2 border-b border-foreground/6`
- Checkbox (checked): `text-primary`
- Title: `text-sm text-foreground`
- Metadata: `text-[11px] text-muted-foreground` — category + chunk count
- Remove button: `text-xs text-destructive hover:underline`

**Available articles list:** Same layout but with "Associar" button (`text-xs text-primary hover:underline`).

**Bulk action:** "Selecionar todos filtrados" button at the bottom.

**Data flow:**
- On add: `POST` to create `agent_knowledge` row
- On remove: `DELETE` to remove `agent_knowledge` row
- Optimistic updates for responsiveness

---

## 8. Knowledge Base Admin — Agent Indicator (Story 8.2)

### Modified Knowledge List Page

```
┌──────────────────────────────────────────┐
│ Base de Conhecimento                     │
│ 24 artigos indexados                     │
├──────────────────────────────────────────┤
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ Principios de nutricao funcional     │ │
│ │ Nutrição • 12 chunks • 45 usos      │ │
│ │ 🌐 Global  •  Nutrição, Medicina Int│ │
│ │                           [Remover]  │ │
│ ├──────────────────────────────────────┤ │
│ │ Exercicio e metabolismo              │ │
│ │ Exercício • 10 chunks • 23 usos     │ │
│ │ Exercício                            │ │
│ │                           [Remover]  │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**New row in each article:**
- Global badge: `Badge` component with `variant="outline"` — "Global" if `isGlobal = true`
- Agent names: `text-[11px] text-muted-foreground` — comma-separated list of associated agents
- Toggle global: small `Switch` component inline

---

## 9. Upload Feedback — Document Classification (Story 11.1)

### Modified Upload Flow

After upload completes, the feedback differs based on classification.

**Lab test (current behavior):**
```
┌──────────────────────────────────────────┐
│ ✅ Exame processado                      │
│                                          │
│ Seus dados foram extraidos e salvos.     │
│ A analise sera gerada automaticamente.   │
│                                          │
│ [Ver no dashboard]                       │
└──────────────────────────────────────────┘
```

**Body composition (new):**
```
┌──────────────────────────────────────────┐
│ ✅ Composicao corporal atualizada        │
│                                          │
│ Seus dados de bioimpedancia foram        │
│ integrados ao seu perfil medico.         │
│                                          │
│  Gordura: 22.4%    Musculo: 35.2kg      │
│  Visceral: 7       TMB: 1680 kcal       │
│                                          │
│ [Ver perfil]  [Enviar outro]             │
└──────────────────────────────────────────┘
```

**Success card:**
- Container: `rounded-xl border border-success/20 bg-success/5 p-5 text-center`
- Icon: `CheckCircle2` `size-8 text-success mx-auto mb-2`
- Title: `text-base font-semibold text-foreground`
- Description: `text-sm text-muted-foreground mt-1`
- Metrics preview (body comp only): `grid grid-cols-2 gap-2 mt-3` with compact metric tiles
- Actions: `flex gap-2 justify-center mt-4`

**File:** Modified `src/components/upload/upload-form.tsx`

---

## 10. Screen Inventory — Complete Map

### New Screens

| Route | Screen | Story | Priority |
|-------|--------|-------|----------|
| `/app/chat` | Chat home — agent selection | 12.2 | P1 |
| `/app/chat/[agentId]` | Chat conversation | 12.2 | P1 |

### Modified Screens

| Route | Screen | Changes | Story |
|-------|--------|---------|-------|
| Bottom Nav | All app pages | 3 → 5 items (+ Upload, Chat) | 13.1 |
| `/app/dashboard` | Dashboard | + body comp card, density improvements | 13.2 |
| `/app/profile` | Profile | + body composition section with history | 11.3 |
| `/app/upload` | Upload | + classification feedback (lab vs body comp) | 11.1 |
| `/app/analyses/[id]` | Report | + collapsible sections, TOC, structured outputs | 13.2, 10.2 |
| `/admin/agents/[id]/edit` | Agent edit | + model config, output schema, knowledge assoc | 9.1, 9.2, 8.2 |
| `/admin/knowledge` | Knowledge list | + agent indicator, global toggle | 8.2 |

### New Components

| Component | File | Story |
|-----------|------|-------|
| `WorkoutPlan` | `src/components/structured-outputs/workout-plan.tsx` | 10.2 |
| `NutritionPlan` | `src/components/structured-outputs/nutrition-plan.tsx` | 10.3 |
| `SupplementPlan` | `src/components/structured-outputs/supplement-plan.tsx` | 10.3 |
| `GenericJson` | `src/components/structured-outputs/generic-json.tsx` | 10.2 |
| `StructuredSection` | `src/components/structured-outputs/structured-section.tsx` | 10.2 |
| `BodyCompositionCard` | `src/app/app/profile/body-composition-card.tsx` | 11.3 |
| `ChatView` | `src/app/app/chat/[agentId]/chat-view.tsx` | 12.2 |
| `MessageBubble` | `src/app/app/chat/[agentId]/message-bubble.tsx` | 12.2 |

---

## 11. Accessibility Requirements (WCAG AA)

| Requirement | Implementation |
|-------------|----------------|
| Touch targets | All interactive elements `min-h-[44px] min-w-[44px]` |
| Color contrast | All text meets 4.5:1 against background (verified by oklch tokens) |
| Focus indicators | `focus-visible:ring-2 focus-visible:ring-primary/40` on all interactive elements |
| Screen reader | `aria-label` on nav, sections, buttons. `role="status"` on loading states |
| Keyboard navigation | All collapsible sections keyboard-accessible. Chat input supports Enter/Shift+Enter |
| Motion | `prefers-reduced-motion` respected via Tailwind `motion-safe:` prefix for animations |
| Semantic HTML | `<nav>`, `<main>`, `<section>`, `<article>` used appropriately |

---

## 12. Mobile Viewport Constraints (390px)

| Constraint | Rule |
|------------|------|
| Bottom nav with 5 items | Max `px-2` per item, `text-[10px]` labels if needed |
| Chat input | Input takes `flex-1`, send button fixed width |
| Structured output cards | Full width, no horizontal scroll |
| Metric tiles | 2-column grid, tiles stretch to fill |
| Report sections | Full width, no side margins beyond `px-4` |
| Agent form (admin) | Admin is desktop-secondary — can use wider layouts |

---

*UI Specs by Uma (AIOX UX Design Expert) — 2026-04-08*
*Input: PRD v1.1, ADR v1.1, Schema v1.1, codebase audit (22 pages, 16 components, design tokens from globals.css)*
