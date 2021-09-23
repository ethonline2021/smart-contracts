// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./User.sol";

contract Main is Context, Ownable {
    // -----------------------------------------
    // Events
    // -----------------------------------------
    event UserDeployed(
        address userAddress,
        string name,
        string description
    );

    // -----------------------------------------
    // Storage
    // -----------------------------------------

    // -----------------------------------------
    // Constructor
    // -----------------------------------------
    constructor() {}

    // -----------------------------------------
    // Logic
    // -----------------------------------------
    function deployUser(string memory name, string memory description)
        external
    {
        User user = new User(_msgSender(), name, description);
        emit UserDeployed(address(user), name, description);
    }
}
