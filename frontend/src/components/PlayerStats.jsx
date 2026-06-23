import { useAccount, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import RPS from '../contracts/RPS.json'

export function PlayerStats() {
  const { address, isConnected } = useAccount()

  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RPS,
    functionName: 'getStats',
    args: [address],
    query: { enabled: !!address },
  })

  if (!isConnected || !address) return null
  if (isLoading) return <p>전적 불러오는 중...</p>

  const [wins, losses, draws, total] = data ?? [0n, 0n, 0n, 0n]

  return (
    <div style={{
      margin: '1.5rem 0',
      padding: '1rem 1.5rem',
      background: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
    }}>
      <h3 style={{ margin: '0 0 0.75rem 0' }}>📊 내 전적</h3>
      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '1.1rem' }}>
        <span>🎉 승 <strong>{wins.toString()}</strong></span>
        <span>😢 패 <strong>{losses.toString()}</strong></span>
        <span>🤝 무 <strong>{draws.toString()}</strong></span>
        <span style={{ color: '#94a3b8' }}>총 {total.toString()}판</span>
      </div>
    </div>
  )
}