import { useAccount, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import RPS from '../contracts/RPS.json'

function StatBox({ label, value, color, bg }) {
  return (
    <div style={{ flex: 1, padding: '0.5rem', textAlign: 'center', background: bg, borderRadius: '8px' }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: color }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

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
  if (isLoading) return <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>전적 불러오는 중...</p>

  const [wins, losses, draws, total] = data ?? [0n, 0n, 0n, 0n]
  const totalNum = Number(total)
  const winRate = totalNum > 0 ? Math.round((Number(wins) / totalNum) * 100) : 0

  return (
    <div style={{
      margin: '1rem 0', padding: '1rem 1.25rem',
      background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>📊 내 전적</span>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>총 {totalNum}판</span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <StatBox label="승"   value={wins.toString()}   color="#166534" bg="#f0fdf4" />
        <StatBox label="패"   value={losses.toString()} color="#991b1b" bg="#fef2f2" />
        <StatBox label="무"   value={draws.toString()}  color="#475569" bg="#f8fafc" />
        <StatBox label="승률" value={winRate + '%'}     color="#4f46e5" bg="#ede9fe" />
      </div>
    </div>
  )
}
