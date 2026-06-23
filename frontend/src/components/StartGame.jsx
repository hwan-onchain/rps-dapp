import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { isAddress } from 'viem'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import RPS from '../contracts/RPS.json'

export function StartGame() {
  const { address, isConnected } = useAccount()
  const [opponent, setOpponent] = useState('')

  const { writeContract, data: txHash, isPending, isError, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  const handleStart = () => {
    if (!isAddress(opponent)) {
      alert('올바른 이더리움 주소를 입력해주세요.')
      return
    }
    if (opponent.toLowerCase() === address.toLowerCase()) {
      alert('자기 자신과는 게임할 수 없어요.')
      return
    }
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RPS,
      functionName: 'startGame',
      args: [opponent],
    })
  }

  if (!isConnected) {
    return <p>지갑을 먼저 연결해주세요.</p>
  }

  const etherscanUrl = 'https://sepolia.etherscan.io/tx/' + txHash

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>게임 시작</h2>
      <p>상대방 지갑 주소를 입력하면 게임이 시작됩니다.</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <input
          type="text"
          placeholder="상대방 주소 (0x...)"
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          style={{
            width: '380px',
            padding: '0.6rem 1rem',
            fontSize: '0.95rem',
            border: '1px solid #ccc',
            borderRadius: '8px',
          }}
        />
        <button
          onClick={handleStart}
          disabled={isPending || isConfirming}
          style={{
            padding: '0.6rem 1.2rem',
            fontSize: '0.95rem',
            cursor: (isPending || isConfirming) ? 'not-allowed' : 'pointer',
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
          }}
        >
          시작
        </button>
      </div>

      {isPending && <p>🦊 MetaMask에서 서명해주세요...</p>}
      {isConfirming && <p>⏳ 블록 확인 기다리는 중...</p>}
      {isConfirmed && (
        <div style={{ color: 'green', marginTop: '1rem' }}>
          <p>✅ 게임 시작됨! 이제 양쪽 다 commit 하면 돼요.</p>
          <a href={etherscanUrl} target="_blank" rel="noreferrer">
            Etherscan에서 확인
          </a>
        </div>
      )}
      {isError && (
        <p style={{ color: 'red' }}>
          에러: {error?.shortMessage || error?.message}
        </p>
      )}
    </div>
  )
}