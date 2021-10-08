import { ethers } from "hardhat";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { userSignup, deployMain, deployErc20, deployItemFactory, createItem } from "./common";
import { expect } from "chai";
import { BigNumber } from "ethers";

let main: Contract;

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

describe('Main', function () {
  beforeEach(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    main = await deployMain(sfHost, sfCfa, sfResolver, sfVersion);
    itemFactory = await deployItemFactory(main.address);
    await main.setItemFactory(itemFactory.address);
    erc20Contract = await deployErc20('DummyErc20', 'DUM', ethers.utils.parseEther("10000"));
  });
 
  it('Should be able to get the Superfluid Config', async function () {
    const superfluidConfig = await main.superfluidConfig();
    expect(superfluidConfig[0]).to.be.equal(sfHost);
    expect(superfluidConfig[1]).to.be.equal(sfCfa);
    expect(superfluidConfig[2]).to.be.equal(sfResolver);
    expect(superfluidConfig[3]).to.be.equal(sfVersion);
    
  });

  it("Should create & get SuperTokens", async function () {
    expect(await main.isSuperToken(erc20Contract.address)).to.be.false;
    expect(await main.getSuperToken(erc20Contract.address)).to.be.equal("0x0000000000000000000000000000000000000000");

    // Create the SuperToken
    let tx = await main.createSuperToken(erc20Contract.address);
    await tx.wait();

    const superToken = await main.getSuperToken(erc20Contract.address);
    expect(superToken).to.be.properAddress;
    expect(superToken).to.be.not.equal("0x0000000000000000000000000000000000000000");
    expect(await main.isSuperToken(superToken)).to.be.true;
    await expect(main.createSuperToken(superToken)).to.be.revertedWith("Main: Token is already a SuperToken");
    expect(await main.getSuperToken(superToken)).to.be.equal(superToken);
});

  it('Should signup a user', async function () {
    const name: string = 'Mr.X';
    const description: string = 'Lorem ipsum dolor sit amet';
    const deployedUserAddress: Address = await userSignup(main, name, description);
    expect(deployedUserAddress).to.be.a.properAddress;

    expect(await main.getDeployedUser(owner.address)).to.be.equal(deployedUserAddress);
    expect(await main.getDeployedUser(alice.address)).to.be.equal('0x0000000000000000000000000000000000000000');

    await expect(main.deployUser(name, description)).to.be.revertedWith("Main: User already deployed");
  });

  it('Should be able to deploy a new Item', async function () {
    const title: string = 'Ethereum after The Merge';
    const description: string = 'While Layer 2 is taking off on Ethereum, topics like cross-chain transactions and fast withdrawals are top of mind. At the same time, Ethereum is planning for its largest release to date with the merge with the beacon chain.';
    const price: BigNumber = ethers.utils.parseEther("42");
    const token: Address = "0x5D8B4C2554aeB7e86F387B4d6c00Ac33499Ed01f"; // Hardcoding DAIX supertoken...
    const amount: number = 100;
    const today = new Date();
    const endPaymentDate = Math.floor(today.setDate(today.getDate() + 30)/1000);
    const uri: string = 'https://game.example/api/item/{id}.json';

    await expect(main.deployItem(title, description, price, token, amount, endPaymentDate, uri)).to.be.revertedWith("Main: Forbidden sender");
    
    await userSignup(main, "Jon Snow", "King in the north");
    const itemAddress: Address = await createItem(main, title, description, price, token, amount, endPaymentDate, uri);
    expect(itemAddress).to.be.a.properAddress;
  });
});