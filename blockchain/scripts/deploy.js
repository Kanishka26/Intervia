const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const registry = await hre.ethers.deployContract("ReportRegistry");
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  const net = await hre.ethers.provider.getNetwork();

  // The backend reads this file to find the contract.
  fs.writeFileSync(
    path.join(__dirname, "..", "deployment.json"),
    JSON.stringify({ address, chainId: Number(net.chainId) }, null, 2)
  );
  console.log("ReportRegistry deployed to", address);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});