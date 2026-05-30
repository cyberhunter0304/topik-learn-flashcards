'use client'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import vocab from '@/data/vocab.json'
import { romanize, syllabify } from '@/lib/romanize'
import { speakKorean } from '@/lib/speech'
import { getKnown, toggleKnown, saveProgress } from '@/lib/storage'

type Card = { id: number; korean: string; english: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function syllabifyRoman(korean: string): string {
  const parts: string[] = []
  for (const char of korean) {
    const code = char.charCodeAt(0)
    if (code >= 0xAC00 && code <= 0xD7A3) {
      parts.push(romanize(char))
    } else if (char === ' ') {
      parts.push(' ')
    } else {
      parts.push(char)
    }
  }
  return parts.join('-').replace(/ - /g, ' ').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function StudyInner() {
  const params    = useSearchParams()
  const router    = useRouter()
  const mode      = params.get('mode') || 'order'
  const resumeIdx = parseInt(params.get('resume') || '0')

  const [deck, setDeck]             = useState<Card[]>([])
  const [index, setIndex]           = useState(0)
  const [flipped, setFlipped]       = useState(false)
  const [known, setKnown]           = useState<Set<number>>(new Set())
  const [animKey, setAnimKey]       = useState(0)
  const [sylVisible, setSylVisible] = useState(false)
  const [slowMode, setSlowMode]     = useState(false)
  const [muted, setMuted]           = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    const allKnown = getKnown()
    setKnown(allKnown)
    let cards: Card[] = vocab as Card[]
    if (mode === 'review') cards = cards.filter(c => !allKnown.has(c.id))
    if (mode === 'shuffle') cards = shuffle(cards)
    if (mode === 'review' && cards.length === 0) cards = vocab as Card[]
    setDeck(cards)
    setIndex(resumeIdx < cards.length ? resumeIdx : 0)
  }, [mode, resumeIdx])

  const card = deck[index]

  const goTo = useCallback((newIdx: number) => {
    if (!deck.length) return
    const clamped = Math.max(0, Math.min(deck.length - 1, newIdx))
    setFlipped(false)
    setSylVisible(false)
    setAnimKey(k => k + 1)
    setTimeout(() => setIndex(clamped), 50)
    saveProgress(clamped, mode)
  }, [deck, mode])

  const flip = useCallback(() => {
    setFlipped(f => {
      if (!f && card) {
        if (!muted) speakKorean(card.korean, slowMode)
        setTimeout(() => setSylVisible(true), 320)
      } else {
        setSylVisible(false)
      }
      return !f
    })
  }, [card, muted, slowMode])

  const replay = useCallback(() => {
    if (card && flipped && !muted) speakKorean(card.korean, slowMode)
  }, [card, flipped, muted, slowMode])

  const markKnown = useCallback(() => {
    if (!card) return
    const updated = toggleKnown(card.id)
    setKnown(new Set(updated))
  }, [card])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      switch (e.key) {
        case ' ':
        case 'Enter':      e.preventDefault(); flip(); break
        case 'ArrowRight': goTo(index + 1); break
        case 'ArrowLeft':  goTo(index - 1); break
        case 'k': case 'K': markKnown(); break
        case 'r': case 'R': replay(); break
        case 'm': case 'M': setMuted(v => !v); break
        case 's': case 'S': setSlowMode(v => !v); break
        case '?':           setLegendOpen(v => !v); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flip, goTo, index, markKnown, replay])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      dx < 0 ? goTo(index + 1) : goTo(index - 1)
    } else if (Math.abs(dy) < 10 && Math.abs(dx) < 10) {
      flip()
    }
  }

  if (!card) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
      <p style={{ color: 'var(--muted)' }}>Loading…</p>
    </div>
  )

  const isKnown   = known.has(card.id)
  const syllables = syllabify(card.korean)
  const rom       = syllabifyRoman(card.korean)
  const progress  = deck.length > 0 ? ((index + 1) / deck.length) * 100 : 0

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--cream)' }}>

      {/* Floating bees and sunflowers decoration */}
      {[
        { top: '8%',  left: '5%',  dur: '14s', delay: '-2s'  },
        { top: '20%', left: '88%', dur: '18s', delay: '-6s'  },
        { top: '55%', left: '92%', dur: '22s', delay: '-10s' },
        { top: '75%', left: '3%',  dur: '16s', delay: '-4s'  },
        { top: '40%', left: '50%', dur: '25s', delay: '-8s'  },
      ].map((b, i) => (
        <div key={`bee-${i}`} className="bg-bee" style={{
          top: b.top, left: b.left,
          animationDuration: b.dur, animationDelay: b.delay,
        }}>🐝</div>
      ))}

      {/* Decorative sunflowers */}
      {[
        { top: '12%', left: '85%', size: '3rem', opacity: '0.2' },
        { top: '68%', left: '8%', size: '2.5rem', opacity: '0.18' },
      ].map((s, i) => (
        <div
          key={`sun-${i}`}
          style={{
            position: 'fixed',
            top: s.top,
            left: s.left,
            fontSize: s.size,
            opacity: s.opacity,
            pointerEvents: 'none',
            zIndex: 1,
            userSelect: 'none'
          }}
        >
          🌻
        </div>
      ))}

      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={() => router.push('/')} className="btn-secondary" style={{ fontSize: '0.9rem', padding: '0.55em 1.1em' }}>
          ← Home
        </button>
        <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--muted)' }}>
          {index + 1} <span style={{ color: 'var(--honey)' }}>/</span> {deck.length}
        </span>
        <button onClick={markKnown}
          className={isKnown ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '0.9rem', padding: '0.55em 1.1em' }}>
          {isKnown ? '✓ Known' : 'Mark Known'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 mx-5 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(212,160,23,0.20)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--honey), var(--gold))' }} />
      </div>

      {/* ── Card ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-4">
        <div
          key={animKey}
          className="slide-in card-scene"
          style={{ maxWidth: '480px', width: '100%' }}
          onClick={flip}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Fixed height card */}
          <div className={`card-inner ${flipped ? 'flipped' : ''}`} style={{ height: '300px' }}>

            {/* Front — English */}
            <div className="card-face flex flex-col items-center justify-center px-8 py-6 select-none"
              style={{ background: 'var(--warm-white)', boxShadow: 'var(--card-shadow)', border: '1px solid rgba(212,160,23,0.15)', cursor: 'pointer' }}>
              <span className="text-xs font-bold mb-4 tracking-widest uppercase" style={{ color: 'var(--honey)' }}>
                #{card.id}
              </span>
              <p className="text-center font-bold leading-snug w-full px-2"
                style={{
                  color: 'var(--charcoal)',
                  fontSize: card.english.length > 25 ? '1.25rem' : card.english.length > 15 ? '1.65rem' : '2.2rem',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}>
                {card.english}
              </p>
              <span className="mt-5 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                tap or press <kbd className="shortcut-key">Enter</kbd> to reveal
              </span>
            </div>

            {/* Back — Korean */}
            <div className="card-face card-back flex flex-col items-center justify-center px-8 py-5 select-none"
              style={{ background: 'var(--warm-white)', boxShadow: 'var(--card-shadow)', border: '1px solid rgba(212,160,23,0.15)', cursor: 'pointer' }}>
              <span className="text-xs font-bold mb-1 tracking-widest uppercase" style={{ color: 'var(--honey)' }}>
                #{card.id}
              </span>

              <p className="font-bold text-center"
                style={{
                  color: 'var(--charcoal)',
                  fontSize: card.korean.length > 5 ? '2.4rem' : '3.2rem',
                  lineHeight: 1.15,
                }}>
                {card.korean}
              </p>

              {/* Syllable pop-in */}
              <div className="flex flex-wrap justify-center gap-1 mt-1 min-h-6">
                {sylVisible && syllables.map((syl, i) => (
                  syl === ' '
                    ? <span key={i} className="w-2" />
                    : <span key={i} className="syllable-char text-base font-semibold"
                        style={{ color: 'var(--gold)', animationDelay: `${i * 80}ms` }}>
                        {syl}
                      </span>
                ))}
              </div>

              <div className="w-10 h-px my-2" style={{ background: 'rgba(212,160,23,0.3)' }} />

              <p className="text-sm font-medium mb-3" style={{ color: 'var(--muted)' }}>{rom}</p>

              {/* Replay button */}
              <button
                onClick={e => { e.stopPropagation(); replay() }}
                className="btn-icon"
                title="Replay pronunciation (R)">
                <span>🔊</span>
                <span>{slowMode ? 'Slow replay' : 'Replay'}</span>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-center font-medium" style={{ color: 'var(--muted)' }}>
          {flipped ? 'swipe or use ← → to navigate' : 'tap · Space · Enter to flip'}
        </p>
      </div>

      {/* ── Bottom nav ── */}
      <div className="relative z-10 flex items-center gap-3 px-5 pb-5">
        <button
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="btn-nav"
          aria-label="Previous card">
          ←
        </button>
        <button onClick={flip} className="btn-primary" style={{ flex: 2 }}>
          {flipped ? 'Hide' : 'Reveal'}
        </button>
        <button
          onClick={() => goTo(index + 1)}
          disabled={index === deck.length - 1}
          className="btn-nav"
          aria-label="Next card">
          →
        </button>
      </div>

      {/* ── Toggles row ── */}
      <div className="relative z-10 flex items-center justify-center gap-3 pb-6 px-5">
        <button onClick={() => setSlowMode(v => !v)} className={slowMode ? 'btn-toggle-on' : 'btn-toggle'}>
          🐢 {slowMode ? 'Slow' : 'Normal'}
        </button>
        <button onClick={() => setMuted(v => !v)} className={muted ? 'btn-toggle-muted' : 'btn-toggle'}>
          {muted ? '🔇 Muted' : '🔊 Sound'}
        </button>
        <button onClick={() => setLegendOpen(v => !v)} className={legendOpen ? 'btn-toggle-on' : 'btn-toggle'}>
          ⌨ Keys
        </button>
      </div>

      {/* ── Shortcut legend ── */}
      {legendOpen && (
        <div className="shortcut-legend fixed bottom-24 right-5 z-50 p-4 w-60 fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold" style={{ color: 'var(--charcoal)' }}>⌨ Shortcuts</span>
            <button onClick={() => setLegendOpen(false)}
              style={{ color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer' }}>✕</button>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { key: 'Enter / Space', label: 'Flip card' },
              { key: '← →',          label: 'Prev / Next' },
              { key: 'R',            label: 'Replay audio' },
              { key: 'K',            label: 'Toggle Known' },
              { key: 'M',            label: 'Mute / Unmute' },
              { key: 'S',            label: 'Slow / Normal' },
              { key: '?',            label: 'This panel' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: 'var(--charcoal)', opacity: 0.72 }}>{label}</span>
                <kbd className="shortcut-key">{key}</kbd>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

export default function StudyPage() {
  return (
    <Suspense>
      <StudyInner />
    </Suspense>
  )
}