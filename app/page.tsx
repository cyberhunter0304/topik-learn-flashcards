'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getKnown, getProgress } from '@/lib/storage'

export default function Home() {
  const router = useRouter()
  const [knownCount, setKnownCount] = useState(0)
  const [progress, setProgress] = useState<{ index: number; mode: string } | null>(null)

  useEffect(() => {
    setKnownCount(getKnown().size)
    setProgress(getProgress())
  }, [])

  const total = 1671
  const pct   = Math.round((knownCount / total) * 100)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--cream)' }}>

      {/* Background decorations: Bees and Sunflowers */}
      {/* Floating bees */}
      {[
        { top:'8%', left:'5%',  dur:'20s', delay:'-3s'  },
        { top:'18%', left:'88%', dur:'24s', delay:'-8s'  },
        { top:'72%', left:'92%', dur:'22s', delay:'-12s' },
        { top:'85%', left:'3%',  dur:'18s', delay:'-6s'  },
        { top:'35%', left:'12%', dur:'26s', delay:'-14s' },
        { top:'62%', left:'88%', dur:'23s', delay:'-9s' },
      ].map((b, i) => (
        <div key={`bee-${i}`} className="bg-bee" style={{ top:b.top,left:b.left,animationDuration:b.dur,animationDelay:b.delay }}>🐝</div>
      ))}

      {/* Decorative sunflowers */}
      {[
        { top:'15%', left:'88%', size:'3.5rem', opacity:'0.25' },
        { top:'70%', left:'7%', size:'2.8rem', opacity:'0.22' },
        { top:'8%', left:'2%', size:'2.2rem', opacity:'0.18' },
        { top:'78%', left:'90%', size:'2.5rem', opacity:'0.2' },
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

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6 slide-in">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-2 tracking-tight" style={{ color: 'var(--charcoal)' }}>
            TOPIK I <span style={{ color: 'var(--honey)' }}>🌻</span>
          </h1>
          <p className="text-base font-medium" style={{ color: 'var(--muted)' }}>
            1,671 Korean Vocabulary Cards
          </p>
        </div>

        {/* Progress ring */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(212,160,23,0.2)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none"
                stroke="var(--gold)" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1.2s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: 'var(--charcoal)' }}>{pct}%</span>
              <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>known</span>
            </div>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
            {knownCount} of {total} cards mastered
          </p>
        </div>

        {/* Mode buttons */}
        <div className="flex flex-col gap-3">
          <button onClick={() => router.push('/study?mode=order')}
            className="w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--honey), var(--gold))',
              color: 'white',
              boxShadow: '0 4px 20px rgba(212,160,23,0.38)'
            }}>
            Study In Order
          </button>

          <button onClick={() => router.push('/study?mode=shuffle')}
            className="w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: 'var(--warm-white)',
              color: 'var(--charcoal)',
              border: '1.5px solid rgba(212,160,23,0.35)',
              boxShadow: 'var(--card-shadow)'
            }}>
            🔀 Shuffle
          </button>

          <button onClick={() => router.push('/study?mode=review')}
            className="w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--warm-white)',
              color: 'var(--charcoal)',
              border: '1.5px solid rgba(212,160,23,0.35)',
              boxShadow: 'var(--card-shadow)'
            }}
            disabled={knownCount === total}>
            📚 Review Still Learning
            <span className="ml-2 text-sm font-normal" style={{ color: 'var(--muted)' }}>({total - knownCount})</span>
          </button>
        </div>

        {/* Resume */}
        {progress && (
          <button onClick={() => router.push(`/study?mode=${progress.mode}&resume=${progress.index}`)}
            className="w-full py-3.5 px-6 rounded-2xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: 'var(--amber-light)',
              color: 'var(--charcoal)',
              border: '1px solid rgba(212,160,23,0.35)',
              boxShadow: 'var(--card-shadow)'
            }}>
            ↩ Resume from #{progress.index + 1}
          </button>
        )}
      </div>
    </main>
  )
}
