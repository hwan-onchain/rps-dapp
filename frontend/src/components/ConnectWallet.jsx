import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div>
        <p>✅ 연결됨: {address.slice(0, 6)}...{address.slice(-4)}</p>
        <p>🔗 네트워크: {chain?.name}</p>
        {chain?.id !== 11155111 && (
          <p style={{ color: 'red' }}>⚠️ Sepolia로 네트워크 바꿔줘!</p>
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