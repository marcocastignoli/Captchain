// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.14;

interface CaptchainContract {
    function isVerified(address _address) external view returns (bool);
}

contract SafeContract {

    CaptchainContract captchainContract = CaptchainContract(0xB8c77482e45F1F44dE1745F52C74426C631bDD52);
    
    modifier onlyCaptchainVerified() {
        require(captchainContract.isVerified(msg.sender), "User must be Captchain verified");
        _;
    }

    constructor (CaptchainContract _captchainContract) {
        captchainContract = _captchainContract;
    }


    uint256 counter = 0;

    function increment() onlyCaptchainVerified external {
        counter++;
    }
}
