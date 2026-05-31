'use client'
import { useState, useRef } from 'react'
import { romanize } from '@/lib/romanize'
import vocab from '@/data/vocab.json'

type BeeAssistProps = {
  korean: string
  english: string
}

type Card = { id: number; korean: string; english: string }

type Insight = {
  examples: { korean: string; romanized: string; english: string }[]
  breakdown: { korean: string; romanized: string; meaning: string }
  pitfall: string
  related: { korean: string; romanized: string; english: string }[]
}

const cache: Record<string, Insight> = {}

const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_KEY ?? ''

function koreanToRoman(text: string): string {
  return text.split(' ').map(word => {
    // Separate trailing punctuation so it doesn't get a stray dash
    const match = word.match(/^(.*?)([.?!,。]+)?$/)
    const core  = match?.[1] ?? word
    const punct = match?.[2] ?? ''
    const roman = core.split('').map(char => {
      const code = char.charCodeAt(0)
      if (code >= 0xAC00 && code <= 0xD7A3) return romanize(char)
      return char
    }).join('-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    return roman + punct
  }).join(' ')
}

export default function BeeAssist({ korean, english }: BeeAssistProps) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState<Insight | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [prompted, setPrompted] = useState(false)
  const panelRef              = useRef<HTMLDivElement>(null)

  const cacheKey = korean

  async function fetchInsight() {
    if (cache[cacheKey]) { setInsight(cache[cacheKey]); setOpen(true); return }
    setLoading(true); setError(null); setOpen(true)
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'HTTP-Referer': 'https://topik-learn.app',
          'X-Title': 'TOPIK Flashcards'
        },
        body: JSON.stringify({
          model: 'google/gemini-3.1-flash-lite',
          max_tokens: 700,
          messages: [
            {
              role: 'system',
              content: `You are Bee, a friendly Korean language tutor for native English speakers who are learning Korean from scratch.
Respond ONLY in raw JSON (no markdown fences) with this exact structure:
{
  "examples": [
    { "korean": "...", "english": "..." },
    { "korean": "...", "english": "..." }
  ],
  "breakdown": { "meaning": "..." },
  "pitfall": "...",
  "related": [
    { "korean": "...", "english": "..." },
    { "korean": "...", "english": "..." },
    { "korean": "...", "english": "..." }
  ]
}
Rules:
- examples: 2 short, natural sentences using the word. Korean script only in the "korean" field, plain English in "english".
- breakdown: interesting facts about the word — hanja origin, how it was formed, nuance vs similar words, or cultural context. 1-2 sentences in "meaning".
- pitfall: one common mistake English speakers make with this word (1 sentence).
- related: 3 related Korean words that are commonly used. Korean script only in "korean", English meaning in "english". Prefer common everyday words.
Do NOT include romanization — that will be added automatically.`
            },
            { role: 'user', content: `Korean word: ${korean}\nEnglish meaning: ${english}` }
          ]
        })
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`${res.status}: ${body}`)
      }

      const data = await res.json()
      const raw = data.choices?.[0]?.message?.content ?? ''
      const clean = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(clean)

      // Inject romanization client-side
      const result: Insight = {
        examples: parsed.examples.map((ex: { korean: string; english: string }) => ({
          korean: ex.korean,
          romanized: koreanToRoman(ex.korean),
          english: ex.english
        })),
        breakdown: {
          korean,
          romanized: koreanToRoman(korean),
          meaning: parsed.breakdown.meaning
        },
        pitfall: parsed.pitfall,
        related: parsed.related.map((r: { korean: string; english: string }) => ({
          korean: r.korean,
          romanized: koreanToRoman(r.korean),
          english: r.english
        }))
      }

      cache[cacheKey] = result
      setInsight(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }


  function handleBeeClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!prompted && !open) setPrompted(true)
  }

  function handleYes(e: React.MouseEvent) {
    e.stopPropagation()
    setPrompted(false)
    fetchInsight()
  }

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    setPrompted(false)
  }

  return (
    <div className="bee-assist-wrap" onClick={e => e.stopPropagation()}>

      <button
        className={`bee-btn ${prompted || open ? 'bee-btn--active' : ''}`}
        onClick={handleBeeClick}
        aria-label="Ask Bee for insights"
      >
        <img src="/bee.png" alt="Bee" className="bee-img" />
      </button>

      {prompted && !open && (
        <div className="bee-bubble">
          <p className="bee-bubble-text">Wanna know more about this word, bee?</p>
          <div className="bee-bubble-actions">
            <button className="bee-bubble-yes" onClick={handleYes}>Yes please!</button>
            <button className="bee-bubble-no" onClick={e => { e.stopPropagation(); setPrompted(false) }}>Maybe later</button>
          </div>
        </div>
      )}

      {open && (
        <div className="bee-panel" ref={panelRef} onClick={e => e.stopPropagation()}>
          <div className="bee-panel-header">
            <img src="/bee.png" alt="Bee" className="bee-panel-img" />
            <div>
              <span className="bee-panel-title">Bee&apos;s Word Insights</span>
              <span className="bee-panel-word">{korean} · {koreanToRoman(korean)} · {english}</span>
            </div>
            <button className="bee-panel-close" onClick={handleClose}>✕</button>
          </div>

          {loading && (
            <div className="bee-loading">
              <span className="bee-loading-bee">🐝</span>
              <span>Buzzing through the dictionary…</span>
            </div>
          )}

          {error && (
            <div className="bee-error">
              <p>{error}</p>
              <button onClick={e => { e.stopPropagation(); fetchInsight() }}>Try again</button>
            </div>
          )}

          {insight && !loading && (
            <div className="bee-content">

              {/* Example sentences */}
              <section className="bee-section">
                <h4 className="bee-section-title">✦ Example sentences</h4>
                {insight.examples.map((ex, i) => (
                  <div key={i} className="bee-example">
                    <p className="bee-example-korean">{ex.korean}</p>
                    <p className="bee-example-roman">{ex.romanized}</p>
                    <p className="bee-example-english">{ex.english}</p>
                  </div>
                ))}
              </section>

              {/* Word breakdown */}
              <section className="bee-section">
                <h4 className="bee-section-title">✦ Word breakdown</h4>
                <p className="bee-section-body">{insight.breakdown.meaning}</p>
              </section>

              {/* Watch out */}
              <section className="bee-section">
                <h4 className="bee-section-title">✦ Watch out!</h4>
                <p className="bee-section-body bee-pitfall">{insight.pitfall}</p>
              </section>

              {/* Related words — clickable */}
              <section className="bee-section">
                <h4 className="bee-section-title">✦ Related words</h4>
                <div className="bee-related">
                  {insight.related.map((w, i) => (
                    <div
                      key={i}
                      className="bee-related-chip"
                    >
                      <span className="bee-related-korean">{w.korean}</span>
                      <span className="bee-related-sep">·</span>
                      <span className="bee-related-roman">{w.romanized}</span>
                      <span className="bee-related-sep">·</span>
                      <span className="bee-related-english">{w.english}</span>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          )}
        </div>
      )}
    </div>
  )
}