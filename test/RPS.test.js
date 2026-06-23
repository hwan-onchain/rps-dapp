const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RockPaperScissors (vs System)", function () {
  let rps, owner, player1, player2;

  const Choice = { NONE: 0, ROCK: 1, PAPER: 2, SCISSORS: 3 };

  async function makeCommitment(choice, salt) {
    return ethers.keccak256(
      ethers.solidityPacked(["uint8", "bytes32"], [choice, salt])
    );
  }

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();
    const RPS = await ethers.getContractFactory("RockPaperScissors");
    rps = await RPS.deploy();
    await rps.waitForDeployment();
  });

  describe("배포", function () {
    it("owner가 배포자로 설정된다", async function () {
      expect(await rps.owner()).to.equal(owner.address);
    });
  });

  describe("commit()", function () {
    it("커밋이 성공하고 이벤트가 발생한다", async function () {
      const salt = ethers.randomBytes(32);
      const commitment = await makeCommitment(Choice.ROCK, salt);
      await expect(rps.connect(player1).commit(commitment))
        .to.emit(rps, "Committed")
        .withArgs(player1.address);
    });

    it("중복 커밋은 실패한다", async function () {
      const salt = ethers.randomBytes(32);
      const commitment = await makeCommitment(Choice.ROCK, salt);
      await rps.connect(player1).commit(commitment);
      await expect(rps.connect(player1).commit(commitment))
        .to.be.revertedWith("Already committed");
    });
  });

  describe("reveal()", function () {
    it("커밋 없이 reveal하면 실패한다", async function () {
      const salt = ethers.randomBytes(32);
      await expect(rps.connect(player1).reveal(Choice.ROCK, salt))
        .to.be.revertedWith("Not committed");
    });

    it("잘못된 salt로 reveal하면 실패한다", async function () {
      const salt = ethers.randomBytes(32);
      const commitment = await makeCommitment(Choice.ROCK, salt);
      await rps.connect(player1).commit(commitment);
      const wrongSalt = ethers.randomBytes(32);
      await expect(rps.connect(player1).reveal(Choice.ROCK, wrongSalt))
        .to.be.revertedWith("Hash mismatch");
    });

    it("NONE으로 reveal하면 실패한다", async function () {
      const salt = ethers.randomBytes(32);
      const commitment = await makeCommitment(Choice.NONE, salt);
      await rps.connect(player1).commit(commitment);
      await expect(rps.connect(player1).reveal(Choice.NONE, salt))
        .to.be.revertedWith("Invalid choice");
    });

    it("정상 reveal 후 totalGames가 1 증가한다", async function () {
      const salt = ethers.randomBytes(32);
      const commitment = await makeCommitment(Choice.ROCK, salt);
      await rps.connect(player1).commit(commitment);
      await rps.connect(player1).reveal(Choice.ROCK, salt);
      const stats = await rps.getStats(player1.address);
      expect(stats.totalGames).to.equal(1n);
      expect(stats.wins + stats.losses + stats.draws).to.equal(1n);
    });

    it("reveal 후 pendingGame이 삭제된다", async function () {
      const salt = ethers.randomBytes(32);
      const commitment = await makeCommitment(Choice.SCISSORS, salt);
      await rps.connect(player1).commit(commitment);
      await rps.connect(player1).reveal(Choice.SCISSORS, salt);
      const game = await rps.pendingGames(player1.address);
      expect(game.hasCommitted).to.equal(false);
    });

    it("3게임 연속 플레이 후 totalGames가 3이다", async function () {
      for (let i = 0; i < 3; i++) {
        const salt = ethers.randomBytes(32);
        const choice = (i % 3) + 1;
        const commitment = await makeCommitment(choice, salt);
        await rps.connect(player1).commit(commitment);
        await rps.connect(player1).reveal(choice, salt);
      }
      const stats = await rps.getStats(player1.address);
      expect(stats.totalGames).to.equal(3n);
    });

    it("두 플레이어가 동시에 게임할 수 있다", async function () {
      const salt1 = ethers.randomBytes(32);
      const salt2 = ethers.randomBytes(32);
      const c1 = await makeCommitment(Choice.ROCK, salt1);
      const c2 = await makeCommitment(Choice.PAPER, salt2);
      await rps.connect(player1).commit(c1);
      await rps.connect(player2).commit(c2);
      await rps.connect(player1).reveal(Choice.ROCK, salt1);
      await rps.connect(player2).reveal(Choice.PAPER, salt2);
      const stats1 = await rps.getStats(player1.address);
      const stats2 = await rps.getStats(player2.address);
      expect(stats1.totalGames).to.equal(1n);
      expect(stats2.totalGames).to.equal(1n);
    });
  });

  describe("getHash()", function () {
    it("온체인과 오프체인 해시가 일치한다", async function () {
      const salt = ethers.randomBytes(32);
      const onChain = await rps.getHash(Choice.ROCK, salt);
      const offChain = await makeCommitment(Choice.ROCK, salt);
      expect(onChain).to.equal(offChain);
    });
  });

  describe("cancelExpired()", function () {
    it("커밋 없이 cancel하면 실패한다", async function () {
      await expect(rps.connect(player1).cancelExpired())
        .to.be.revertedWith("No pending game");
    });

    it("만료 전 cancel은 실패한다", async function () {
      const salt = ethers.randomBytes(32);
      const commitment = await makeCommitment(Choice.ROCK, salt);
      await rps.connect(player1).commit(commitment);
      await expect(rps.connect(player1).cancelExpired())
        .to.be.revertedWith("Not expired");
    });

    it("1시간 후 cancel 성공한다", async function () {
      const salt = ethers.randomBytes(32);
      const commitment = await makeCommitment(Choice.ROCK, salt);
      await rps.connect(player1).commit(commitment);
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      await rps.connect(player1).cancelExpired();
      const game = await rps.pendingGames(player1.address);
      expect(game.hasCommitted).to.equal(false);
    });
  });

  describe("payout()", function () {
    it("owner만 payout 가능하다", async function () {
      await owner.sendTransaction({ to: await rps.getAddress(), value: ethers.parseEther("0.1") });
      await expect(
        rps.connect(player1).payout(player1.address, ethers.parseEther("0.01"))
      ).to.be.revertedWith("Not owner");
    });

    it("owner payout 성공 후 PrizePaid 이벤트 발생", async function () {
      await owner.sendTransaction({ to: await rps.getAddress(), value: ethers.parseEther("0.1") });
      await expect(
        rps.connect(owner).payout(player1.address, ethers.parseEther("0.01"))
      ).to.emit(rps, "PrizePaid");
    });

    it("잔액 초과 payout은 실패한다", async function () {
      await expect(
        rps.connect(owner).payout(player1.address, ethers.parseEther("1"))
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("emergencyWithdraw()", function () {
    it("owner만 호출 가능하다", async function () {
      await expect(rps.connect(player1).emergencyWithdraw())
        .to.be.revertedWith("Not owner");
    });

    it("owner 전액 출금 성공", async function () {
      await owner.sendTransaction({ to: await rps.getAddress(), value: ethers.parseEther("0.1") });
      await expect(rps.connect(owner).emergencyWithdraw()).to.not.be.reverted;
    });
  });

  describe("transferOwnership()", function () {
    it("owner만 호출 가능하다", async function () {
      await expect(
        rps.connect(player1).transferOwnership(player1.address)
      ).to.be.revertedWith("Not owner");
    });

    it("zero address로 이전 불가", async function () {
      await expect(
        rps.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Zero address");
    });

    it("ownership 이전 성공", async function () {
      await rps.connect(owner).transferOwnership(player1.address);
      expect(await rps.owner()).to.equal(player1.address);
    });
  });
});