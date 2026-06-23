// ================================================================
//  RockPaperScissors.sol — Hardhat 테스트 파일
//  실행: npx hardhat test
// ================================================================

const { ethers } = require("hardhat");
const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// ── Solidity enum 과 똑같이 숫자로 매핑 ──────────────────────────
const Choice = { None: 0, Rock: 1, Paper: 2, Scissors: 3 };
const GameState = { Idle: 0, Committing: 1, Revealing: 2, Finished: 3 };
const Result = { None: 0, Player1Win: 1, Player2Win: 2, Draw: 3 };

const FIVE_MINUTES = 5 * 60; // 300초 (컨트랙트 TIMEOUT)

// ── 커밋 해시 생성 헬퍼 (getHash() 와 동일한 로직) ───────────────
//    Solidity: keccak256(abi.encodePacked(choice, salt))
function makeCommitment(choice, salt) {
  return ethers.solidityPackedKeccak256(["uint8", "bytes32"], [choice, salt]);
}

// ================================================================
describe("RockPaperScissors", function () {

  // 각 테스트마다 freshly deploy (beforeEach)
  let rps;
  let owner, player1, player2, stranger;

  beforeEach(async function () {
    // Hardhat 기본 제공 테스트 지갑 4개 꺼내기
    [owner, player1, player2, stranger] = await ethers.getSigners();

    const RPS = await ethers.getContractFactory("RockPaperScissors");
    rps = await RPS.deploy();
    // deploy() 완료 = 컨트랙트가 블록에 올라간 것
  });

  // ==============================================================
  //  1. startGame
  // ==============================================================
  describe("1. startGame", function () {

    it("게임 정상 시작 → 상태 Committing, 이벤트 GameStarted", async function () {
      await expect(
        rps.connect(player1).startGame(player2.address)
      )
        .to.emit(rps, "GameStarted")
        .withArgs(player1.address, player2.address, anyValue); // commitDeadline은 정확한 값 몰라도 됨

      const gs = await rps.getGameState();
      expect(gs.player1).to.equal(player1.address);
      expect(gs.player2).to.equal(player2.address);
      expect(gs.state).to.equal(GameState.Committing);
    });

    it("자기 자신을 상대로 게임 불가", async function () {
      await expect(
        rps.connect(player1).startGame(player1.address)
      ).to.be.revertedWith("Can't play against yourself");
    });

    it("address(0) 을 상대로 게임 불가", async function () {
      await expect(
        rps.connect(player1).startGame(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid player2 address");
    });

    it("이미 진행 중인 게임이 있으면 새 게임 불가", async function () {
      await rps.connect(player1).startGame(player2.address); // 첫 게임 시작

      await expect(
        rps.connect(stranger).startGame(player2.address)    // 두 번째 시도 → 실패
      ).to.be.revertedWith("Game already in progress");
    });

    it("게임 Finished 후 새 게임 시작 가능", async function () {
      // 게임 하나 끝까지 진행
      await rps.connect(player1).startGame(player2.address);
      const salt1 = ethers.hexlify(ethers.randomBytes(32));
      const salt2 = ethers.hexlify(ethers.randomBytes(32));
      await rps.connect(player1).commit(makeCommitment(Choice.Rock, salt1));
      await rps.connect(player2).commit(makeCommitment(Choice.Scissors, salt2));
      await rps.connect(player1).reveal(Choice.Rock, salt1);
      await rps.connect(player2).reveal(Choice.Scissors, salt2);

      // Finished 상태 → 새 게임 가능해야 함
      await expect(
        rps.connect(player1).startGame(player2.address)
      ).to.emit(rps, "GameStarted");
    });
  });

  // ==============================================================
  //  2. commit
  // ==============================================================
  describe("2. commit", function () {
    let salt1, salt2;

    beforeEach(async function () {
      await rps.connect(player1).startGame(player2.address);
      salt1 = ethers.hexlify(ethers.randomBytes(32));
      salt2 = ethers.hexlify(ethers.randomBytes(32));
    });

    it("player1 커밋 성공 → p1Committed=true, 이벤트 PlayerCommitted", async function () {
      await expect(
        rps.connect(player1).commit(makeCommitment(Choice.Rock, salt1))
      )
        .to.emit(rps, "PlayerCommitted")
        .withArgs(player1.address);

      const gs = await rps.getGameState();
      expect(gs.p1Committed).to.be.true;
      expect(gs.p2Committed).to.be.false;
      expect(gs.state).to.equal(GameState.Committing); // 아직 혼자만 커밋
    });

    it("양쪽 커밋 완료 → 상태 Revealing, 이벤트 BothCommitted", async function () {
      await rps.connect(player1).commit(makeCommitment(Choice.Rock, salt1));
      await expect(
        rps.connect(player2).commit(makeCommitment(Choice.Scissors, salt2))
      ).to.emit(rps, "BothCommitted");

      const gs = await rps.getGameState();
      expect(gs.state).to.equal(GameState.Revealing);
    });

    it("게임에 없는 주소(stranger)는 커밋 불가", async function () {
      await expect(
        rps.connect(stranger).commit(makeCommitment(Choice.Rock, salt1))
      ).to.be.revertedWith("You are not a player in this game");
    });

    it("player1이 이미 커밋했으면 재커밋 불가", async function () {
      await rps.connect(player1).commit(makeCommitment(Choice.Rock, salt1));
      await expect(
        rps.connect(player1).commit(makeCommitment(Choice.Rock, salt1))
      ).to.be.revertedWith("Player1 already committed");
    });

    it("player2이 이미 커밋했으면 재커밋 불가", async function () {
      await rps.connect(player2).commit(makeCommitment(Choice.Scissors, salt2));
      await expect(
        rps.connect(player2).commit(makeCommitment(Choice.Scissors, salt2))
      ).to.be.revertedWith("Player2 already committed");
    });

    it("커밋 기한(5분) 초과 후 커밋 불가", async function () {
      await time.increase(FIVE_MINUTES + 1); // 5분 1초 경과
      await expect(
        rps.connect(player1).commit(makeCommitment(Choice.Rock, salt1))
      ).to.be.revertedWith("Commit deadline passed");
    });
  });

  // ==============================================================
  //  3. reveal & 승패 판정 (핵심!)
  // ==============================================================
  describe("3. reveal & 승패 판정", function () {
    let salt1, salt2;

    // 두 플레이어 커밋까지 진행하는 헬퍼
    async function commitBoth(choice1, choice2) {
      await rps.connect(player1).commit(makeCommitment(choice1, salt1));
      await rps.connect(player2).commit(makeCommitment(choice2, salt2));
    }

    beforeEach(async function () {
      await rps.connect(player1).startGame(player2.address);
      salt1 = ethers.hexlify(ethers.randomBytes(32));
      salt2 = ethers.hexlify(ethers.randomBytes(32));
    });

    // ── 승패 3가지 케이스 ──────────────────────────────────────
    it("Rock vs Scissors → player1 승리 + 통계 업데이트", async function () {
      await commitBoth(Choice.Rock, Choice.Scissors);
      await rps.connect(player1).reveal(Choice.Rock, salt1);

      await expect(
        rps.connect(player2).reveal(Choice.Scissors, salt2)
      )
        .to.emit(rps, "GameFinished")
        .withArgs(Result.Player1Win, player1.address);

      // 통계 확인
      const p1Stats = await rps.getStats(player1.address);
      const p2Stats = await rps.getStats(player2.address);
      expect(p1Stats.wins).to.equal(1n);
      expect(p1Stats.losses).to.equal(0n);
      expect(p2Stats.wins).to.equal(0n);
      expect(p2Stats.losses).to.equal(1n);
      expect(p1Stats.totalGames).to.equal(1n);
    });

    it("Scissors vs Paper → player1 승리", async function () {
      await commitBoth(Choice.Scissors, Choice.Paper);
      await rps.connect(player1).reveal(Choice.Scissors, salt1);
      await rps.connect(player2).reveal(Choice.Paper, salt2);

      const gs = await rps.getGameState();
      expect(gs.result).to.equal(Result.Player1Win);
    });

    it("Paper vs Rock → player1 승리", async function () {
      await commitBoth(Choice.Paper, Choice.Rock);
      await rps.connect(player1).reveal(Choice.Paper, salt1);
      await rps.connect(player2).reveal(Choice.Rock, salt2);

      const gs = await rps.getGameState();
      expect(gs.result).to.equal(Result.Player1Win);
    });

    it("Scissors vs Rock → player2 승리", async function () {
      await commitBoth(Choice.Scissors, Choice.Rock);
      await rps.connect(player1).reveal(Choice.Scissors, salt1);
      await rps.connect(player2).reveal(Choice.Rock, salt2);

      const gs = await rps.getGameState();
      expect(gs.result).to.equal(Result.Player2Win);
    });

    it("Rock vs Paper → player2 승리", async function () {
      await commitBoth(Choice.Rock, Choice.Paper);
      await rps.connect(player1).reveal(Choice.Rock, salt1);
      await rps.connect(player2).reveal(Choice.Paper, salt2);

      const gs = await rps.getGameState();
      expect(gs.result).to.equal(Result.Player2Win);
    });

    it("Paper vs Scissors → player2 승리", async function () {
      await commitBoth(Choice.Paper, Choice.Scissors);
      await rps.connect(player1).reveal(Choice.Paper, salt1);
      await rps.connect(player2).reveal(Choice.Scissors, salt2);

      const gs = await rps.getGameState();
      expect(gs.result).to.equal(Result.Player2Win);
    });

    it("Rock vs Rock → 무승부 (address(0) 이벤트)", async function () {
      await commitBoth(Choice.Rock, Choice.Rock);
      await rps.connect(player1).reveal(Choice.Rock, salt1);

      await expect(
        rps.connect(player2).reveal(Choice.Rock, salt2)
      )
        .to.emit(rps, "GameFinished")
        .withArgs(Result.Draw, ethers.ZeroAddress); // 무승부 = winner 없음

      const p1Stats = await rps.getStats(player1.address);
      expect(p1Stats.draws).to.equal(1n);
    });

    // ── 보안 핵심: 해시 조작 방어 ────────────────────────────────
    it("✅ 보안: 커밋 후 선택지 바꾸려 하면 해시 불일치로 revert", async function () {
      // Rock 으로 커밋했지만 reveal 에서 Paper 로 바꾸려 시도
      await commitBoth(Choice.Rock, Choice.Scissors);

      await expect(
        rps.connect(player1).reveal(Choice.Paper, salt1) // Paper ≠ Rock → 해시 불일치!
      ).to.be.revertedWith("Hash mismatch: wrong choice or salt");
    });

    it("✅ 보안: salt 를 바꿔서 reveal 하면 해시 불일치로 revert", async function () {
      await commitBoth(Choice.Rock, Choice.Scissors);
      const wrongSalt = ethers.hexlify(ethers.randomBytes(32)); // 다른 salt

      await expect(
        rps.connect(player1).reveal(Choice.Rock, wrongSalt)
      ).to.be.revertedWith("Hash mismatch: wrong choice or salt");
    });

    it("Choice.None 으로 reveal 불가", async function () {
      await commitBoth(Choice.Rock, Choice.Scissors);
      await expect(
        rps.connect(player1).reveal(Choice.None, salt1)
      ).to.be.revertedWith("Choice cannot be None");
    });

    it("이미 리빌한 플레이어 재리빌 불가", async function () {
      await commitBoth(Choice.Rock, Choice.Scissors);
      await rps.connect(player1).reveal(Choice.Rock, salt1);

      await expect(
        rps.connect(player1).reveal(Choice.Rock, salt1)
      ).to.be.revertedWith("Player1 already revealed");
    });

    it("리빌 기한(5분) 초과 후 reveal 불가", async function () {
      await commitBoth(Choice.Rock, Choice.Scissors);
      await time.increase(FIVE_MINUTES + 1);

      await expect(
        rps.connect(player1).reveal(Choice.Rock, salt1)
      ).to.be.revertedWith("Reveal deadline passed");
    });

    it("게임에 없는 주소는 reveal 불가", async function () {
      await commitBoth(Choice.Rock, Choice.Scissors);
      await expect(
        rps.connect(stranger).reveal(Choice.Rock, salt1)
      ).to.be.revertedWith("You are not a player in this game");
    });
  });

  // ==============================================================
  //  4. forceReset (타임아웃 처리)
  // ==============================================================
  describe("4. forceReset", function () {
    let salt1, salt2;

    beforeEach(async function () {
      await rps.connect(player1).startGame(player2.address);
      salt1 = ethers.hexlify(ethers.randomBytes(32));
      salt2 = ethers.hexlify(ethers.randomBytes(32));
    });

    it("커밋 기한 초과 → 누구나 forceReset 가능, 이벤트 'Commit timeout'", async function () {
      await time.increase(FIVE_MINUTES + 1); // 아직 아무도 커밋 안 함

      await expect(
        rps.connect(stranger).forceReset() // stranger 도 OK
      )
        .to.emit(rps, "GameForceReset")
        .withArgs(stranger.address, "Commit timeout");

      const gs = await rps.getGameState();
      expect(gs.state).to.equal(GameState.Finished);
    });

    it("리빌 기한 초과 → forceReset 가능, 이벤트 'Reveal timeout'", async function () {
      await rps.connect(player1).commit(makeCommitment(Choice.Rock, salt1));
      await rps.connect(player2).commit(makeCommitment(Choice.Scissors, salt2));

      await time.increase(FIVE_MINUTES + 1); // 리빌 안 하고 시간 초과

      await expect(
        rps.connect(stranger).forceReset()
      )
        .to.emit(rps, "GameForceReset")
        .withArgs(stranger.address, "Reveal timeout");
    });

    it("기한 안 지났는데 forceReset 불가", async function () {
      await expect(
        rps.connect(stranger).forceReset()
      ).to.be.revertedWith("Game has not expired yet");
    });

    it("게임이 Idle 상태면 forceReset 불가 (gameActive modifier)", async function () {
      // 아무 게임도 안 만든 상태
      const freshRPS = await (await ethers.getContractFactory("RockPaperScissors")).deploy();

      await expect(
        freshRPS.connect(stranger).forceReset()
      ).to.be.revertedWith("No active game");
    });
  });

  // ==============================================================
  //  5. emergencyWithdraw (onlyOwner)
  // ==============================================================
  describe("5. emergencyWithdraw", function () {
    it("owner 가 컨트랙트 ETH 전액 출금 성공", async function () {
      // 컨트랙트에 1 ETH 충전 (receive() fallback 이용)
      await owner.sendTransaction({
        to: await rps.getAddress(),
        value: ethers.parseEther("1"),
      });

      const ownerBefore = await ethers.provider.getBalance(owner.address);
      const tx = await rps.connect(owner).emergencyWithdraw();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const ownerAfter = await ethers.provider.getBalance(owner.address);

      // 출금 후 잔액 = 이전 잔액 + 1 ETH - 가스비
      expect(ownerAfter).to.equal(ownerBefore + ethers.parseEther("1") - gasCost);
    });

    it("컨트랙트 잔액 0 이면 revert", async function () {
      await expect(
        rps.connect(owner).emergencyWithdraw()
      ).to.be.revertedWith("Nothing to withdraw");
    });

    it("✅ 보안: owner 아닌 사람은 emergencyWithdraw 불가", async function () {
      await owner.sendTransaction({
        to: await rps.getAddress(),
        value: ethers.parseEther("1"),
      });

      await expect(
        rps.connect(player1).emergencyWithdraw()
      ).to.be.revertedWith("onlyOwner: caller is not the owner");
    });
  });

  // ==============================================================
  //  6. transferOwnership (onlyOwner)
  // ==============================================================
  describe("6. transferOwnership", function () {
    it("owner 를 새 주소로 이전 성공, OwnershipTransferred 이벤트", async function () {
      await expect(
        rps.connect(owner).transferOwnership(player1.address)
      )
        .to.emit(rps, "OwnershipTransferred")
        .withArgs(owner.address, player1.address);

      expect(await rps.owner()).to.equal(player1.address);
    });

    it("이전 후 새 owner 가 onlyOwner 함수 사용 가능", async function () {
      await rps.connect(owner).transferOwnership(player1.address);

      // 새 owner(player1) 가 emergencyWithdraw 호출 가능 여부 확인
      await player1.sendTransaction({
        to: await rps.getAddress(),
        value: ethers.parseEther("0.1"),
      });
      await expect(
        rps.connect(player1).emergencyWithdraw()
      ).not.to.be.reverted;
    });

    it("이전 후 이전 owner 는 onlyOwner 함수 사용 불가", async function () {
      await rps.connect(owner).transferOwnership(player1.address);

      await player1.sendTransaction({
        to: await rps.getAddress(),
        value: ethers.parseEther("0.1"),
      });
      await expect(
        rps.connect(owner).emergencyWithdraw() // 이전 owner → 실패해야 함
      ).to.be.revertedWith("onlyOwner: caller is not the owner");
    });

    it("address(0) 으로 이전 불가", async function () {
      await expect(
        rps.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("New owner is zero address");
    });

    it("✅ 보안: owner 아닌 사람은 transferOwnership 불가", async function () {
      await expect(
        rps.connect(player1).transferOwnership(player1.address)
      ).to.be.revertedWith("onlyOwner: caller is not the owner");
    });
  });

  // ==============================================================
  //  7. payout (월간 우승자 상금 지급)
  // ==============================================================
  describe("7. payout", function () {
    beforeEach(async function () {
      // 컨트랙트에 2 ETH 충전
      await owner.sendTransaction({
        to: await rps.getAddress(),
        value: ethers.parseEther("2"),
      });
    });

    it("winner 에게 ETH 정상 지급, PrizePaid 이벤트", async function () {
      const amount = ethers.parseEther("0.5");
      const winnerBefore = await ethers.provider.getBalance(player1.address);

      await expect(
        rps.connect(owner).payout(player1.address, amount)
      )
        .to.emit(rps, "PrizePaid")
        .withArgs(player1.address, amount);

      const winnerAfter = await ethers.provider.getBalance(player1.address);
      expect(winnerAfter - winnerBefore).to.equal(amount);
    });

    it("컨트랙트 잔액 초과 지급 불가", async function () {
      await expect(
        rps.connect(owner).payout(player1.address, ethers.parseEther("10"))
      ).to.be.revertedWith("Insufficient contract balance");
    });

    it("amount = 0 이면 revert", async function () {
      await expect(
        rps.connect(owner).payout(player1.address, 0n)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("winner 가 address(0) 이면 revert", async function () {
      await expect(
        rps.connect(owner).payout(ethers.ZeroAddress, ethers.parseEther("0.1"))
      ).to.be.revertedWith("Invalid winner address");
    });

    it("✅ 보안: owner 아닌 사람은 payout 불가", async function () {
      await expect(
        rps.connect(player1).payout(player1.address, ethers.parseEther("0.1"))
      ).to.be.revertedWith("onlyOwner: caller is not the owner");
    });
  });

  // ==============================================================
  //  8. 통계 (getStats)
  // ==============================================================
  describe("8. 통계 (getStats)", function () {
    it("게임 전 통계는 모두 0", async function () {
      const stats = await rps.getStats(player1.address);
      expect(stats.wins).to.equal(0n);
      expect(stats.losses).to.equal(0n);
      expect(stats.draws).to.equal(0n);
      expect(stats.totalGames).to.equal(0n);
    });

    it("여러 게임 후 통계 누적 확인", async function () {
      // 게임 1: player1 승리
      const s1 = ethers.hexlify(ethers.randomBytes(32));
      const s2 = ethers.hexlify(ethers.randomBytes(32));
      await rps.connect(player1).startGame(player2.address);
      await rps.connect(player1).commit(makeCommitment(Choice.Rock, s1));
      await rps.connect(player2).commit(makeCommitment(Choice.Scissors, s2));
      await rps.connect(player1).reveal(Choice.Rock, s1);
      await rps.connect(player2).reveal(Choice.Scissors, s2);

      // 게임 2: 무승부
      const s3 = ethers.hexlify(ethers.randomBytes(32));
      const s4 = ethers.hexlify(ethers.randomBytes(32));
      await rps.connect(player1).startGame(player2.address);
      await rps.connect(player1).commit(makeCommitment(Choice.Paper, s3));
      await rps.connect(player2).commit(makeCommitment(Choice.Paper, s4));
      await rps.connect(player1).reveal(Choice.Paper, s3);
      await rps.connect(player2).reveal(Choice.Paper, s4);

      const stats = await rps.getStats(player1.address);
      expect(stats.wins).to.equal(1n);
      expect(stats.draws).to.equal(1n);
      expect(stats.losses).to.equal(0n);
      expect(stats.totalGames).to.equal(2n);
    });
  });

}); // end describe
