import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { decodeEventLog } from 'viem'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import RPS from '../contracts/RPS.json'
import { useState, useEffect } from 'react'

const CHOICE_LABEL = { 1: '✊ 바위', 2: '🖐️ 보', 3: '✌️ 가위' }
const RESULT_LABEL = { 1: '🎉 승리!', 2: '😢 패배...', 3: '🤝 무승부' }

export function RevealMove() {
  const { address, isConnected } = useAccount()
  const [gameResult, setGameResult] = useState(null)

  const { writeContract, data: txHash, isPending, isError, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } =
    useWaitForTransactionReceipt({ hash: txHash })

  // 트랜잭션 완료되면 영수증 로그에서 직접 결과 파싱
  useEffect(() => {
    if (!isConfirmed || !receipt) return
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: RPS, data: log.data, topics: log.topics })
        if (decoded.eventName === 'GameResult') {
          setGameResult({
            playerChoice: Number(decoded.args.playerChoice),
            systemChoice: Number(decoded.args.systemChoice),
            result: Number(decoded.args.result),
          })
          break
        }
      } catch {}
    }
  }, [isConfirmed, receipt])

  function handleReveal() {
    const salt = localStorage.getItem('rps_salt_' + address)
    const move = localStorage.getItem('rps_move_' + address)
    if (!salt || !move) {
      alert('먼저 무브를 선택(커밋)해주세요!')
      return
    }
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RPS,
      functionName: 'reveal',
      args: [Number(move), salt],
    })
  }

  if (!isConnected) return null

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
      <h2>🔓 리빌 (결과 확인)</h2>
      <p>커밋 후 리빌 버튼을 누르면 시스템이 무브를 정하고 결과가 나와요.</p>

      <button
        onClick={handleReveal}
        disabled={isPending || isConfirming}
        style={{
          padding: '0.8rem 2rem',
          fontSize: '1rem',
          cursor: isPending || isConfirming ? 'not-allowed' : 'pointer',
          background: '#059669',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          marginTop: '1rem',
        }}
      >
        {isPending ? '서명 대기 중...' : isConfirming ? '블록 확인 중...' : '🎲 결과 확인'}
      </button>

      {isPending && <p>🦊 MetaMask에서 서명해주세요...</p>}
      {isConfirming && <p>⏳ 블록 확인 기다리는 중...</p>}

      {gameResult && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          background: '#f0fdf4',
          borderRadius: '12px',
          border: '1px solid #86efac',
        }}>
          <p>나: {CHOICE_LABEL[gameResult.playerChoice]}</p>
          <p>시스템: {CHOICE_LABEL[gameResult.systemChoice]}</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {RESULT_LABEL[gameResult.result]}
          </p>
        </div>
      )}

      {isError && (
        <p style={{ color: 'red' }}>에러: {error?.shortMessage || error?.message}</p>
      )}
    </div>
  )
}