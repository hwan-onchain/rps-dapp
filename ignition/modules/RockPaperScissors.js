const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("RockPaperScissors", (m) => {
  const rps = m.contract("RockPaperScissors");
  return { rps };
});