# 가위바위보 dApp

솔리디티 입문 프로젝트. 커밋-리빌 패턴 공부하면서 만들었음.

## 어떻게 동작하냐면

그냥 바위/가위/보 고르면 끝. 내부적으론 이렇게 돌아감:

1. 선택한 무브를 해시로 변환해서 컨트랙트에 제출 (commit)
2. 나중에 실제 무브 + 솔트 공개 (reveal)
3. 컨트랙트가 시스템 무브 랜덤 생성 → 결과 확정

프론트러닝 방지용으로 커밋-리빌 씀. 해시만 먼저 올리면 남들이 내 무브 못 봄.

## 상금 구조

- 무료 플레이
- 매달 가장 많이 이긴 사람한테 만원 상당 ETH 직접 지급
- 참가비 안 받음 (도박 이슈)

## 기술 스택

- Solidity + Hardhat
- React + wagmi + viem
- 배포: Sepolia 테스트넷 → L2 (Base 또는 Arbitrum) 예정

## 컨트랙트

Sepolia: `0xBF5AFD8f9240E5c6695683f6240B24042243e573`  
[Etherscan에서 보기](https://sepolia.etherscan.io/address/0xBF5AFD8f9240E5c6695683f6240B24042243e573#code)

## 진행 상황

- [x] 컨트랙트 작성 + 보안 수정
- [x] Hardhat 테스트 22개
- [x] Sepolia 배포 + Etherscan 검증
- [x] 프론트엔드 (지갑 연결 + 게임 플로우)
- [ ] L2 배포
- [ ] 모바일 포팅 (Expo)