// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";

contract Author is Context {
    address private _creator;
    string private _name;
    string private _description;

    constructor(string memory name, string memory description) {
        _creator = _msgSender();
        _name = name;
        _description = description;
    }

    modifier onlyCreator() {
        require(_msgSender() == _creator, "Author: Not the creator");
        _;
    }
}