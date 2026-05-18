const { ethers, network } = require("hardhat");

async function main() {
  const DocumentVerification = await ethers.getContractFactory("DocumentVerification");
  const contract = await DocumentVerification.deploy();
  await contract.deployed();

  console.log("TrustChain DocumentVerification deployed");
  console.log("Network:", network.name);
  console.log("Contract address:", contract.address);
  console.log("\nPut this in server/.env:");
  console.log(`CONTRACT_ADDRESS=${contract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
