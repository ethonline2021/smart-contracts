import { ethers, network } from "hardhat";
import { expect } from 'chai';
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { userSignup, deployMain, createItem, timeTravel, deployItemFactory } from "./common";
import { BigNumber } from "ethers";

const SuperfluidSDK = require("@superfluid-finance/js-sdk");

let main: Contract;

let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[];

let itemContract: Contract,
    itemFactory: Contract;

// SuperFluid config
const sfHost: Address = process.env.SUPERFLUID_HOST || '';
const sfCfa: Address = process.env.SUPERFLUID_CFA || '';
const sfResolver: Address = process.env.SUPERFLUID_RESOLVER || '';
const sfVersion: string = process.env.SUPERFLUID_VERSION || '';
let sf: any;
let daiContract: Contract,
    daixContract: Contract;

let evmSnapshotId: any;

describe('Item', function () {
  before(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();

    console.log('\r\n\r\n=====Deploying SF Protocol=====\r\n');
    const tokenSymbol = "fDAI";
    sf = new SuperfluidSDK.Framework({
      ethers: ethers.provider,
      tokens: ["fDAI"],
    });
    await sf.initialize();
    
    const {
        ISuperToken,
        TestToken,
    } = sf.contracts;

    const daiAddress = await sf.resolver.get(`tokens.${tokenSymbol}`);
    const daixAddress = await sf.resolver.get(`supertokens.${sfVersion}.${tokenSymbol}x`);
    daiContract = await TestToken.at(daiAddress);
    daixContract = await ISuperToken.at(daixAddress);
    console.log('\r\n===============================\r\n\r\n');

    // Setting some tokens and supertokens to the user
    const deposit = ethers.utils.parseEther("20000");
    await daiContract.mint(owner.address, deposit);
    await daiContract.mint(bob.address, deposit);
    expect(deposit).to.be.equal(await daiContract.balanceOf(owner.address));
    expect(deposit).to.be.equal(await daiContract.balanceOf(bob.address));

    await expect(await daiContract.approve(daixContract.address, deposit.div(2))).to.emit(daiContract, "Approval");
    await expect(await daixContract.upgrade(deposit.div(2))).to.emit(daixContract, "TokenUpgraded");
    await expect(await daiContract.connect(bob).approve(daixContract.address, deposit.div(2))).to.emit(daiContract, "Approval");
    await expect(await daixContract.connect(bob).upgrade(deposit.div(2))).to.emit(daixContract, "TokenUpgraded");
    
    expect(await daiContract.balanceOf(owner.address)).to.be.equal(deposit.div(2));
    expect(await daixContract.balanceOf(owner.address)).to.be.equal(deposit.div(2));    
    expect(await daiContract.balanceOf(bob.address)).to.be.equal(deposit.div(2));
    expect(await daixContract.balanceOf(bob.address)).to.be.equal(deposit.div(2));    
  });

  beforeEach(async function () {
    itemFactory = await deployItemFactory();
    main = await deployMain(itemFactory.address, sfHost, sfCfa, sfResolver, sfVersion);

    await userSignup(main, "Jon Snow", "King in the north");

    const today = new Date();
    const endPaymentDate = Math.floor(today.setDate(today.getDate() + 30)/1000);
    const itemAddress = await createItem(main, 'Thy Title', 'Desc', ethers.utils.parseEther("42"), daixContract.address, 10, endPaymentDate, 'https://a.com/api/{id}.json');
    itemContract = await ethers.getContractAt("Item", itemAddress);

    evmSnapshotId = await network.provider.send("evm_snapshot");
  });
 
  afterEach(async function () {
    // This is going back in time because tests travel forward
    await network.provider.send("evm_revert", [evmSnapshotId]);
  });

  it('Should be able to update and retrieve the details', async function () {
    const title: string = 'Ethereum after The Merge';
    const description: string = 'While Layer 2 is taking off on Ethereum, topics like cross-chain transactions and fast withdrawals are top of mind. At the same time, Ethereum is planning for its largest release to date with the merge with the beacon chain.';
    const price: BigNumber = BigNumber.from(12);    

    // Check the actual values are not the new ones ...
    let itemDetails = await itemContract.getDetails();
    expect(itemDetails[0]).to.be.equal(owner.address);
    expect(itemDetails[1]).to.not.be.equal(title);
    expect(itemDetails[3]).to.not.be.equal(price);

    await expect(itemContract.update(title, description))
        .to.emit(itemContract, "ItemUpdated")
        .withArgs(owner.address, title, description);

    itemDetails = await itemContract.getDetails();
    expect(itemDetails[0]).to.be.equal(owner.address);
    expect(itemDetails[1]).to.be.equal(title);
    expect(itemDetails[2]).to.be.equal(description);

    expect(await itemContract.balanceOf(itemContract.address,1)).to.be.equal(1);
    expect(await itemContract.balanceOf(itemContract.address,5)).to.be.equal(1);
    expect(await itemContract.balanceOf(itemContract.address,10)).to.be.equal(1);
    expect(await itemContract.balanceOf(itemContract.address,11)).to.be.equal(0);
  });

  it('Should be able to start buying items', async function () {
    let itemDetails = await itemContract.getDetails();   
    const price = itemDetails[3];

    // Creates SF user and starts a flow
    const userOwner = sf.user({ address: owner.address, token: daixContract.address });

    const requiredFlowRate = await itemContract.requiredFlowRate();

    // Too low flowrate
    let error: any;
    try{
      await userOwner.flow({ recipient: itemContract.address, flowRate: (requiredFlowRate.sub(10000)).toString()});
    }catch(e){
      error = e;
    }
    expect(error).to.be.equal("Error: @superfluid-finance/js-sdk user.flow() : VM Exception while processing transaction: reverted with reason string 'Item: Required Flow rate mismatch'");

    await userOwner.flow({ recipient: itemContract.address, flowRate: requiredFlowRate.toString()});
    let flow = await sf.agreements.cfa.getFlow(daixContract.address, owner.address, itemContract.address);
    expect(flow.flowRate).to.be.equal(requiredFlowRate);

    await timeTravel(3600*24*1); // ONE DAY LATER ... 🐙

    await expect(itemContract.claim(owner.address)).to.be.revertedWith("Item: Not paid enough");

    await timeTravel((3600*24*29)+4700); // 30 DAYS, 1 hour and something LATER ... 🐙

    // Updating the flow is forbidden
    try{
      await userOwner.flow({ recipient: itemContract.address, flowRate: requiredFlowRate.div(10).toString() });
    }catch(e){
      error = e;
    }
    expect(error).to.be.equal("Error: @superfluid-finance/js-sdk user.flow() : VM Exception while processing transaction: reverted with reason string 'Unsupported callback - Before Agreement updated'");

    // Should be paid (aprox.) after one month
    expect(await itemContract.totalPaid(owner.address)).to.be.above(price)
    expect(await daixContract.balanceOf(itemContract.address)).to.be.above(price);
  });

  it('Should be able to claim items bought', async function () {
    let itemDetails = await itemContract.getDetails();
    const price = itemDetails[3];
    const requiredFlowRate = await itemContract.requiredFlowRate();

    // Creates SF user and starts a flow
    const userOwner = sf.user({ address: owner.address, token: daixContract.address });
    await userOwner.flow({ recipient: itemContract.address, flowRate: requiredFlowRate.toString()});
    let flow = await sf.agreements.cfa.getFlow(daixContract.address, owner.address, itemContract.address);
    expect(flow.flowRate).to.be.equal(requiredFlowRate);

    await timeTravel(3600*24*30+4700); // ONE MONTH LATER ... 🐙

    // Should be paid (aprox.) after one month
    expect(await daixContract.balanceOf(itemContract.address)).to.be.above(price);
    
    let tx = await itemContract.claim(owner.address);
    let receipt = await tx.wait();
    receipt = receipt.events?.filter((x: any) => {return x.event == "FinishedPurchasing"})[0];
    expect(receipt.args.buyer).to.be.equal(owner.address);

    expect(await itemContract.balanceOf(owner.address, receipt.args.nftId)).to.be.equal(1);

    flow = await sf.agreements.cfa.getFlow(daixContract.address, owner.address, itemContract.address);
    expect(flow.timestamp).to.be.equal(BigNumber.from(0));
    expect(flow.flowRate).to.be.equal(BigNumber.from(0));
  });

  it('Should be able to close the flow and receive items bought', async function () {
    let itemDetails = await itemContract.getDetails();
    const price = itemDetails[3];
    const requiredFlowRate = await itemContract.requiredFlowRate();

    // Creates SF user and starts a flow
    const userOwner = sf.user({ address: owner.address, token: daixContract.address });
    await userOwner.flow({ recipient: itemContract.address, flowRate: requiredFlowRate.toString()});
    let flow = await sf.agreements.cfa.getFlow(daixContract.address, owner.address, itemContract.address);
    expect(flow.flowRate).to.be.equal(requiredFlowRate);

    await timeTravel(3600*24*30+4700); // ONE MONTH LATER ... 🐙

    await userOwner.flow({ recipient: itemContract.address, flowRate: "0"});
    flow = await sf.agreements.cfa.getFlow(daixContract.address, owner.address, itemContract.address);
    expect(flow.timestamp).to.be.equal(BigNumber.from(0));
    expect(flow.flowRate).to.be.equal(BigNumber.from(0));

    // Should be paid (aprox.) after one month
    const erc20Balance = await daixContract.balanceOf(itemContract.address);
    expect(erc20Balance).to.be.above(price);

    //Withdraw ERC20
    const initialBalance = await daixContract.balanceOf(owner.address);
    itemContract.withdrawErc20(owner.address, daixContract.address);
    expect(await daixContract.balanceOf(itemContract.address)).to.be.equal(0);
    expect(await daixContract.balanceOf(owner.address)).to.be.equal(initialBalance.add(erc20Balance));

    // ALERT: Nft ID is hardcoded, we have no idea if 1 will be always received
    expect(await itemContract.balanceOf(owner.address, 1)).to.be.equal(1);
  });

  it('Should be able to see available Items and not purchasing multiple tickets', async function () {
    expect(await itemContract.availableAmount()).to.be.equal(BigNumber.from(10));

    // Creates SF user and starts a flow
    const userOwner = sf.user({ address: owner.address, token: daixContract.address });

    let requiredFlowRate = await itemContract.requiredFlowRate();
    await userOwner.flow({ recipient: itemContract.address, flowRate: requiredFlowRate.toString()});
    expect(await itemContract.availableAmount()).to.be.equal(BigNumber.from(9));

    // Creating a new flow, is like updating the flow
    let error;
    try{
      requiredFlowRate = await itemContract.requiredFlowRate();
      await userOwner.flow({ recipient: itemContract.address, flowRate: requiredFlowRate.toString()});
    }catch(e){
      error = e;
    }
    expect(error).to.be.equal("Error: @superfluid-finance/js-sdk user.flow() : VM Exception while processing transaction: reverted with reason string 'Unsupported callback - Before Agreement updated'");
  });

  it('Testing withdraw ERC20', async function () {
    let initialOwnerERC20Balance = await daixContract.balanceOf(owner.address);

    await daixContract.transfer(itemContract.address, initialOwnerERC20Balance.div(2));
    
    expect(await daixContract.balanceOf(itemContract.address)).to.be.equal(initialOwnerERC20Balance.div(2));
    expect(await daixContract.balanceOf(owner.address)).to.be.equal(initialOwnerERC20Balance.div(2));

    await itemContract.withdrawErc20(owner.address, daixContract.address);

    expect(await daixContract.balanceOf(itemContract.address)).to.be.equal(0);
    expect(await daixContract.balanceOf(owner.address)).to.be.equal(initialOwnerERC20Balance);
  });
});