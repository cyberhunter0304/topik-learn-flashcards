'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getKnown, getProgress } from '@/lib/storage'

const PETALS = ['🌸','🌼','✨','🍀','🌺','⭐','🌷','💛']
const TOTAL = 1671

export default function Home() {
  const router = useRouter()
  const [knownCount, setKnownCount] = useState(0)
  const [progress, setProgress] = useState<{ index: number; mode: string } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setKnownCount(getKnown().size)
    setProgress(getProgress())
    setMounted(true)
  }, [])

  const pct = Math.round((knownCount / TOTAL) * 100)
  const circumference = 2 * Math.PI * 44

  return (
    <main className="home-main">
      {mounted && PETALS.map((p, i) => (
        <span key={i} className="float-petal" style={{
          left: `${8 + (i * 12.5)}%`,
          animationDelay: `${i * -2.8}s`,
          animationDuration: `${16 + i * 2.3}s`,
          fontSize: `${1.1 + (i % 3) * 0.4}rem`,
          opacity: 0.18 + (i % 4) * 0.04
        }}>{p}</span>
      ))}

      <div className="home-card">
        <div className="home-header">
          <div className="topik-badge">TOPIK I</div>
          <h1 className="home-title">한국어<br/>Vocabulary</h1>
          <p className="home-subtitle">1,671 flashcards · master them all 🌻</p>
        </div>

        <div className="progress-section">
          <div className="ring-wrap">
            <svg viewBox="0 0 100 100" className="ring-svg">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f9c74f" />
                  <stop offset="100%" stopColor="#f4a261" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="44" fill="none" stroke="#fde8a080" strokeWidth="7" />
              <circle cx="50" cy="50" r="44" fill="none"
                stroke="url(#ringGrad)" strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - pct / 100)}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)' }}
              />
            </svg>
            <div className="ring-inner">
              <span className="ring-pct">{pct}<span className="ring-pct-sym">%</span></span>
              <span className="ring-label">known</span>
            </div>
          </div>
          <p className="mastered-text">
            <strong>{knownCount.toLocaleString()}</strong> of {TOTAL.toLocaleString()} cards mastered
            {knownCount > 0 && <span> 🎉</span>}
          </p>
          <div className="mini-bar-bg">
            <div className="mini-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="divider"><span>✦ study mode ✦</span></div>

        <div className="btn-stack">
          <button className="btn-mode btn-mode--primary" onClick={() => router.push('/study?mode=order')}>
            <span className="btn-icon-wrap">📖</span>
            <span className="btn-text">
              <span className="btn-title">Study in Order</span>
              <span className="btn-hint">card 1 → 1,671</span>
            </span>
            <span className="btn-arrow">›</span>
          </button>

          <button className="btn-mode btn-mode--secondary" onClick={() => router.push('/study?mode=shuffle')}>
            <span className="btn-icon-wrap">🔀</span>
            <span className="btn-text">
              <span className="btn-title">Shuffle</span>
              <span className="btn-hint">random order</span>
            </span>
            <span className="btn-arrow">›</span>
          </button>

          <button className="btn-mode btn-mode--secondary"
            onClick={() => router.push('/study?mode=review')}
            disabled={knownCount === TOTAL}>
            <span className="btn-icon-wrap">📚</span>
            <span className="btn-text">
              <span className="btn-title">Review Still Learning</span>
              <span className="btn-hint">{TOTAL - knownCount} remaining</span>
            </span>
            <span className="btn-arrow">›</span>
          </button>

          <button className="btn-mode btn-mode--glossary" onClick={() => router.push('/glossary')}>
            <span className="btn-icon-wrap">📋</span>
            <span className="btn-text">
              <span className="btn-title">Word Glossary</span>
              <span className="btn-hint">browse & search all 1,671 words</span>
            </span>
            <span className="btn-arrow">›</span>
          </button>

          {progress && (
            <button className="btn-mode btn-mode--resume"
              onClick={() => router.push(`/study?mode=${progress.mode}&resume=${progress.index}`)}>
              <span className="btn-icon-wrap">↩</span>
              <span className="btn-text">
                <span className="btn-title">Resume Session</span>
                <span className="btn-hint">pick up from #{progress.index + 1}</span>
              </span>
              <span className="btn-arrow">›</span>
            </button>
          )}
        </div>

        <p className="home-footer">Keep going — you're doing great! 🌻</p>
      </div>
    </main>
  )
}