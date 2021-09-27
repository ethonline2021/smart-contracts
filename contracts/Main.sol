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
    mapping (address => address) public deployedUsers;  // user address => deployed user contract address

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
        deployedUsers[_msgSender()] = address(user);
        emit UserDeployed(address(user), name, description);
    }

    function getDeployedUser(address user) public view returns(address){
        return deployedUsers[user];
    }
}
