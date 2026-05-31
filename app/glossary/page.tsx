'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import vocab from '@/data/vocab.json'
import { romanize } from '@/lib/romanize'
import { speakKorean } from '@/lib/speech'
import { getKnown, toggleKnown } from '@/lib/storage'

type Card = { id: number; korean: string; english: string }

type Filter = 'all' | 'known' | 'unknown'

function romanizeWord(korean: string): string {
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

export default function GlossaryPage() {
  const router = useRouter()
  const [known, setKnown] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [playing, setPlaying] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setKnown(getKnown())
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return (vocab as Card[]).filter(card => {
      if (filter === 'known' && !known.has(card.id)) return false
      if (filter === 'unknown' && known.has(card.id)) return false
      if (!q) return true
      return (
        card.english.toLowerCase().includes(q) ||
        card.korean.includes(q) ||
        romanizeWord(card.korean).toLowerCase().includes(q)
      )
    })
  }, [search, filter, known])

  const handleToggleKnown = (id: number) => {
    const updated = toggleKnown(id)
    setKnown(new Set(updated))
  }

  const handlePlay = (card: Card) => {
    setPlaying(card.id)
    speakKorean(card.korean, false)
    setTimeout(() => setPlaying(null), 1200)
  }

  const knownCount = known.size
  const total = (vocab as Card[]).length

  return (
    <main className="glossary-main">

      {/* Floating petals */}
      {['🌸','✨','🌼','💛','🌺','⭐'].map((p, i) => (
        <span key={i} className="float-petal" style={{
          left: `${5 + i * 17}%`,
          animationDelay: `${i * -3.1}s`,
          animationDuration: `${18 + i * 2.5}s`,
          fontSize: `${0.9 + (i % 3) * 0.35}rem`,
          opacity: 0.13 + (i % 3) * 0.03
        }}>{p}</span>
      ))}

      {/* Header */}
      <div className="glossary-header">
        <button className="study-back-btn" onClick={() => router.push('/')}>← Home</button>
        <div className="glossary-title-wrap">
          <div className="topik-badge">Glossary</div>
          <h1 className="glossary-title">All Words</h1>
        </div>
        <div className="glossary-stats">
          <span className="glossary-stat-num">{knownCount}</span>
          <span className="glossary-stat-label">/ {total} known</span>
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="study-progress-wrap" style={{ margin: '0 1.1rem 0.75rem' }}>
        <div className="study-progress-bar" style={{ width: `${Math.round(knownCount / total * 100)}%` }} />
      </div>

      {/* Search + filter */}
      <div className="glossary-controls">
        <div className="glossary-search-wrap">
          <span className="glossary-search-icon">🔍</span>
          <input
            ref={searchRef}
            className="glossary-search"
            type="text"
            placeholder="Search English, Korean, or romanization…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="glossary-search-clear" onClick={() => { setSearch(''); searchRef.current?.focus() }}>✕</button>
          )}
        </div>

        <div className="glossary-filters">
          {(['all', 'known', 'unknown'] as Filter[]).map(f => (
            <button
              key={f}
              className={`glossary-filter-btn ${filter === f ? 'glossary-filter-btn--on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? `All (${total})` : f === 'known' ? `✓ Known (${knownCount})` : `Still learning (${total - knownCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="glossary-result-count">
        {filtered.length === total ? `${total} words` : `${filtered.length} of ${total} words`}
      </div>

      {/* Table */}
      <div className="glossary-table-wrap">
        {filtered.length === 0 ? (
          <div className="glossary-empty">No words match your search 🌻</div>
        ) : (
          <table className="glossary-table">
            <thead>
              <tr>
                <th className="glossary-th glossary-th--num">#</th>
                <th className="glossary-th">Korean</th>
                <th className="glossary-th glossary-th--roman">Romanization</th>
                <th className="glossary-th">English</th>
                <th className="glossary-th glossary-th--actions">Audio</th>
                <th className="glossary-th glossary-th--actions">Known</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((card, i) => {
                const isKnown = known.has(card.id)
                const isPlaying = playing === card.id
                return (
                  <tr key={card.id} className={`glossary-row ${isKnown ? 'glossary-row--known' : ''} ${i % 2 === 0 ? 'glossary-row--even' : ''}`}>
                    <td className="glossary-td glossary-td--num">{card.id}</td>
                    <td className="glossary-td glossary-td--korean">{card.korean}</td>
                    <td className="glossary-td glossary-td--roman">{romanizeWord(card.korean)}</td>
                    <td className="glossary-td">{card.english}</td>
                    <td className="glossary-td glossary-td--center">
                      <button
                        className={`glossary-play-btn ${isPlaying ? 'glossary-play-btn--active' : ''}`}
                        onClick={() => handlePlay(card)}
                        title="Play pronunciation"
                      >
                        {isPlaying ? '🔊' : '▶'}
                      </button>
                    </td>
                    <td className="glossary-td glossary-td--center">
                      <button
                        className={`glossary-known-pill ${isKnown ? 'glossary-known-pill--on' : ''}`}
                        onClick={() => handleToggleKnown(card.id)}
                        title={isKnown ? 'Mark as unknown' : 'Mark as known'}
                      >
                        {isKnown ? '✓' : '·'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}