import { ethers } from "hardhat";
import { expect } from 'chai';
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { userSignup, deployMain, deployErc20, deployItemFactory, createItem } from "./common";
import { BigNumber } from "ethers";

let main: Contract;
let userContract: Contract;

let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[];

let erc20Contract: Contract,
    itemFactory: Contract;

// SuperFluid config
const sfHost: Address = process.env.SUPERFLUID_HOST || '';
const sfCfa: Address = process.env.SUPERFLUID_CFA || '';
const sfResolver: Address = process.env.SUPERFLUID_RESOLVER || '';
const sfVersion: string = process.env.SUPERFLUID_VERSION || '';

describe('ItemFactory', function () {
  beforeEach(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    main = await deployMain(sfHost, sfCfa, sfResolver, sfVersion);
    itemFactory = await deployItemFactory(main.address);
    await main.setItemFactory(itemFactory.address);

    erc20Contract = await deployErc20('DummyErc20', 'DUM', ethers.utils.parseEther("10000"));

    const userAddress: Address = await userSignup(main, 'Mr.X', 'Lorem ipsum dolor sit amet');
    userContract = await ethers.getContractAt("User", userAddress);
  });
 
  it("Shouldn't deploy an Item directly", async function () {
    const today = new Date();
    const endPaymentDate = Math.floor(today.setDate(today.getDate() + 30)/1000);
    await expect(itemFactory.deployItem(userContract.address, "title", "desc", ethers.utils.parseEther("42"), "0x5D8B4C2554aeB7e86F387B4d6c00Ac33499Ed01f", 100, endPaymentDate, "http://url.co"))
      .to.be.revertedWith("ItemFactory: Not called from main");
  });

  it("Should return items with purchases to claim", async function () {
    const title: string = 'Ethereum after The Merge';
    const description: string = 'While Layer 2 is taking off on Ethereum, topics like cross-chain transactions and fast withdrawals are top of mind. At the same time, Ethereum is planning for its largest release to date with the merge with the beacon chain.';
    const price: BigNumber = ethers.utils.parseEther("42");
    const token: Address = "0x5D8B4C2554aeB7e86F387B4d6c00Ac33499Ed01f"; // Hardcoding DAIX supertoken...
    const amount: number = 100;
    const today = new Date();
    const endPaymentDate = Math.floor(today.setDate(today.getDate() + 30)/1000);
    const uri: string = 'https://game.example/api/item/{id}.json';

    const itemAddress: Address = await createItem(main, title, description, price, token, amount, endPaymentDate, uri);
    expect(itemAddress).to.be.a.properAddress;

    const { upkeepNeeded, performData } = await itemFactory.checkUpkeep("0x");
    expect(upkeepNeeded).to.be.false;
    expect(performData).to.be.equal("0x");
  });
});