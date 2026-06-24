import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useWriteContracts, useCallsStatus } from 'wagmi/experimental'
import { decodeEventLog } from 'viem'
import { CONTRACT_ADDRESS, PAYMASTER_URL } from '../config/wagmi'
import RPS from '../contracts/RPS.json'

const CHOICE_LABEL = { 1: '✊ 바위', 2: '🖐️ 보', 3: '✌️ 가위' }
const RESULT_CONFIG = {
  1: { label: '🎉 승리!',  bg: '#f0fdf4', border: '#86efac', color: '#166534' },
  2: { label: '😢 패배...', bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' },
  3: { label: '🤝 무승부', bg: '#f8fafc', border: '#cbd5e1', color: '#475569' },
}

export function RevealMove({ onRevealed, onPlayAgain }) {
  const { address, isConnected } = useAccount()
  const [gameResult, setGameResult] = useState(null)
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
  const txHash = callsStatus?.receipts?.[0]?.transactionHash

  useEffect(() => {
    if (!isConfirmed || !callsStatus?.receipts?.length) return
    const receipt = callsStatus.receipts[0]
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: RPS, data: log.data, topics: log.topics })
        if (decoded.eventName === 'GameResult') {
          setGameResult({
            playerChoice: Number(decoded.args.playerChoice),
            systemChoice: Number(decoded.args.systemChoice),
            result: Number(decoded.args.result),
          })
          if (onRevealed) onRevealed()
          break
        }
      } catch {}
    }
  }, [isConfirmed, callsStatus])

  function handleReveal() {
    const salt = localStorage.getItem('rps_salt_' + address)
    const move = localStorage.getItem('rps_move_' + address)
    if (!salt || !move) {
      alert('먼저 무브를 선택(커밋)해주세요!')
      return
    }
    writeContracts({
      contracts: [{
        address: CONTRACT_ADDRESS,
        abi: RPS,
        functionName: 'reveal',
        args: [Number(move), salt],
      }],
      capabilities: {
        paymasterService: { url: PAYMASTER_URL },
      },
    })
  }

  function handlePlayAgain() {
    localStorage.removeItem('rps_salt_' + address)
    localStorage.removeItem('rps_move_' + address)
    setGameResult(null)
    setCallsId(undefined)
    if (onPlayAgain) onPlayAgain()
  }

  if (!isConnected) return null

  const isLoading = isPending || isConfirming
  const cfg = gameResult ? RESULT_CONFIG[gameResult.result] : null
  const basescanUrl = txHash ? 'https://sepolia.basescan.org/tx/' + txHash : '#'

  return (
    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>

      {!gameResult && (
        <>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 0 }}>
            커밋 완료 후 버튼을 누르면 결과가 나와요.
          </p>
          <button
            onClick={handleReveal}
            disabled={isLoading}
            style={{
              width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              background: isLoading ? '#a5b4fc' : '#4f46e5',
              color: 'white', border: 'none', borderRadius: '12px',
              transition: 'background 0.2s',
            }}
          >
            {isLoading ? '처리 중...' : '🎲 결과 확인 (리빌)'}
          </button>

          {isPending && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fef9c3', borderRadius: '8px', fontSize: '0.9rem' }}>
              🔐 지갑에서 서명해주세요...
            </div>
          )}
          {isConfirming && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#e0f2fe', borderRadius: '8px', fontSize: '0.9rem' }}>
              ⏳ 블록 확인 중... (잠깐 기다려요)
            </div>
          )}
        </>
      )}

      {gameResult && cfg && (
        <div style={{
          padding: '1.5rem', textAlign: 'center',
          background: cfg.bg, borderRadius: '16px', border: '2px solid ' + cfg.border,
        }}>
          <p style={{ fontSize: '2rem', fontWeight: 900, color: cfg.color, margin: '0 0 0.75rem' }}>
            {cfg.label}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '1.05rem', marginBottom: '1rem', color: '#1e293b' }}>
            <span>나: {CHOICE_LABEL[gameResult.playerChoice]}</span>
            <span style={{ color: '#94a3b8' }}>vs</span>
            <span>시스템: {CHOICE_LABEL[gameResult.systemChoice]}</span>
          </div>
          {txHash && (
            <a
              href={basescanUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.8rem', color: '#4f46e5' }}
            >
              BaseScan에서 확인 ↗
            </a>
          )}
          <button
            onClick={handlePlayAgain}
            style={{
              display: 'block', width: '100%', marginTop: '1rem',
              padding: '0.75rem', fontSize: '1rem', fontWeight: 600,
              cursor: 'pointer', background: '#4f46e5',
              color: 'white', border: 'none', borderRadius: '10px',
            }}
          >
            🔄 한 판 더!
          </button>
        </div>
      )}
    </div>
  )
}
