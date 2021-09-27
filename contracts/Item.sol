// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";

contract Item is Context {
    // -----------------------------------------
    // Events
    // -----------------------------------------
    event ItemCreated(
        address item,
        address owner,
        string name,
        string description,
        uint256 price, 
        address token, 
        uint256 amount, 
        uint256 endPaymentDate
    );

    // -----------------------------------------
    // Storage
    // -----------------------------------------
    address private _owner;
    string private _title;
    string private _description;
    uint256 private _price;
    address private _token;
    uint256 private _amount;
    uint256 private _endPaymentDate;

    // -----------------------------------------
    // Constructor
    // -----------------------------------------
    constructor(
        address owner,
        string memory title, 
        string memory description, 
        uint256 price, 
        address token, 
        uint256 amount, 
        uint256 endPaymentDate
    ) {
        require(
            address(owner) != address(0),
            "Item: Owner Address can't be 0x"
        );
        _owner = owner;
        _title = title;
        _description = description;
        _price = price;
        _token = token;
        _amount = amount;
        _endPaymentDate = endPaymentDate;

        emit ItemCreated(address(this), owner, title, description, price, token, amount, endPaymentDate);
    }

    // -----------------------------------------
    // Logic
    // -----------------------------------------

    // -----------------------------------------
    // Modifiers
    // -----------------------------------------

    modifier onlyOwner() {
        require(_msgSender() == _owner, "User: Not the owner");
        _;
    }
}