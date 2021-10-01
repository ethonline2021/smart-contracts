// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Item.sol";

contract ItemFactory {
    function deployItem(address main, address owner, string memory title, string memory description, uint256 price, address token, uint256 amount, uint256 endPaymentDate, string memory uri)
        external
        returns (Item)
    {
        return new Item(main, owner, title, description, price, token, amount, endPaymentDate, uri);
    }

}
