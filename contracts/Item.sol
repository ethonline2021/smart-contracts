// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC1155/presets/ERC1155PresetMinterPauser.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract Item is Context, ERC1155PresetMinterPauser, ERC1155Holder {
    // -----------------------------------------
    // Events
    // -----------------------------------------
    event ItemCreated(
        address item,
        address owner,
        string title,
        string description,
        uint256 price, 
        address token, 
        uint256 amount, 
        uint256 endPaymentDate,
        string uri
    );

    event ItemUpdated(
        address item,
        address owner,
        string title,
        string description,
        uint256 price, 
        address token,  
        uint256 endPaymentDate,
        string uri
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
    string private _uri;

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
        uint256 endPaymentDate,
        string memory uri
    ) ERC1155PresetMinterPauser(uri) {
        require(address(owner) != address(0), "Item: Owner Address can't be 0x");
        require(price > 0, "Item: Price must be > 0");
        require(address(token) != address(0), "Item: Token Address can't be 0x");
        require(amount > 0, "Item: Amount must be > 0");
        require(endPaymentDate > 0, "Item: EndPaymentDate must be > 0");

        _owner = owner;
        _title = title;
        _description = description;
        _price = price;
        _token = token;
        _amount = amount;
        _endPaymentDate = endPaymentDate;
        _uri = uri;

        for (uint256 id=1; id<=amount; id++) {
            _mint(address(this), id, 1, "");
        }

        emit ItemCreated(address(this), owner, title, description, price, token, amount, endPaymentDate, uri);
    }

    // -----------------------------------------
    // Logic
    // -----------------------------------------

    function getDetails()
        external 
        view
        returns (
            address, 
            string memory, 
            string memory, 
            uint256, 
            address, 
            uint256, 
            uint256,
            string memory
        )
    {
        return(_owner, _title, _description, _price, _token, _amount, _endPaymentDate, _uri);
    }

    function update(
        string memory title, 
        string memory description, 
        uint256 price, 
        address token, 
        uint256 endPaymentDate,
        string memory uri)
        external
        onlyOwner
    {
        require(price > 0, "Item: Price must be > 0");
        require(address(token) != address(0), "Item: Token Address can't be 0x");
        require(endPaymentDate > 0, "Item: EndPaymentDate must be > 0");

        _title = title;
        _description = description;
        _price = price;
        _token = token;
        _endPaymentDate = endPaymentDate;
        _uri = uri;

        _setURI(_uri);

        emit ItemUpdated(address(this), _owner, title, description, price, token, endPaymentDate, uri);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155PresetMinterPauser, ERC1155Receiver)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // -----------------------------------------
    // Modifiers
    // -----------------------------------------

    modifier onlyOwner() {
        require(_msgSender() == _owner, "User: Not the owner");
        _;
    }
}