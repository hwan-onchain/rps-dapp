import { ConnectWallet } from './components/ConnectWallet'
import { CommitMove } from './components/CommitMove'
import { RevealMove } from './components/RevealMove'

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>✂️ 가위바위보 dApp</h1>
      <ConnectWallet />
      <CommitMove />
      <RevealMove />
    </div>
  )
}

export default App