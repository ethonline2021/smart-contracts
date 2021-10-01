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
    event ItemDeployed(
        address itemAddress,
        address owner,
        string title,
        string description,
        uint256 price,
        address token,
        uint256 amount,
        uint256 endPaymentDate,
        string uri
    );

    // -----------------------------------------
    // Storage
    // -----------------------------------------
    address private _owner;
    Main private _main;
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

    function deployItem(string memory title, string memory description, uint256 price, address token, uint256 amount, uint256 endPaymentDate, string memory uri)
        external
        onlyOwner
    {
        Item item = Item(_main.deployItem(_owner, title, description, price, token, amount, endPaymentDate, uri));

        _deployedItems.add(address(item));

        (,string memory _title, string memory _itemDescription, uint256 _price, address _acceptedToken, uint256 _amount, uint256 _endPaymentDate, string memory _uri) = item.getDetails();
        emit ItemDeployed(address(item), address(_owner), _title, _itemDescription, _price, _acceptedToken, _amount, _endPaymentDate, _uri);
    }

    // -----------------------------------------
    // Modifiers
    // -----------------------------------------

    modifier onlyOwner() {
        require(_msgSender() == _owner, "User: Not the owner");
        _;
    }
}