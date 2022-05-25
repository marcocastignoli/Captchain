// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const { utils, Wallet } = ethers

async function main() {
  const SafeContract = await ethers.getContractFactory("SafeContract");
  const safeContract = await SafeContract.deploy('0x5FbDB2315678afecb367f032d93F642f64180aa3');
  await safeContract.deployed();

  console.log(await safeContract.increment())
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
