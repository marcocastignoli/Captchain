
class Captchain extends EventTarget {
    constructor(url = '', address = '0x5FbDB2315678afecb367f032d93F642f64180aa3') {
        super()
        this.url = url
        this.address = address
        this.image = null
        this.metadata = null
        this.contract = null
        this.signer = null
        this.selector = null
        this.dom = null
        this.inputDom = null
        this.errors = {}
        this.errors.ERROR_UNKNOWN = 1
        this.errors.ERROR_ANSWER_NOT_VALID = 2
        this.errors.ERROR_CAPTCHA_ALREADY_USED = 3
        this.errors.ERROR_CAPTCHA_NOT_VALID = 4
    }
    async loadContract() {
        const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
        await provider.send("eth_requestAccounts", []);
        this.signer = provider.getSigner();

        this.contract = new ethers.Contract(this.address, [
            {
                "inputs": [
                    {
                        "internalType": "bytes",
                        "name": "_response",
                        "type": "bytes"
                    },
                    {
                        "components": [
                            {
                                "internalType": "bytes32",
                                "name": "solution",
                                "type": "bytes32"
                            },
                            {
                                "internalType": "uint256",
                                "name": "duration",
                                "type": "uint256"
                            }
                        ],
                        "internalType": "struct Captchain.Captcha",
                        "name": "captcha",
                        "type": "tuple"
                    },
                    {
                        "internalType": "uint8",
                        "name": "v",
                        "type": "uint8"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "r",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "s",
                        "type": "bytes32"
                    }
                ],
                "name": "captchaVerify",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "_address",
                        "type": "address"
                    }
                ],
                "name": "isVerified",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    },
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
        ], this.signer)
    }
    loadImage() {
        return new Promise(async (resolve) => {
            const captchaIndex = Math.floor(Math.random() * 10);
            let res = await fetch(`./captchas/${captchaIndex}.jpeg`)
            let blob = await res.blob()
            var reader = new FileReader();
            const self = this
            reader.onload = function () {
                var exifObj = piexif.load(this.result);
                const captchaRes = { image: this.result, metadata: JSON.parse(exifObj.Exif[piexif.ExifIFD.UserComment]) }
                self.image = captchaRes.image
                self.metadata = captchaRes.metadata
                resolve(captchaRes)
            };
            reader.readAsDataURL(blob);
        })
    }
    async load(selector) {
        await this.loadContract()
        await this.loadImage()
        this.render(selector)
    }
    render(selector) {
        this.selector = selector
        this.dom = document.querySelector(this.selector)

        let imageDom = new Image();
        imageDom.src = this.image;
        imageDom.width = 200;
        this.dom.append(imageDom)

        this.inputDom = document.createElement("input");
        this.dom.appendChild(this.inputDom)

        let buttonDom = document.createElement("button");
        buttonDom.innerText = 'Verify'
        buttonDom.addEventListener("click", async () => {
            await this.sendCaptcha()
        });
        this.dom.appendChild(buttonDom)
    }
    async sendCaptcha() {
        try {
            let solution = (parseInt(this.inputDom.value)).toString(16)
            if (solution.length % 2 != 0) {
                solution = '0' + solution
            }
            const captchaVerifyTx = await this.contract.captchaVerify('0x' + solution, this.metadata.message, this.metadata.signature.v, this.metadata.signature.r, this.metadata.signature.s);
            await captchaVerifyTx.wait()

            let signerAddress = await this.signer.getAddress()

            let isVerified = await this.contract.isVerified(signerAddress)
            if (isVerified) {
                this.dispatchEvent(new CustomEvent('onVerifyEnd', {
                    detail: { success: true }
                }))
                return true
            } else {
                this.handleError(e)
                return false
            }
        } catch (e) {
            this.handleError(e)
            return false
        }
    }
    async handleError(e) {
        let reason = this.errors.ERROR_UNKNOWN
        if (e.data.message.includes('Answer not valid')) {
            reason = this.errors.ERROR_ANSWER_NOT_VALID
        } else if (e.data.message.includes('Captcha already used')) {
            reason = this.errors.ERROR_CAPTCHA_ALREADY_USED
        } else if (e.data.message.includes('Captcha is not valid')) {
            reason = this.errors.ERROR_CAPTCHA_NOT_VALID
        }

        this.dispatchEvent(new CustomEvent('onVerifyEnd', {
            detail: { success: false, reason }
        }))

        if (reason === this.errors.ERROR_CAPTCHA_ALREADY_USED || reason === this.errors.ERROR_CAPTCHA_NOT_VALID) {
            this.destroy()
            await this.load(this.selector)
        }
    }
    destroy() {
        this.dom.innerHTML = ''
    }
}
