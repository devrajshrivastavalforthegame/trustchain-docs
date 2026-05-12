async function main() {

  const DocumentVerification =
    await ethers.getContractFactory(
      "DocumentVerification"
    );

  const contract =
    await DocumentVerification.deploy();

  await contract.deployed();

  console.log(
    "Contract deployed to:",
    contract.address
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });