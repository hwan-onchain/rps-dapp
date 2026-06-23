const hre = require("hardhat");

async function main() {
  console.log("배포 시작...");

  const RockPaperScissors = await hre.ethers.getContractFactory("RockPaperScissors");
  const contract = await RockPaperScissors.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ 배포 완료!");
  console.log("컨트랙트 주소:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
