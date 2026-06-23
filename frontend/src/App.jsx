import { ConnectWallet } from './components/ConnectWallet'
import { CommitMove } from './components/CommitMove'
import { RevealMove } from './components/RevealMove'
import { PlayerStats } from './components/PlayerStats'

function App() {
  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      padding: '2rem 1rem',
      fontFamily: 'sans-serif',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>
        ✂️ 가위바위보 dApp
      </h1>
      <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Sepolia 테스트넷
      </p>

      <ConnectWallet />
      <PlayerStats />
      <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
      <CommitMove />
      <RevealMove />
    </div>
  )
}

export default App