const path = require("path")
const fs = require("fs")
const Captcha = require("@haileybot/captcha-generator")
const piexif = require("piexifjs")
const base64ImageToFile = require('base64image-to-file')

const { randomBytes } = require("crypto")
const { bytesToHex } = require("@noble/hashes/utils")
const { utils, Wallet } = require("ethers")
const { getMessage } = require("eip-712")

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
		verifyingContract: '0x7EF2e0048f5bAeDe046f6BF797943daF4ED8CB47'
	},
	message: {
		solution: "0x04994f67dc55b09e814ab7ffc8df3686b4afb2bb53e60eae97ef043fe03fb829",
		duration: 10
	}
};

// Generate a random private key
const privateKey = Buffer.from("0P8PhAyjmZrzpKuu4GpDBetWiyXq5fUejz9jiWovsUY=", 'base64') // randomBytes(32);
const signingKey = new utils.SigningKey(privateKey);

var wallet = new Wallet(privateKey);
console.log("Address: " + wallet.address);

// Get a signable message from the typed data
const message = getMessage(typedData, true);

// Sign the message with the private key
const { r, s, v } = signingKey.signDigest(message);

const userComment = {
	message: typedData.message,
	messageHex: bytesToHex(message),
	signature: { r, s, v },
}

console.log(userComment)

let captcha = new Captcha();
const jpegData = captcha.dataURL
const solution = captcha.value

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
