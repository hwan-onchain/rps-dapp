import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  if (isConnected) {
    return (
      <div>
        <p>✅ 연결됨: {address.slice(0, 6)}...{address.slice(-4)}</p>
        <p>🔗 네트워크: {chain?.name}</p>
        {chain?.id !== baseSepolia.id && (
          <div>
            <p style={{ color: 'orange' }}>⚠️ Base Sepolia로 네트워크 바꿔줘!</p>
            <button onClick={() => switchChain({ chainId: baseSepolia.id })}>
              🔄 자동으로 바꾸기
            </button>
          </div>
        )}
        <button onClick={() => disconnect()}>연결 해제</button>
      </div>
    )
  }

  return (
    <button onClick={() => connect({ connector: connectors[0] })}>
      🦊 MetaMask 연결
    </button>
  )
}