// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "@superfluid-finance/ethereum-contracts/contracts/interfaces/misc/IResolver.sol";
import { ISuperfluid, ISuperToken, ISuperTokenFactory, SuperAppDefinitions, ISuperApp } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import { IConstantFlowAgreementV1 } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";
import { ERC20WithTokenInfo } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/tokens/ERC20WithTokenInfo.sol";

import "./metatx/EIP712MetaTransaction.sol";

import "./User.sol";
import "./Item.sol";
import "./ItemFactory.sol";

contract Main is Ownable, EIP712MetaTransaction {
    using EnumerableSet for EnumerableSet.AddressSet;

    // -----------------------------------------
    // Events
    // -----------------------------------------
    event UserDeployed(
        address contractAddress,
        address owner,
        string name,
        string description
    );

    event ItemDeployed(
        address itemAddress,
        address user,
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
    ItemFactory private _itemFactory;
    ISuperfluid private _sfHost; // host
    IConstantFlowAgreementV1 private _sfCfa; // the stored constant flow agreement class address
    IResolver private _sfResolver;
    string private _sfVersion;

    mapping (address => address) public superTokenRegistry;  // Token registry for non-official tokens
    EnumerableSet.AddressSet private _superTokensSet; // Registry supertokens

    mapping (address => address) public deployedUsers;  // user address => deployed user contract address
    EnumerableSet.AddressSet private _deployedUsersSet; 

    // -----------------------------------------
    // Constructor
    // -----------------------------------------
    constructor(address sfHost, address sfCfa, address sfResolver, string memory sfVersion)
        EIP712MetaTransaction("Main", "1")
    {
        require(address(sfHost) != address(0), "Main: Host can't be 0x");
        require(address(sfCfa) != address(0), "Main: CFA can't be 0x");
        require(address(sfResolver) != address(0), "Main: Resolver can't be 0x");
        
        _sfHost = ISuperfluid(sfHost);
        _sfCfa = IConstantFlowAgreementV1(sfCfa);
        _sfResolver = IResolver(sfResolver);
        _sfVersion = sfVersion;
    }

    function setItemFactory(address itemFactory) external onlyOwner {
        require(address(itemFactory) != address(0), "Main: itemFactory can't be 0x");
        _itemFactory = ItemFactory(itemFactory);
    }

    // -----------------------------------------
    // Logic
    // -----------------------------------------
    function deployUser(string memory name, string memory description)
        external
        returns (User)
    {
        require(deployedUsers[msgSender()] == address(0), "Main: User already deployed");

        User user = new User(msgSender(), name, description);
        deployedUsers[msgSender()] = address(user);
        _deployedUsersSet.add(address(user));

        emit UserDeployed(address(user), msgSender(), name, description);

        return (user);
    }

    function deployItem(string memory title, string memory description, uint256 price, address token, uint256 amount, uint256 endPaymentDate, string memory uri)
        external
    {
        require(deployedUsers[msgSender()] != address(0), "Main: Forbidden sender");

        Item item = _itemFactory.deployItem(msgSender(), title, description, price, token, amount, endPaymentDate, uri);

        // _registerSuperApp(address(item));

        (,string memory _title, string memory _itemDescription, uint256 _price, address _acceptedToken, uint256 _amount, uint256 _endPaymentDate, string memory _uri) = item.getDetails();
        emit ItemDeployed(address(item), deployedUsers[msgSender()], msgSender(), _title, _itemDescription, _price, _acceptedToken, _amount, _endPaymentDate, _uri);
    }

    function _registerSuperApp(address superAppAddr) private {
        require(superAppAddr != address(0), "Main: superAppAddr can't be 0x");
        uint256 configWord = SuperAppDefinitions.APP_LEVEL_FINAL;
        _sfHost.registerAppByFactory(ISuperApp(address(superAppAddr)), configWord);
    }

    function getDeployedUser(address user) public view returns(address){
        return deployedUsers[user];
    }

    function superfluidConfig() external view returns (ISuperfluid, IConstantFlowAgreementV1, IResolver, string memory) {
        return (_sfHost, _sfCfa, _sfResolver, _sfVersion);
    }

    function isSuperToken(ERC20WithTokenInfo _token) public view returns (bool) {
        if(!_superTokensSet.contains(address(_token))){
            string memory tokenId = string(abi.encodePacked("supertokens", ".", _sfVersion, ".", _token.symbol()));
            return _sfResolver.get(tokenId) == address(_token);
        }
        return true;
    }

    function getSuperToken(ERC20WithTokenInfo _token) public view returns (address tokenAddress) {
        if(isSuperToken(_token)){
            tokenAddress = address(_token);
        } else {
            string memory tokenId = string(abi.encodePacked("supertokens", ".", _sfVersion, ".", _token.symbol(), "x"));
            tokenAddress = _sfResolver.get(tokenId);

            if (tokenAddress == address(0)) { // Look on the App registry if there's already a "non-oficially registered" Supertoken
                tokenAddress = superTokenRegistry[address(_token)];
            }
        }
    }

    function createSuperToken(ERC20WithTokenInfo _token) public returns (ISuperToken superToken) {
        require(isSuperToken(_token) == false, "Main: Token is already a SuperToken");

        if (superTokenRegistry[address(_token)] != address(0)) {
            superToken = ISuperToken(superTokenRegistry[address(_token)]);
        } else {
            ISuperTokenFactory factory = ISuperfluid(_sfHost).getSuperTokenFactory();
            string memory name = string(abi.encodePacked("Super ", _token.name()));
            string memory symbol = string(abi.encodePacked(_token.symbol(), "x"));
            superToken = factory.createERC20Wrapper(_token, ISuperTokenFactory.Upgradability.FULL_UPGRADABE, name, symbol);
            superTokenRegistry[address(_token)] = address(superToken);
            _superTokensSet.add(address(superToken));
        }
    }

    // -----------------------------------------
    // Modifiers
    // -----------------------------------------

    modifier onlyDeployedUsers() {
        require(_deployedUsersSet.contains(msgSender()), "Main: Forbidden sender");
        _;
    }
}
