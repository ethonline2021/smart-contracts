// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import { SuperAppBase } from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperAppBase.sol";
import {
    ISuperfluid,
    ISuperToken,
    ISuperAgreement,
    SuperAppDefinitions,
    ISuperApp
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

import "./Main.sol";
import "./utils/Simple777Recipient.sol";

import "hardhat/console.sol";

contract Item is Context, ERC1155, Simple777Recipient, SuperAppBase, KeeperCompatibleInterface {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.UintSet;

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
        address owner,
        string title,
        string description
    );

    event StartedPurchasing(
        address buyer,
        bytes32 agreementId,
        int96 flowRate,
        uint256 endPaymentDate
    );

    event FinishedPurchasing(
        address buyer,
        uint256 nftId
    );

    event WithdrawnEth(address indexed recipient, uint256 amount);

    // Structs
    struct Data {
        string title;
        string description;
        uint256 price;
        ISuperToken acceptedToken;
        uint256 amount;
        uint256 endPaymentDate;
        string uri;
    }

    struct AgreementData {
        address userAddress;
        int96 flowRate;
        uint256 timestamp;
    }

    // -----------------------------------------
    // Storage
    // -----------------------------------------
    Main private _main;
    address private _owner;
    Data private _itemData;

    ISuperfluid private _sfHost; // host
    IConstantFlowAgreementV1 private _sfCfa; // the stored constant flow agreement class address

    EnumerableSet.AddressSet private _buyingUsersSet; 
    mapping (address => bytes32) private _buyingUsers; // user => agreementId
    EnumerableSet.Bytes32Set private _agreementsSet; 
    
    mapping (bytes32 => AgreementData) private _agreementsUsers; // agreementId => timestamp
    EnumerableSet.UintSet private _availableNftIds;
    EnumerableSet.UintSet private _reservedNftIds;

    // -----------------------------------------
    // Constructor
    // -----------------------------------------
    constructor(
        address main,
        address owner,
        string memory title, 
        string memory description, 
        uint256 price, 
        address token, 
        uint256 amount, 
        uint256 endPaymentDate,
        string memory uri
    ) 
        ERC1155(uri) 
        Simple777Recipient(address(token))
    {
        require(address(owner) != address(0), "Item: Owner Address can't be 0x");
        require(price > 0, "Item: Price must be > 0");
        require(address(token) != address(0), "Item: Token Address can't be 0x");
        require(amount > 0, "Item: Amount must be > 0");
        require(endPaymentDate > block.timestamp, "Item: EndPaymentDate must be in the future");

        _main = Main(main);
        _owner = owner;

        ERC20WithTokenInfo acceptedToken = ERC20WithTokenInfo(address(token));
        require(_main.isSuperToken(acceptedToken),"Item: SuperToken required");

        _itemData = Data(
            title,
            description,
            price,
            ISuperToken(address(token)),
            amount,
            endPaymentDate, 
            uri
        );

        for (uint256 id=1; id<=amount; id++) {
            _mint(address(this), id, 1, "");
            _availableNftIds.add(id);
        }

        (_sfHost,_sfCfa,,) = _main.superfluidConfig();

        emit ItemCreated(address(this), _owner, _itemData.title, _itemData.description, _itemData.price, address(_itemData.acceptedToken), _itemData.amount, _itemData.endPaymentDate, _itemData.uri);
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
        return(_owner, _itemData.title, _itemData.description, _itemData.price, address(_itemData.acceptedToken), _itemData.amount, _itemData.endPaymentDate, _itemData.uri);
    }

    function update(
        string memory title, 
        string memory description
    )
        external
        onlyOwner
    {
        _itemData.title = title;
        _itemData.description = description;

        emit ItemUpdated(_owner, _itemData.title, _itemData.description);
    }

    function claim(address userAddress) 
        public
    {
        require(_hasPaidEnough(userAddress), "Item: Not paid enough");
        require(_reservedNftIds.length() > 0, "Item: No items available");

        // Close the CFA
        _sfHost.callAgreement(
            _sfCfa,
            abi.encodeWithSelector(
                _sfCfa.deleteFlow.selector,
                _itemData.acceptedToken,
                userAddress,
                address(this),
                new bytes(0) // placeholder
            ),
            "0x"
        );

        _finishPurchase(_buyingUsers[userAddress]);
    }

    function requiredFlowRate() public view returns(int96) {
        return int96(int(_itemData.price / (_itemData.endPaymentDate - block.timestamp/1000*1000)));
    }

    function _hasPaidEnough(address userAddress) internal view returns (bool){
        require(_buyingUsersSet.contains(userAddress), "Item: Not buying user");
        return (totalPaid(userAddress) >= _itemData.price);
    }

    function totalPaid(address user)
        public view returns (uint256)
    {
        bytes32 agreementId = _buyingUsers[user];
        return (block.timestamp-_agreementsUsers[agreementId].timestamp) * uint256(int(_agreementsUsers[agreementId].flowRate));
    }

    function availableAmount()
        public view returns (uint256)
    {
        return _availableNftIds.length();
    }

    function withdrawEth(address payable _to) external onlyOwner {
        _to.transfer(address(this).balance);
        emit WithdrawnEth(_to, address(this).balance);
    }

    // -----------------------------------------
    // Superfluid Flows Logic
    // -----------------------------------------

    function _beforeBuy(bytes calldata ctx) 
        private view
        returns (bytes memory cbdata)
    {
        ISuperfluid.Context memory context = _sfHost.decodeCtx(ctx);
        require(!_buyingUsersSet.contains(context.msgSender), "Item: User already buying an Item");
        cbdata = abi.encode(context.msgSender);
    }

    function _startPurchase(
        bytes calldata ctx,
        address agreementClass,
        bytes32 agreementId,
        bytes calldata /*cbdata*/
    ) private returns (bytes memory newCtx) {
        require(_availableNftIds.length() > 0, "Item: No Items available");

        ISuperfluid.Context memory context = _sfHost.decodeCtx(ctx); // userData
        _buyingUsersSet.add(context.msgSender);
        _buyingUsers[context.msgSender] = agreementId;
        _agreementsSet.add(agreementId);

        uint256 id = _availableNftIds.at(0);
        _availableNftIds.remove(id);
        _reservedNftIds.add(id);

        (uint256 timestamp, int96 flowRate,,) = IConstantFlowAgreementV1(agreementClass).getFlowByID(_itemData.acceptedToken, agreementId);

        _agreementsUsers[agreementId] = AgreementData(context.msgSender, flowRate, timestamp);

        uint256 endPaymentDate = timestamp+(_itemData.price/uint256(int(flowRate)));
        emit StartedPurchasing(context.msgSender, agreementId, flowRate, endPaymentDate);
        
        return ctx;
    }

    function _finishPurchase(bytes32 agreementId) private {
        address userAddress = _agreementsUsers[agreementId].userAddress;

        if(!_hasPaidEnough(userAddress)){
            uint256 id = _reservedNftIds.at(0);
            _reservedNftIds.remove(id);
            _availableNftIds.add(id);
        }
        require(_hasPaidEnough(userAddress), "Item: Not enough paid");

        _buyingUsersSet.remove(userAddress);
        _buyingUsers[userAddress] = 0;
        _agreementsSet.remove(agreementId);
        _agreementsUsers[agreementId] = AgreementData(address(0), 0, 0);

        // Send the NFT
        uint256 nftId = _reservedNftIds.at(0);
        _reservedNftIds.remove(nftId);

        _safeTransferFrom(address(this), userAddress, nftId, 1, "");

        // TODO: Pay back the sent-price? Dangerous, relying on block.timestamp

        emit FinishedPurchasing(userAddress, nftId);
    }

    // -----------------------------------------
    // Superfluid SuperApp Callbacks
    // -----------------------------------------

    function beforeAgreementCreated(
        ISuperToken superToken,
        address agreementClass,
        bytes32 /*agreementId*/,
        bytes calldata, /*agreementData*/
        bytes calldata ctx
    ) external view override onlyHost onlyExpected(superToken, agreementClass) returns (bytes memory cbdata) {
        cbdata = _beforeBuy(ctx);
    }

    function afterAgreementCreated(
        ISuperToken, /* superToken */
        address agreementClass,
        bytes32 agreementId,
        bytes calldata, /*agreementData*/
        bytes calldata cbdata,
        bytes calldata ctx
    ) external override onlyHost returns (bytes memory newCtx) {
        (,int96 flowRate,,) = IConstantFlowAgreementV1(agreementClass).getFlowByID(_itemData.acceptedToken, agreementId);

        require(flowRate == requiredFlowRate(), "Item: Required Flow rate mismatch");
        return _startPurchase(ctx, agreementClass, agreementId, cbdata);
    }

    function beforeAgreementTerminated(
        ISuperToken superToken,
        address agreementClass,
        bytes32 /*agreementId*/,
        bytes calldata, /*agreementData*/
        bytes calldata /*ctx*/
    ) external view override onlyHost returns (bytes memory cbdata) {
        // According to the app basic law, we should never revert in a termination callback
        if (!_isSameToken(superToken) || !_isCFAv1(agreementClass)) return abi.encode(true);
        return abi.encode(false);
    }

    function afterAgreementTerminated(
        ISuperToken, /* superToken */
        address, /* agreementClass */
        bytes32 agreementId,
        bytes calldata, /*agreementData*/
        bytes calldata cbdata,
        bytes calldata ctx
    ) external override onlyHost returns (bytes memory newCtx) {
        // According to the app basic law, we should never revert in a termination callback
        bool shouldIgnore = abi.decode(cbdata, (bool));
        if (shouldIgnore) return ctx;
        
        _finishPurchase(agreementId);

        return ctx;
    }

    // -----------------------------------------
    // Chainlink Keeper
    // -----------------------------------------
    function checkUpkeep(bytes calldata /* checkData */) external override returns (bool upkeepNeeded, bytes memory /* performData */) {
        upkeepNeeded = (_itemData.endPaymentDate < block.timestamp) && _buyingUsersSet.length() > 0;
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        for (uint256 i = 0; i < 100; i++) { // Processing "only" 100 buyers
            claim(_buyingUsersSet.at(i));
        }
    }   

    // -----------------------------------------
    // Other
    // -----------------------------------------

    function _isSameToken(ISuperToken superToken) private view returns (bool) {
        return address(superToken) == address(_itemData.acceptedToken);
    }

    function _isCFAv1(address agreementClass) private view returns (bool) {
        return
            ISuperAgreement(agreementClass).agreementType() ==
            keccak256("org.superfluid-finance.agreements.ConstantFlowAgreement.v1");
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // -----------------------------------------
    // Modifiers
    // -----------------------------------------

    modifier onlyOwner() {
        require(_msgSender() == _owner, "Item: Not the owner");
        _;
    }

    modifier onlyHost() {
        require(msg.sender == address(_sfHost), "Item: support only one host");
        _;
    }

    modifier onlyExpected(ISuperToken superToken, address agreementClass) {
        require(_isSameToken(superToken), "Item: not accepted token");
        require(_isCFAv1(agreementClass), "Item: only CFAv1 supported");
        _;
    }
}