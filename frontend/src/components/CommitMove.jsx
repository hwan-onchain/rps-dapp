import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useWriteContracts, useCallsStatus } from 'wagmi/experimental'
import { keccak256, encodePacked, toHex } from 'viem'
import { CONTRACT_ADDRESS, PAYMASTER_URL } from '../config/wagmi'
import RPS from '../contracts/RPS.json'

const MOVES = [
  { label: '✊ 바위', value: 1 },
  { label: '✌️ 가위', value: 3 },
  { label: '🖐️ 보', value: 2 },
]

function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return toHex(bytes)
}

export function CommitMove({ onCommitted }) {
  const { address, isConnected } = useAccount()
  const [selectedMove, setSelectedMove] = useState(null)
  const [callsId, setCallsId] = useState(undefined)

  const { writeContracts, isPending } = useWriteContracts({
    mutation: { onSuccess: (id) => setCallsId(id) },
  })

  const { data: callsStatus } = useCallsStatus({
    id: callsId,
    query: {
      enabled: !!callsId,
      refetchInterval: (data) => data?.status === 'CONFIRMED' ? false : 1000,
    },
  })

  const isConfirming = callsStatus?.status === 'PENDING'
  const isConfirmed = callsStatus?.status === 'CONFIRMED'

  useEffect(() => {
    if (isConfirmed && onCommitted) onCommitted()
  }, [isConfirmed])

  const handleCommit = (moveValue) => {
    const salt = generateSalt()
    const commitment = keccak256(encodePacked(['uint8', 'bytes32'], [moveValue, salt]))
    localStorage.setItem('rps_salt_' + address, salt)
    localStorage.setItem('rps_move_' + address, String(moveValue))
    setSelectedMove(moveValue)
    writeContracts({
      contracts: [{
        address: CONTRACT_ADDRESS,
        abi: RPS,
        functionName: 'commit',
        args: [commitment],
      }],
      capabilities: {
        paymasterService: { url: PAYMASTER_URL },
      },
    })
  }

  if (!isConnected) {
    return (
      <div style={{
        padding: '2rem', textAlign: 'center', color: '#94a3b8',
        background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0',
      }}>
        지갑을 먼저 연결해주세요 👆
      </div>
    )
  }

  const isLoading = isPending || isConfirming

  return (
    <div>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 0 }}>
        선택하면 자동으로 해시 계산 후 가스비 없이 제출됩니다. ⚡
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', margin: '1rem 0' }}>
        {MOVES.map((move) => {
          const isSelected = selectedMove === move.value
          return (
            <button
              key={move.value}
              onClick={() => handleCommit(move.value)}
              disabled={isLoading || isConfirmed}
              style={{
                flex: 1, padding: '1.2rem 0.5rem', fontSize: '1.1rem',
                cursor: isLoading || isConfirmed ? 'not-allowed' : 'pointer',
                border: isSelected ? '2px solid #4f46e5' : '2px solid #e2e8f0',
                borderRadius: '12px',
                background: isSelected ? '#ede9fe' : 'white',
                fontWeight: isSelected ? 700 : 400,
                transition: 'all 0.15s',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {move.label}
            </button>
          )
        })}
      </div>

      {isPending && (
        <div style={{ padding: '0.75rem', background: '#fef9c3', borderRadius: '8px', fontSize: '0.9rem' }}>
          🔐 지갑에서 서명해주세요...
        </div>
      )}
      {isConfirming && (
        <div style={{ padding: '0.75rem', background: '#e0f2fe', borderRadius: '8px', fontSize: '0.9rem' }}>
          ⏳ 블록 확인 중... (잠깐 기다려요)
        </div>
      )}
      {isConfirmed && (
        <div style={{
          padding: '0.75rem', background: '#f0fdf4',
          borderRadius: '8px', border: '1px solid #86efac', fontSize: '0.9rem',
        }}>
          ✅ 커밋 완료! 아래 <strong>결과 확인 버튼</strong>을 눌러주세요.
        </div>
      )}
    </div>
  )
}
