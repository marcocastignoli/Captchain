// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.14;

contract Captchain {
    
    struct EIP712Domain {
        string  name;
        string  version;
        uint256 chainId;
        address verifyingContract;
    }

    struct Captcha {
        bytes32 solution;
        uint256 duration;
    }

    bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 constant CAPTCHA_TYPEHASH = keccak256(
        "Captcha(bytes32 solution,uint256 duration)"
    );

    bytes32 DOMAIN_SEPARATOR;

    constructor () {
        DOMAIN_SEPARATOR = hash(EIP712Domain({
            name: "Captcha",
            version: '1',
            chainId: 1,
            verifyingContract: address(this)
        }));
    }

    function hash(EIP712Domain memory eip712Domain) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            EIP712DOMAIN_TYPEHASH,
            keccak256(bytes(eip712Domain.name)),
            keccak256(bytes(eip712Domain.version)),
            eip712Domain.chainId,
            eip712Domain.verifyingContract
        ));
    }

    function hash(Captcha memory captcha) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            CAPTCHA_TYPEHASH,
            captcha.solution,
            captcha.duration
        ));
    }

    function verify(Captcha memory captcha, uint8 v, bytes32 r, bytes32 s) internal view returns (bool) {
        // Note: we need to use `encodePacked` here instead of `encode`.
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            hash(captcha)
        ));
        return ecrecover(digest, v, r, s) == 0x31C8289C9A31cA84c1B1BB4e222795b6ce9bB07c;
    }

    mapping(address => uint256) verified;

    function captchaVerify(bytes calldata _response, Captcha calldata captcha, uint8 v, bytes32 r, bytes32 s) external returns (bool) {
        require(verify(captcha, v, r, s), "Captcha is not valid");
        require(captcha.solution == keccak256(_response), "Answer not valid");
        verified[msg.sender] = block.timestamp + captcha.duration;
        return true;
    }

    function isVerified(address _address) external view returns (bool){
        return block.timestamp <= verified[_address];
    }
    
}
