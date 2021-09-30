// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC1155/presets/ERC1155PresetMinterPauser.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import { SuperAppBase } from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperAppBase.sol";
import {
    ISuperfluid,
    ISuperToken,
    ISuperAgreement,
    SuperAppDefinitions,
    ISuperApp
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import "./Main.sol";
import "./utils/Simple777Recipient.sol";

import "hardhat/console.sol";

contract Item is Context, ERC1155PresetMinterPauser, ERC1155Holder, Simple777Recipient, SuperAppBase {
    using EnumerableSet for EnumerableSet.AddressSet;

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
        string description
    );

    event ItemBought(
        address item,
        address buyer,
        uint256 amount
    );

    // -----------------------------------------
    // Storage
    // -----------------------------------------
    Main private _main;
    address private _owner;
    string private _title;
    string private _description;
    uint256 private _price;
    ISuperToken private _acceptedToken;
    uint256 private _amount;
    uint256 private _endPaymentDate;
    string private _uri;

    int96 private _MINIMUM_FLOW_RATE;

    ISuperfluid private _sfHost; // host
    IConstantFlowAgreementV1 private _sfCfa; // the stored constant flow agreement class address

    mapping (address => int96) private _buyingUsers;  // user address => buying items
    EnumerableSet.AddressSet private _buyingUsersSet; 

    // -----------------------------------------
    // Errors
    // -----------------------------------------

    string private constant _ERR_STR_LOW_FLOW_RATE = "Superfluid: Flow rate too low";

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
        ERC1155PresetMinterPauser(uri) 
        Simple777Recipient(address(token))
    {
        require(address(owner) != address(0), "Item: Owner Address can't be 0x");
        require(price > 0, "Item: Price must be > 0");
        require(address(token) != address(0), "Item: Token Address can't be 0x");
        require(amount > 0, "Item: Amount must be > 0");
        require(endPaymentDate > 0, "Item: EndPaymentDate must be > 0");

        _main = Main(main);

        ERC20WithTokenInfo acceptedToken = ERC20WithTokenInfo(address(token));
        require(_main.isSuperToken(acceptedToken),"Item: SuperToken required");

        _owner = owner;
        _title = title;
        _description = description;
        _price = price;
        _acceptedToken = ISuperToken(address(token));
        _amount = amount;
        _endPaymentDate = endPaymentDate;
        _uri = uri;

        for (uint256 id=1; id<=amount; id++) {
            _mint(address(this), id, 1, "");
        }

        (_sfHost,_sfCfa,,) = _main.superfluidConfig();

        // TODO: This fixed the rate at price paid in 1 month. Ideally, we should use endPaymentDate to adjust this.
        _MINIMUM_FLOW_RATE = (int96(int(price)) * 1e18) / (3600 * 24 * 30);

        emit ItemCreated(address(this), _owner, _title, _description, _price, address(_acceptedToken), _amount, _endPaymentDate, _uri);
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
        return(_owner, _title, _description, _price, address(_acceptedToken), _amount, _endPaymentDate, _uri);
    }

    function update(
        string memory title, 
        string memory description
    )
        external
        onlyOwner
    {
        _title = title;
        _description = description;

        _setURI(_uri);

        emit ItemUpdated(address(this), _owner, title, description);
    }

    function buy(uint256 amount)
        public
    {
        require(amount > 0, "Item: Amount must be > 0");

        int96 flowRate = _MINIMUM_FLOW_RATE * int96(int(amount));
        _openFlow(_msgSender(), flowRate);

        emit ItemBought(address(this), _msgSender(), amount);
    }
 
    // -----------------------------------------
    // Superfluid Flows Logic
    // -----------------------------------------

    function _openFlow(address sender, int96 flowRate)
        private
        returns (bytes memory newCtx)
    {
        require(flowRate > 0, _ERR_STR_LOW_FLOW_RATE);

        newCtx = _sfHost.callAgreement(
            _sfCfa,
            abi.encodeWithSelector(
                _sfCfa.createFlow.selector,
                _acceptedToken,
                sender,
                address(this),
                flowRate,
                new bytes(0) // placeholder
            ),
            new bytes(0)
        );
    }

    function _updateFlow(int96 flowRate)
        private
        returns (bytes memory newCtx)
    {
        require(flowRate > 0, _ERR_STR_LOW_FLOW_RATE);

        newCtx = _sfHost.callAgreement(
            _sfCfa,
            abi.encodeWithSelector(
                _sfCfa.updateFlow.selector,
                _acceptedToken,
                address(this),
                flowRate,
                new bytes(0) // placeholder
            ),
            new bytes(0)
        );
    }

    function _startBuyStream(
        bytes calldata ctx,
        address agreementClass,
        bytes32 agreementId,
        bytes calldata cbdata
    ) private returns (bytes memory newCtx) {
        ISuperfluid.Context memory context = _sfHost.decodeCtx(ctx); // userData

        if(_buyingUsersSet.contains(context.msgSender)) {
            (, int96 flowRate, , ) = IConstantFlowAgreementV1(agreementClass).getFlowByID(_acceptedToken, agreementId);
            newCtx = _updateFlow(flowRate+_MINIMUM_FLOW_RATE);
            _buyingUsers[context.msgSender] = _buyingUsers[context.msgSender]+1;
        }else{
            _buyingUsers[context.msgSender] = 1;
        }

        _buyingUsersSet.add(context.msgSender);
    }

    function _updateBuyStream(
        bytes calldata ctx,
        address agreementClass,
        bytes32 agreementId,
        bytes calldata cbdata
    ) private returns (bytes memory newCtx) {
        ISuperfluid.Context memory context = _sfHost.decodeCtx(ctx); // userData
        (, int96 flowRate, , ) = IConstantFlowAgreementV1(agreementClass).getFlowByID(_acceptedToken, agreementId);

        int96 minFlow = _buyingUsers[context.msgSender]*_MINIMUM_FLOW_RATE;

        require(flowRate >= minFlow, _ERR_STR_LOW_FLOW_RATE);
        newCtx = _updateFlow(flowRate);
    }

    function _terminateBuyStream(bytes calldata ctx) private returns (bytes memory newCtx) {
        ISuperfluid.Context memory context = _sfHost.decodeCtx(ctx); // userData
        
        // Check the amount paid


        // Send NFT accordingly
        // uint256[] memory ids = [];
        // uint256[] memory amounts = [];
        // safeBatchTransferFrom(address(this), context.msgSender, ids, amounts);

        // Return the exceeding amount to the user. ?.

        _buyingUsers[context.msgSender] = 0;
        _buyingUsersSet.remove(context.msgSender);
    }

    // -----------------------------------------
    // Superfluid SuperApp Callbacks
    // -----------------------------------------

    function afterAgreementCreated(
        ISuperToken, /* superToken */
        address agreementClass,
        bytes32 agreementId,
        bytes calldata, /*agreementData*/
        bytes calldata cbdata,
        bytes calldata ctx
    ) external override onlyHost returns (bytes memory newCtx) {
        return _startBuyStream(ctx, agreementClass, agreementId, cbdata);
    }

    function afterAgreementUpdated(
        ISuperToken, /* superToken */
        address agreementClass,
        bytes32 agreementId,
        bytes calldata, /*agreementData*/
        bytes calldata cbdata,
        bytes calldata ctx
    ) external override onlyHost returns (bytes memory newCtx) {
        return _updateBuyStream(ctx, agreementClass, agreementId, cbdata);
    }

    function beforeAgreementTerminated(
        ISuperToken superToken,
        address agreementClass,
        bytes32, /*agreementId*/
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
        bytes32, /* agreementId */
        bytes calldata, /*agreementData*/
        bytes calldata cbdata,
        bytes calldata ctx
    ) external override onlyHost returns (bytes memory newCtx) {
        // According to the app basic law, we should never revert in a termination callback
        bool shouldIgnore = abi.decode(cbdata, (bool));
        if (shouldIgnore) return ctx;
        return _terminateBuyStream(ctx);
    }

    function _isSameToken(ISuperToken superToken) private view returns (bool) {
        return address(superToken) == address(_acceptedToken);
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
        override(ERC1155PresetMinterPauser, ERC1155Receiver)
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