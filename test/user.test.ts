import { ethers } from "hardhat";
import { expect } from 'chai';
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { userSignup, deployMain, createItem, deployErc20 } from "./common";
import { BigNumber } from "ethers";

let main: Contract;
let userContract: Contract;

let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[];

let erc20Contract: Contract;

describe('User', function () {
  beforeEach(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    main = await deployMain();
    erc20Contract = await deployErc20('DummyErc20', 'DUM', ethers.utils.parseEther("10000"));

    const userAddress: Address = await userSignup(main, 'Mr.X', 'Lorem ipsum dolor sit amet');
    userContract = await ethers.getContractAt("User", userAddress);
  });
 
  it('Should be able to update and retrieve his details', async function () {
    const newName: string = 'Mr.Y';
    const newDescription: string = 'Another description'
    await expect(userContract.connect(alice).update(newName, newDescription))
            .to.be.revertedWith("User: Not the owner");

    await expect(userContract.update(newName, newDescription))
            .to.emit(userContract, "UserUpdated")
            .withArgs(newName, newDescription);

    const userDetails = await userContract.getDetails();
    expect(userDetails[0]).to.be.equal(owner.address);
    expect(userDetails[1]).to.be.equal(newName);
    expect(userDetails[2]).to.be.equal(newDescription);
  });

  it('Should be able to deploy a new Item', async function () {
    const title: string = 'Ethereum after The Merge';
    const description: string = 'While Layer 2 is taking off on Ethereum, topics like cross-chain transactions and fast withdrawals are top of mind. At the same time, Ethereum is planning for its largest release to date with the merge with the beacon chain.';
    const price: BigNumber = BigNumber.from(42);
    const token: Address = erc20Contract.address;
    const amount: number = 666;
    const today = new Date();
    const endPaymentDate = new Date(today.getFullYear(), today.getMonth()+3, today.getDate()).getDate();
    const uri: string = 'https://game.example/api/item/{id}.json';

    const itemAddress: Address = await createItem(userContract, title, description, price, token, amount, endPaymentDate, uri);
    expect(itemAddress).to.be.a.properAddress;
  });
});