import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'

const WALLET_ICONS = {
  'MetaMask': '🦊',
  'Coinbase Wallet': '🔵',
}

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const isWrongNetwork = isConnected && chain?.id !== baseSepolia.id

  // Injected 중복 제거: MetaMask가 따로 있으면 Injected 숨김
  const hasMetaMask = connectors.some(c => c.name === 'MetaMask')
  const filtered = connectors.filter(c => !(c.name === 'Injected' && hasMetaMask))

  if (isConnected) {
    return (
      <div style={{
        background: 'white', borderRadius: '12px',
        border: '1px solid #e2e8f0', padding: '1rem 1.25rem', marginBottom: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.9rem' }}>✅</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem' }}>🔗</span>
              <span style={{ fontSize: '0.8rem', color: isWrongNetwork ? '#dc2626' : '#64748b' }}>
                {isWrongNetwork ? '⚠️ 잘못된 네트워크' : chain?.name}
              </span>
            </div>
          </div>
          <button
            onClick={() => disconnect()}
            style={{
              padding: '0.4rem 0.8rem', fontSize: '0.8rem',
              cursor: 'pointer', background: 'white',
              border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b',
            }}
          >
            연결 해제
          </button>
        </div>

        {isWrongNetwork && (
          <button
            onClick={() => switchChain({ chainId: baseSepolia.id })}
            style={{
              marginTop: '0.75rem', width: '100%',
              padding: '0.6rem', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', background: '#4f46e5',
              color: 'white', border: 'none', borderRadius: '8px',
            }}
          >
            Base Sepolia로 전환
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: 'white', borderRadius: '12px',
      border: '1px solid #e2e8f0', padding: '1.25rem', marginBottom: '0.75rem',
    }}>
      <p style={{ margin: '0 0 0.75rem', fontWeight: 600, fontSize: '0.95rem' }}>
        지갑 연결
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', fontSize: '0.95rem', fontWeight: 500,
              cursor: isPending ? 'not-allowed' : 'pointer',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '10px', textAlign: 'left',
              transition: 'border-color 0.15s',
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>
              {WALLET_ICONS[connector.name] || '👛'}
            </span>
            {connector.name}
          </button>
        ))}
      </div>
    </div>
  )
}
