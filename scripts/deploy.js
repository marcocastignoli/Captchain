// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const { utils, Wallet } = ethers

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  // Generate a< random private key
  const privateKey = Buffer.from("0P8PhAyjmZrzpKuu4GpDBetWiyXq5fUejz9jiWovsUY=", 'base64') // randomBytes(32);
  const signingKey = new utils.SigningKey(privateKey);

  var wallet = new Wallet(privateKey);

  const salt = "0x0000000000000000000000000000000000000000000000000000000000000001"

  const Captchain = await ethers.getContractFactory("Captchain");
  const captchain = await Captchain.deploy(wallet.address, salt);
  await captchain.deployed();

  console.log("Captchain deployed to:", captchain.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
