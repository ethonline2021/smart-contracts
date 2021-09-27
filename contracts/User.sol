// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./Item.sol";

contract User is Context {
    using EnumerableSet for EnumerableSet.AddressSet;

    // -----------------------------------------
    // Events
    // -----------------------------------------
    event UserCreated(
        address user,
        address owner,
        string name,
        string description
    );
    event UserUpdated(string name, string description);
    event ItemDeployed(
        address itemAddress,
        string title,
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
    string private _name;
    string private _description;
    EnumerableSet.AddressSet private _deployedItems;

    // -----------------------------------------
    // Constructor
    // -----------------------------------------
    constructor(
        address owner,
        string memory name,
        string memory description
    ) {
        require(
            address(owner) != address(0),
            "User: Owner Address can't be 0x"
        );
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
        emit UserUpdated(name, description);
    }

    function deployItem(string memory title, string memory description, uint256 price, address token, uint256 amount, uint256 endPaymentDate)
        external
        onlyOwner
    {
        Item item = new Item(_owner, title, description, price, token, amount, endPaymentDate);
        _deployedItems.add(address(item));
        emit ItemDeployed(address(item), title, description, price, token, amount, endPaymentDate);
    }

    // -----------------------------------------
    // Modifiers
    // -----------------------------------------

    modifier onlyOwner() {
        require(_msgSender() == _owner, "User: Not the owner");
        _;
    }
}