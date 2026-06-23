import { ConnectWallet } from './components/ConnectWallet'

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>✂️ 가위바위보 dApp</h1>
      <ConnectWallet />
    </div>
  )
}

export default App