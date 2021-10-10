// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

import "./Main.sol";
import "./Item.sol";

contract ItemFactory is KeeperCompatibleInterface {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private _deployedItemsSet; 

    Main private _main;

    constructor(address main) {
        require(address(main) != address(0), "ItemFactory: Main can't be 0x");
        _main = Main(main);
    }

    function deployItem(address owner, string memory title, string memory description, uint256 price, address token, uint256 amount, uint256 endPaymentDate, string memory uri)
        external
        returns (Item item)
    {
        require(msg.sender == address(_main), "ItemFactory: Not called from main");

        item = new Item(address(_main), owner, title, description, price, token, amount, endPaymentDate, uri);
        _deployedItemsSet.add(address(item));
    }

    // -----------------------------------------
    // Chainlink Keeper
    // -----------------------------------------
    function checkUpkeep(bytes calldata /* checkData */) external override returns (bool upkeepNeeded, bytes memory performData) {
        address[] memory allItems = _deployedItemsSet.values();
        uint256 claimableCount = 0;

        for(uint256 i=0; i<allItems.length; i++){
            if(Item(allItems[i]).isClaimable()){
                claimableCount++;
            }
        }

        if(claimableCount > 0){ //Double the loop, max the fun
            address[] memory items = new address[](claimableCount);
            for(uint256 i=0; i<allItems.length; i++){
                if(Item(allItems[i]).isClaimable()){
                    items[i] = allItems[i];
                }
            }
            performData = abi.encode(items);
        }

        upkeepNeeded = (claimableCount > 0);
    }

    function performUpkeep(bytes calldata performData) external override {
        address[] memory decoded = abi.decode(performData, (address[]));
        Item(decoded[0]).claimAll();
    } 
}
