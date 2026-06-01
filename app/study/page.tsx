'use client'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import vocab from '@/data/vocab.json'
import { romanize, syllabify } from '@/lib/romanize'
import { speakKorean } from '@/lib/speech'
import { getKnown, toggleKnown, saveProgress } from '@/lib/storage'
import BeeAssist from '@/components/BeeAssist'

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

  const touchStartX   = useRef(0)
  const touchStartY   = useRef(0)
  const touchStartTime = useRef(0)
  // Track if touch moved significantly — prevents onClick from also firing on mobile
  const touchMoved    = useRef(false)

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
    touchStartX.current    = e.touches[0].clientX
    touchStartY.current    = e.touches[0].clientY
    touchStartTime.current = Date.now()
    touchMoved.current     = false
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current)
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (dx > 8 || dy > 8) touchMoved.current = true
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx       = e.changedTouches[0].clientX - touchStartX.current
    const dy       = e.changedTouches[0].clientY - touchStartY.current
    const elapsed  = Date.now() - touchStartTime.current
    const absDx    = Math.abs(dx)
    const absDy    = Math.abs(dy)

    if (absDx > absDy && absDx > 50) {
      // Horizontal swipe
      touchMoved.current = true
      dx < 0 ? goTo(index + 1) : goTo(index - 1)
    } else if (!touchMoved.current && elapsed < 400) {
      // Clean tap — flip the card
      flip()
    }
  }

  // On mobile, touch events fire before click. We suppress the synthetic click
  // when a touch gesture was already handled to avoid double-flip.
  const onCardClick = (e: React.MouseEvent) => {
    if (touchMoved.current) return
    // Only fire on non-touch (mouse) clicks
    if ((e.nativeEvent as PointerEvent).pointerType === 'touch') return
    flip()
  }

  if (!card) return (
    <div className="study-loading">
      <span>Loading</span>
      <span className="study-loading-dots">…</span>
    </div>
  )

  const isKnown   = known.has(card.id)
  const syllables = syllabify(card.korean)
  const rom       = syllabifyRoman(card.korean)
  const progress  = deck.length > 0 ? ((index + 1) / deck.length) * 100 : 0
  const knownCount = known.size

  const modeLabel: Record<string, string> = {
    order: '📖 In Order',
    shuffle: '🔀 Shuffle',
    review: '📚 Review',
  }

  return (
    <main className="study-main">

      {/* Floating petals */}
      {['🌸','🌙','✨','🌼','💛','🌺','⭐','🐝','☀️','🌻','🐝',].map((p, i) => (
        <span key={i} className="float-petal" style={{
          left: `${5 + i * 17}%`,
          animationDelay: `${i * -3.1}s`,
          animationDuration: `${18 + i * 2.5}s`,
          fontSize: `${0.9 + (i % 3) * 0.35}rem`,
          opacity: 0.14 + (i % 3) * 0.04
        }}>{p}</span>
      ))}

      {/* ── Top bar ── */}
      <div className="study-topbar">
        <button className="study-back-btn" onClick={() => router.push('/')}>
          ← Home
        </button>

        <div className="study-mode-badge">{modeLabel[mode] ?? mode}</div>

        <button
          className={`study-known-btn ${isKnown ? 'study-known-btn--on' : ''}`}
          onClick={markKnown}
        >
          {isKnown ? '✓ Known' : 'Mark Known'}
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="study-progress-wrap">
        <div className="study-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Counter strip ── */}
      <div className="study-counter-strip">
        <span className="study-counter-num">
          {index + 1}<span className="study-counter-sep">/</span>{deck.length}
        </span>
        <span className="study-counter-known">
          {knownCount} known ✦ {deck.length - knownCount} to go
        </span>
      </div>

      {/* ── Card area ── */}
      <div className="study-card-area">
        <div
          key={animKey}
          className="study-card-scene slide-in"
          onClick={onCardClick}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className={`study-card-inner ${flipped ? 'flipped' : ''}`}>

            {/* Front — English */}
            <div className="study-card-face study-card-front">
              <span className="study-card-id">#{card.id}</span>
              <p className="study-card-english" style={{
                fontSize: card.english.length > 25 ? '1.3rem'
                        : card.english.length > 15 ? '1.75rem'
                        : '2.3rem'
              }}>
                {card.english}
              </p>
              <span className="study-card-hint">tap to reveal 🌸</span>
            </div>

            {/* Back — Korean */}
            <div className="study-card-face study-card-back">
              <span className="study-card-id">#{card.id}</span>

              <p className="study-card-korean" style={{
                fontSize: card.korean.length > 5 ? '2.6rem' : '3.4rem'
              }}>
                {card.korean}
              </p>

              {/* Syllable pop-in */}
              <div className="study-syllables">
                {sylVisible && syllables.map((syl, i) => (
                  syl === ' '
                    ? <span key={i} className="w-2" />
                    : <span key={i} className="syllable-char study-syl"
                        style={{ animationDelay: `${i * 80}ms` }}>
                        {syl}
                      </span>
                ))}
              </div>

              <div className="study-divider" />
              <p className="study-roman">{rom}</p>

              <button
                className="study-replay-btn"
                onClick={e => { e.stopPropagation(); replay() }}
                title="Replay (R)"
              >
                🔊 {slowMode ? 'Slow replay' : 'Replay'}
              </button>

              <BeeAssist korean={card.korean} english={card.english} />
            </div>
          </div>
        </div>

        <p className="study-swipe-hint">
          {flipped ? '← swipe or arrow keys to navigate →' : 'tap · Space · Enter to flip'}
        </p>
      </div>

      {/* ── Bottom nav ── */}
      <div className="study-nav-row">
        <button
          className="study-nav-btn"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous"
        >←</button>

        <button className="study-reveal-btn" onClick={flip}>
          {flipped ? 'Hide' : 'Reveal'}
        </button>

        <button
          className="study-nav-btn"
          onClick={() => goTo(index + 1)}
          disabled={index === deck.length - 1}
          aria-label="Next"
        >→</button>
      </div>

      {/* ── Toggles ── */}
      <div className="study-toggles-row">
        <button
          className={`study-toggle ${slowMode ? 'study-toggle--on' : ''}`}
          onClick={() => setSlowMode(v => !v)}
        >
          🐢 {slowMode ? 'Slow' : 'Normal'}
        </button>

        <button
          className={`study-toggle ${muted ? 'study-toggle--muted' : ''}`}
          onClick={() => setMuted(v => !v)}
        >
          {muted ? '🔇 Muted' : '🔊 Sound'}
        </button>

        <button
          className={`study-toggle ${legendOpen ? 'study-toggle--on' : ''}`}
          onClick={() => setLegendOpen(v => !v)}
        >
          ⌨ Keys
        </button>
      </div>

      {/* ── Shortcut legend ── */}
      {legendOpen && (
        <div className="study-legend fade-in">
          <div className="study-legend-header">
            <span>⌨ Shortcuts</span>
            <button onClick={() => setLegendOpen(false)}>✕</button>
          </div>
          {[
            { key: 'Enter / Space', label: 'Flip card' },
            { key: '← →',          label: 'Prev / Next' },
            { key: 'R',            label: 'Replay audio' },
            { key: 'K',            label: 'Toggle Known' },
            { key: 'M',            label: 'Mute / Unmute' },
            { key: 'S',            label: 'Slow / Normal' },
            { key: '?',            label: 'This panel' },
          ].map(({ key, label }) => (
            <div key={key} className="study-legend-row">
              <span>{label}</span>
              <kbd className="shortcut-key">{key}</kbd>
            </div>
          ))}
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