import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { keccak256, encodePacked, toHex } from 'viem'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import RPS from '../contracts/RPS.json'

const MOVES = [
  { label: '바위', value: 1 },
  { label: '가위', value: 3 },
  { label: '보', value: 2 },
]

function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return toHex(bytes)
}

export function CommitMove() {
  const { address, isConnected } = useAccount()
  const [selectedMove, setSelectedMove] = useState(null)

  const { writeContract, data: txHash, isPending, isError, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  const handleCommit = (moveValue) => {
    const salt = generateSalt()
    const commitment = keccak256(
      encodePacked(['uint8', 'bytes32'], [moveValue, salt])
    )
    localStorage.setItem('rps_salt_' + address, salt)
    localStorage.setItem('rps_move_' + address, String(moveValue))
    setSelectedMove(moveValue)
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RPS,
      functionName: 'commit',
      args: [commitment],
    })
  }

  if (!isConnected) {
    return <p>지갑을 먼저 연결해주세요.</p>
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>무브 선택</h2>
      <p>버튼을 누르면 자동으로 해시 계산 후 컨트랙트에 제출합니다.</p>

      <div style={{ display: 'flex', gap: '1rem', margin: '1.5rem 0' }}>
        {MOVES.map(function(move) {
          return (
            <button
              key={move.value}
              onClick={function() { handleCommit(move.value) }}
              disabled={isPending || isConfirming}
              style={{
                padding: '1rem 1.5rem',
                fontSize: '1.2rem',
                cursor: (isPending || isConfirming) ? 'not-allowed' : 'pointer',
                border: selectedMove === move.value ? '3px solid #4f46e5' : '1px solid #ccc',
                borderRadius: '8px',
                background: selectedMove === move.value ? '#ede9fe' : 'white',
              }}
            >
              {move.label}
            </button>
          )
        })}
      </div>

      {isPending && <p>MetaMask에서 서명해주세요...</p>}
      {isConfirming && <p>블록 확인 기다리는 중...</p>}
      {isConfirmed && (
        <div style={{ color: 'green' }}>
          <p>커밋 완료!</p>
          <a href={'https://sepolia.etherscan.io/tx/' + txHash} target="_blank" rel="noreferrer">
            Etherscan에서 확인
          </a>
        </div>
      )}
      {isError && (
        <p style={{ color: 'red' }}>
          {'에러: ' + (error?.shortMessage || error?.message)}
        </p>
      )}
    </div>
  )
}