// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "./Stream.sol";

contract Author is Context {
    // -----------------------------------------
    // Events
    // -----------------------------------------
    event AuthorCreated(
        address author,
        address creator,
        string name,
        string description
    );
    event AuthorUpdated(string name, string description);
    event StreamDeployed(
        address streamAddress,
        string title,
        string description,
        address token,
        uint256 amount
    );

    // -----------------------------------------
    // Storage
    // -----------------------------------------
    address private _creator;
    string private _name;
    string private _description;

    // -----------------------------------------
    // Constructor
    // -----------------------------------------
    constructor(
        address creator,
        string memory name,
        string memory description
    ) {
        require(
            address(creator) != address(0),
            "Author: Creator Address can't be 0x"
        );
        _creator = creator;
        _name = name;
        _description = description;

        emit AuthorCreated(address(this), creator, name, description);
    }

    // -----------------------------------------
    // Logic
    // -----------------------------------------
    function update(string memory name, string memory description)
        external
        onlyCreator
    {
        _name = name;
        _description = description;
        emit AuthorUpdated(name, description);
    }

    function createStream(
        string memory title,
        string memory description,
        address entryToken,
        uint256 entryAmount
    ) external onlyCreator {
        Stream stream = new Stream(
            _creator,
            title,
            description,
            entryToken,
            entryAmount
        );
        emit StreamDeployed(
            address(stream),
            title,
            description,
            entryToken,
            entryAmount
        );
    }

    // -----------------------------------------
    // Modifiers
    // -----------------------------------------
    modifier onlyCreator() {
        require(_msgSender() == _creator, "Author: Not the creator");
        _;
    }
}