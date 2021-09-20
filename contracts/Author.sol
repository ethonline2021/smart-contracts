// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";

contract Author is Context {
    // -----------------------------------------
    // Events
    // -----------------------------------------
    event AuthorUpdated(string name, string description);

    // -----------------------------------------
    // Storage
    // -----------------------------------------
    address private _creator;
    string private _name;
    string private _description;
 
    // -----------------------------------------
    // Constructor
    // -----------------------------------------
    constructor(address creator, string memory name, string memory description) {
        _creator = creator;
        _name = name;
        _description = description;
    }

    // -----------------------------------------
    // Logic
    // -----------------------------------------
    function update(string memory name, string memory description) external onlyCreator {
        _name = name;
        _description = description;
        emit AuthorUpdated(name, description);
    }

    // -----------------------------------------
    // Modifiers
    // -----------------------------------------
    modifier onlyCreator() {
        require(_msgSender() == _creator, "Author: Not the creator");
        _;
    }
}