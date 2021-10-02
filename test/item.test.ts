import { ethers } from "hardhat";
import { expect } from 'chai';
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { userSignup, deployMain, createItem, deployErc20, timeTravel, deployItemFactory } from "./common";
import { BigNumber } from "ethers";

const SuperfluidSDK = require("@superfluid-finance/js-sdk");

let main: Contract;
let userContract: Contract;

let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[];

let erc20Contract: Contract,
    itemContract: Contract,
    itemFactory: Contract;

// SuperFluid config
const sfHost: Address = process.env.SUPERFLUID_HOST || '';
const sfCfa: Address = process.env.SUPERFLUID_CFA || '';
const sfResolver: Address = process.env.SUPERFLUID_RESOLVER || '';
const sfVersion: string = process.env.SUPERFLUID_VERSION || '';
let sf: any;
let daiContract: Contract,
    daixContract: Contract;

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
    erc20Contract = await deployErc20('DummyErc20', 'DUM', ethers.utils.parseEther("10000"));

    const userAddress: Address = await userSignup(main, 'Mr.X', 'Lorem ipsum dolor sit amet');
    userContract = await ethers.getContractAt("User", userAddress);

    const today = new Date();
    const endPaymentDate = new Date(today.getFullYear(), today.getMonth()+3, today.getDate()).getDate();
    const itemAddress = await createItem(userContract, 'Thy Title', 'Desc', ethers.utils.parseEther("42"), daixContract.address, 10, endPaymentDate, 'https://a.com/api/{id}.json');
    itemContract = await ethers.getContractAt("Item", itemAddress);
  });
 
  // it('Should be able to update and retrieve the details', async function () {
  //   const title: string = 'Ethereum after The Merge';
  //   const description: string = 'While Layer 2 is taking off on Ethereum, topics like cross-chain transactions and fast withdrawals are top of mind. At the same time, Ethereum is planning for its largest release to date with the merge with the beacon chain.';
  //   const price: BigNumber = BigNumber.from(12);    

  //   // Check the actual values are not the new ones ...
  //   let itemDetails = await itemContract.getDetails();
  //   expect(itemDetails[0]).to.be.equal(owner.address);
  //   expect(itemDetails[1]).to.not.be.equal(title);
  //   expect(itemDetails[3]).to.not.be.equal(price);

  //   await expect(itemContract.update(title, description))
  //       .to.emit(itemContract, "ItemUpdated")
  //       .withArgs(itemContract.address, owner.address, title, description);

  //   itemDetails = await itemContract.getDetails();
  //   expect(itemDetails[0]).to.be.equal(owner.address);
  //   expect(itemDetails[1]).to.be.equal(title);
  //   expect(itemDetails[2]).to.be.equal(description);

  //   expect(await itemContract.balanceOf(itemContract.address,1)).to.be.equal(1);
  //   expect(await itemContract.balanceOf(itemContract.address,5)).to.be.equal(1);
  //   expect(await itemContract.balanceOf(itemContract.address,10)).to.be.equal(1);
  //   expect(await itemContract.balanceOf(itemContract.address,11)).to.be.equal(0);
  // });

  it('Should be able to start buying items', async function () {
    let itemDetails = await itemContract.getDetails();
    const price = itemDetails[3];
    const minFlowRate = price.div(3600 * 24 * 30);

    // Creates SF user and starts a flow
    const userOwner = sf.user({ address: owner.address, token: daixContract.address });
    await userOwner.flow({ recipient: itemContract.address, flowRate: minFlowRate.toString()});
    let flow = await sf.agreements.cfa.getFlow(daixContract.address, owner.address, itemContract.address);
    expect(flow.flowRate).to.be.equal(minFlowRate);

    await timeTravel(3600*24*1); // ONE DAY LATER ... 🐙

    await expect(itemContract.claim()).to.be.revertedWith("Item: Not paid enough");

    await timeTravel(3600*24*29); // 29 DAYS LATER ... 🐙

    // Updating the flow is forbidden
    let error: any;
    try{
      await userOwner.flow({ recipient: itemContract.address, flowRate: minFlowRate.div(10).toString() });
    }catch(e){
      error = e;
    }
    expect(error).to.be.equal("Error: @superfluid-finance/js-sdk user.flow() : VM Exception while processing transaction: reverted with reason string 'Unsupported callback - Before Agreement updated'");

    // Should be paid (aprox.) after one month
    expect(await daixContract.balanceOf(itemContract.address)).to.be.closeTo(price, +ethers.utils.parseEther("0.0001").toString());
  });

  it('Should be able to claim items bought', async function () {
    let itemDetails = await itemContract.getDetails();
    const price = itemDetails[3];
    const minFlowRate = price.div(3600 * 24 * 30);

    // Creates SF user and starts a flow
    const userOwner = sf.user({ address: owner.address, token: daixContract.address });
    await userOwner.flow({ recipient: itemContract.address, flowRate: minFlowRate.toString()});
    let flow = await sf.agreements.cfa.getFlow(daixContract.address, owner.address, itemContract.address);
    expect(flow.flowRate).to.be.equal(minFlowRate);

    await timeTravel(3600*24*30); // ONE MONTH LATER ... 🐙

    // Should be paid (aprox.) after one month
    expect(await daixContract.balanceOf(itemContract.address)).to.be.closeTo(price, +ethers.utils.parseEther("0.0001").toString());

    let tx = await itemContract.claim();
    let receipt = await tx.wait();
    receipt = receipt.events?.filter((x: any) => {return x.event == "FinishedPurchasing"})[0];
    expect(receipt.args.buyer).to.be.equal(owner.address);

    expect(await itemContract.balanceOf(owner.address, receipt.args.nftId)).to.be.equal(1);
  });

  it('Should be able to close the flow and receive items bought', async function () {
    let itemDetails = await itemContract.getDetails();
    const price = itemDetails[3];
    const minFlowRate = price.div(3600 * 24 * 30);

    // Creates SF user and starts a flow
    const userOwner = sf.user({ address: owner.address, token: daixContract.address });
    await userOwner.flow({ recipient: itemContract.address, flowRate: minFlowRate.toString()});
    let flow = await sf.agreements.cfa.getFlow(daixContract.address, owner.address, itemContract.address);
    expect(flow.flowRate).to.be.equal(minFlowRate);

    await timeTravel(3600*24*30); // ONE MONTH LATER ... 🐙

    await userOwner.flow({ recipient: itemContract.address, flowRate: "0"});
    flow = await sf.agreements.cfa.getFlow(daixContract.address, owner.address, itemContract.address);
    expect(flow.timestamp).to.be.equal(BigNumber.from(0));
    expect(flow.flowRate).to.be.equal(BigNumber.from(0));

    // Should be paid (aprox.) after one month
    expect(await daixContract.balanceOf(itemContract.address)).to.be.closeTo(price, +ethers.utils.parseEther("0.0001").toString());

    // ALERT: Nft ID is hardcoded, we have no idea if 1 will be always received
    expect(await itemContract.balanceOf(owner.address, 1)).to.be.equal(1);
  });
});