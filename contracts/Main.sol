// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./Author.sol";

contract Main is Context, Ownable{
    // -----------------------------------------
    // Events
    // -----------------------------------------
    event AuthorDeployed(address authorAddress, string name, string description);

    // -----------------------------------------
    // Storage
    // -----------------------------------------
 
    // -----------------------------------------
    // Constructor
    // -----------------------------------------
    constructor() {
    }

    // -----------------------------------------
    // Logic
    // -----------------------------------------
    function deployAuthor(string memory name, string memory description) external {
        Author author = new Author(_msgSender(), name, description);
        emit AuthorDeployed(address(author), name, description);
    }
}