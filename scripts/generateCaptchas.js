// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const path = require("path")
const fs = require("fs")
const Captcha = require("../libs/captcha-generator")
const piexif = require("piexifjs")
const base64ImageToFile = require('base64image-to-file')

const { randomBytes } = require("crypto")
const { bytesToHex } = require("@noble/hashes/utils")
const { utils, Wallet } = ethers
const { getMessage } = require("eip-712")

function asyncBase64ImageToFile(base64String, dirPath, imgName) {
  return new Promise((resolve, reject) => {
    base64ImageToFile(base64String, dirPath, imgName, function (err) {
      if (err) {
        console.log(err)
        reject()
      }
      resolve()
    });
  })
}

async function main() {

  const accounts = await ethers.getSigners()
  const contractOwner = accounts[0]

  let address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  let captchain = new ethers.Contract(address, [
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_salt",
          "type": "bytes32"
        }
      ],
      "name": "setSalt",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ], contractOwner)

  const salt = "0x0000000000000000000000000000000000000000000000000000000000000001"
  await captchain.setSalt(salt)

  const privateKey = Buffer.from("0P8PhAyjmZrzpKuu4GpDBetWiyXq5fUejz9jiWovsUY=", 'base64') // randomBytes(32);
  const signingKey = new utils.SigningKey(privateKey);

  for (let i = 0; i < 10; i++) {

    let captcha = new Captcha();
    const jpegData = captcha.dataURL
    let solution = parseInt(captcha.value).toString(16)
    if (solution.length % 2 != 0) {
      solution = '0' + solution
    }
    solution = "0x" + solution
    console.log(i, captcha.value, solution)

    // The typed data to sign
    // prettier-ignore
    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        Captcha: [
          { name: 'solution', type: 'bytes32' },
          { name: 'duration', type: 'uint256' }
        ]
      },
      primaryType: 'Captcha',
      domain: {
        name: 'Captcha',
        version: '1',
        chainId: 1,
        verifyingContract: address
      },
      message: {
        solution: ethers.utils.solidityKeccak256(["bytes", "bytes32"], [solution, salt]),
        duration: 10
      }
    };

    // Get a signable message from the typed data
    const message = getMessage(typedData, true);

    // Sign the message with the private key
    const { r, s, v } = signingKey.signDigest(message);

    const userComment = {
      message: typedData.message,
      messageHex: bytesToHex(message),
      signature: { r, s, v },
    }

    //    console.log(userComment)

    const exifIfd = {}

    exifIfd[piexif.ExifIFD.UserComment] = JSON.stringify(userComment);

    const exifObj = { "Exif": exifIfd };
    const exifBytes = piexif.dump(exifObj);

    const exifModified = piexif.insert(exifBytes, jpegData);

    await asyncBase64ImageToFile(exifModified, './www/captchas', `${i}`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
