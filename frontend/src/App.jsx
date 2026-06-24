import { useState } from 'react'
import { ConnectWallet } from './components/ConnectWallet'
import { CommitMove } from './components/CommitMove'
import { RevealMove } from './components/RevealMove'
import { PlayerStats } from './components/PlayerStats'
import './App.css'

function StepBadge({ num, label, active, done }) {
  const isActive = active || done
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        background: isActive ? '#4f46e5' : '#e2e8f0',
        color: isActive ? 'white' : '#94a3b8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '0.9rem',
        transition: 'background 0.3s',
      }}>
        {done ? '✓' : num}
      </div>
      <span style={{ fontSize: '0.72rem', color: isActive ? '#4f46e5' : '#94a3b8', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  )
}

function App() {
  const [phase, setPhase] = useState('idle')
  const [gameKey, setGameKey] = useState(0)

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      padding: '2rem 1rem 4rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>✊✌️🖐️</div>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.4rem', fontWeight: 800 }}>
          가위바위보 dApp
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
          Base Sepolia 테스트넷
        </p>
      </div>

      <ConnectWallet />
      <PlayerStats />

      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        marginTop: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
          <StepBadge
            num={1}
            label="무브 선택"
            active={phase === 'idle'}
            done={phase === 'committed' || phase === 'revealed'}
          />
          <div style={{
            flex: 1,
            height: '2px',
            margin: '0 0.5rem',
            marginBottom: '18px',
            background: phase !== 'idle' ? '#4f46e5' : '#e2e8f0',
            transition: 'background 0.3s',
          }} />
          <StepBadge
            num={2}
            label="결과 확인"
            active={phase === 'committed'}
            done={phase === 'revealed'}
          />
        </div>

        <CommitMove
          key={gameKey}
          onCommitted={() => setPhase('committed')}
        />
        <RevealMove
          onRevealed={() => setPhase('revealed')}
          onPlayAgain={() => {
            setPhase('idle')
            setGameKey(k => k + 1)
          }}
        />
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: '2rem' }}>
        <a
          href="https://sepolia.basescan.org/address/0xBcFDf92dF73ac551aFAb6fbFB199642974Ddd3C7"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#cbd5e1', textDecoration: 'none' }}
        >
          컨트랙트 보기
        </a>
      </p>
    </div>
  )
}

export default App
