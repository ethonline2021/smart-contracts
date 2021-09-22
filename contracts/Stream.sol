// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";

contract Stream is Context {
    // -----------------------------------------
    // Events
    // -----------------------------------------
    event StreamCreated(
        address stream,
        address creator,
        string title,
        string description,
        address entryToken,
        uint256 entryAmount
    );

    // -----------------------------------------
    // Storage
    // -----------------------------------------
    address private _creator;
    string private _title;
    string private _description;
    address private _entryToken;
    uint256 private _entryAmount;

    // -----------------------------------------
    // Constructor
    // -----------------------------------------
    constructor(
        address creator,
        string memory title,
        string memory description,
        address entryToken,
        uint256 entryAmount
    ) {
        require(
            address(creator) != address(0),
            "Stream: Creator can't be 0x"
        );
        require(
            address(entryToken) != address(0),
            "Stream: EntryToken can't be 0x"
        );
        require(entryAmount > 0, "Stream: EntryAmount can't be 0");

        _creator = creator;
        _title = title;
        _description = description;
        _entryToken = entryToken;
        _entryAmount = entryAmount;

        emit StreamCreated(
            address(this),
            creator,
            title,
            description,
            entryToken,
            entryAmount
        );
    }

    // -----------------------------------------
    // Logic
    // -----------------------------------------

    // -----------------------------------------
    // Modifiers
    // -----------------------------------------
    modifier onlyCreator() {
        require(_msgSender() == _creator, "Stream: Not the creator");
        _;
    }
}
