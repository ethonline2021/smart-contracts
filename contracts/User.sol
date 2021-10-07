// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./Main.sol";
import "./Item.sol";

contract User is Context {
    using EnumerableSet for EnumerableSet.AddressSet;

    // -----------------------------------------
    // Events
    // -----------------------------------------
    event UserCreated(
        address contractAddress,
        address owner,
        string name,
        string description
    );
    event UserUpdated(address contractAddress, string name, string description);

    // -----------------------------------------
    // Storage
    // -----------------------------------------
    address private _owner;
    Main private _main;
    string private _name;
    string private _description;

    // -----------------------------------------
    // Constructor
    // -----------------------------------------
    constructor(
        address owner,
        string memory name,
        string memory description
    ) {
        require(address(owner) != address(0), "User: Owner Address can't be 0x");
        _main = Main(_msgSender());
        _owner = owner;
        _name = name;
        _description = description;

        emit UserCreated(address(this), owner, name, description);
    }

    // -----------------------------------------
    // Logic
    // -----------------------------------------

    function getDetails()
        external 
        view
        returns (address, string memory, string memory)
    {
        return(_owner, _name, _description);
    }

    function update(string memory name, string memory description)
        external
        onlyOwner
    {
        _name = name;
        _description = description;
        emit UserUpdated(address(this), name, description);
    }

    // -----------------------------------------
    // Modifiers
    // -----------------------------------------

    modifier onlyOwner() {
        require(_msgSender() == _owner, "User: Not the owner");
        _;
    }
}