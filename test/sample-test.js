const { expect } = require("chai");
const { ethers } = require("hardhat");
const path = require("path")
const fs = require("fs")
const Captcha = require("../libs/captcha-generator")
const piexif = require("piexifjs")
const base64ImageToFile = require('base64image-to-file')

const { randomBytes } = require("crypto")
const { bytesToHex } = require("@noble/hashes/utils")
const { utils, Wallet } = ethers
const { getMessage } = require("eip-712")

describe("Captchain", function () {
  it("Should deploy captchain and test a captcha verification", async function () {

    const accounts = await ethers.getSigners()
    const contractOwner = accounts[0]

    // Generate a< random private key
    const privateKey = Buffer.from("0P8PhAyjmZrzpKuu4GpDBetWiyXq5fUejz9jiWovsUY=", 'base64') // randomBytes(32);
    const signingKey = new utils.SigningKey(privateKey);

    var wallet = new Wallet(privateKey);

    const salt = "0x0000000000000000000000000000000000000000000000000000000000000001"
    
    const Captchain = await ethers.getContractFactory("Captchain");
    const captchain = await Captchain.deploy(wallet.address, salt);
    await captchain.deployed();

    let captcha = new Captcha();
    const jpegData = captcha.dataURL
    const solution = "0x"+captcha.value.toString(16)

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
        verifyingContract: captchain.address
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
    
    base64ImageToFile(exifModified, './', 'image', function (err) {
      if (err) {
        return console.error(err);
      }
    
    });

    const captchaVerifyTx = await captchain.captchaVerify(solution, typedData.message, v, r, s);

    // wait until the transaction is mined
    await captchaVerifyTx.wait();

    expect((await captchain.isVerified(contractOwner.address))[0]).to.be.true;

    const SafeContract = await ethers.getContractFactory("SafeContract");
    const safeContract = await SafeContract.deploy(captchain.address);
    await safeContract.deployed();

    await safeContract.increment();



  });
});
