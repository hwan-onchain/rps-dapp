# ✌️ Rock Paper Scissors dApp

> 커밋-리빌(Commit-Reveal) 패턴 기반 온체인 가위바위보  
> Solidity · Ethereum · L2(Base/Arbitrum)

---

## 🔥 프로젝트 소개

블록체인 특성상 모든 트랜잭션 데이터는 공개됩니다.  
일반 구현이라면 상대방이 내 선택을 먼저 보고 역선택하는 **치팅이 가능**합니다.

이 프로젝트는 **커밋-리빌 패턴**으로 이 문제를 해결합니다.

```
커밋 단계: keccak256(선택 + 랜덤_salt) → 해시만 온체인에 저장 (선택지 비공개)
리빌 단계: 실제 선택지 + salt 공개 → 해시 검증 후 승패 판정
```

---

## 🏗️ 게임 흐름

```
[Idle] → startGame() → [Committing] → 양쪽 commit() → [Revealing] → 양쪽 reveal() → [Finished]
                                ↑ 타임아웃 시 forceReset() 호출 가능
```

---

## 📋 컨트랙트 주요 기능

| 함수 | 설명 | 권한 |
|---|---|---|
| `startGame(player2)` | 게임 시작, 상대방 지정 | 누구나 |
| `getHash(choice, salt)` | 커밋용 해시 계산 헬퍼 | 누구나 |
| `commit(bytes32)` | 해시 제출 (선택지 비공개) | 플레이어만 |
| `reveal(choice, salt)` | 선택지 공개 + 자동 승패 판정 | 플레이어만 |
| `forceReset()` | 타임아웃 시 게임 강제 종료 | 누구나 |
| `getGameState()` | 현재 게임 상태 조회 | 누구나 |
| `getStats(address)` | 플레이어 전적 조회 | 누구나 |
| `payout(winner, amount)` | 월간 우승자에게 ETH 지급 | Owner만 |
| `emergencyWithdraw()` | 비상 전액 출금 | Owner만 |
| `transferOwnership(addr)` | Owner 이전 | Owner만 |

---

## 🛡️ 보안 설계

- **커밋-리빌 패턴**: 상대방이 내 선택을 미리 알 수 없음
- **bytes32 salt**: 예측 불가능한 랜덤값으로 해시 브루트포스 방지
- **단계별 타임아웃**: `commitDeadline` / `revealDeadline` 분리로 게임 교착 방지
- **CEI 패턴**: Checks → Effects(emit) → Interactions(.call) 순서 준수
- **참가비 없음**: 도박성 이슈 원천 차단, owner가 직접 상금 지급

---

## 🚀 배포 현황

- [ ] Sepolia 테스트넷
- [ ] Base (L2) 메인넷
- [ ] Arbitrum (L2) 메인넷

---

## 🗂️ 프로젝트 구조

```
rps-dapp/
├── contracts/
│   └── RockPaperScissors.sol    # 메인 컨트랙트
├── frontend/                     # 프론트엔드 (예정)
├── scripts/                      # 배포 스크립트 (예정)
├── test/                         # 테스트 (예정)
├── .gitignore
└── README.md
```

---

## 📚 기술 스택

- **Smart Contract**: Solidity ^0.8.20
- **Frontend**: React + ethers.js (예정)
- **Mobile**: Expo (React Native) 포팅 예정
- **Network**: Ethereum Sepolia → L2 (Base/Arbitrum)

---

## 👨‍💻 개발자

호서대학교 디지털기술경영학과  
블록체인 전문가 취업 준비 중 🎯
