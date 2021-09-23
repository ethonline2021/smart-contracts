// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";

contract User is Context {
    // -----------------------------------------
    // Events
    // -----------------------------------------
    event UserCreated(
        address user,
        address creator,
        string name,
        string description
    );
    event UserUpdated(string name, string description);
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
            "User: Creator Address can't be 0x"
        );
        _creator = creator;
        _name = name;
        _description = description;

        emit UserCreated(address(this), creator, name, description);
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
        emit UserUpdated(name, description);
    }

    // -----------------------------------------
    // Modifiers
    // -----------------------------------------
    modifier onlyCreator() {
        require(_msgSender() == _creator, "User: Not the creator");
        _;
    }
}