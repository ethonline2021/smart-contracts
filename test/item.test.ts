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

let erc20Contract: Contract,
    itemContract: Contract;

describe('Item', function () {
  beforeEach(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    main = await deployMain();
    erc20Contract = await deployErc20('DummyErc20', 'DUM', ethers.utils.parseEther("10000"));

    const userAddress: Address = await userSignup(main, 'Mr.X', 'Lorem ipsum dolor sit amet');
    userContract = await ethers.getContractAt("User", userAddress);

    const today = new Date();
    const endPaymentDate = new Date(today.getFullYear(), today.getMonth()+3, today.getDate()).getDate();
    const itemAddress: Address = await createItem(userContract, 'Thy Title', 'Desc', BigNumber.from(42), erc20Contract.address, 666, endPaymentDate, 'https://a.com/api/{id}.json');
    itemContract = await ethers.getContractAt("Item", itemAddress);
  });
 
  it('Should be able to update and retrieve the details', async function () {
    const title: string = 'Ethereum after The Merge';
    const description: string = 'While Layer 2 is taking off on Ethereum, topics like cross-chain transactions and fast withdrawals are top of mind. At the same time, Ethereum is planning for its largest release to date with the merge with the beacon chain.';
    const price: BigNumber = BigNumber.from(12);
    const token: Address = erc20Contract.address;
    const today = new Date();
    const endPaymentDate = new Date(today.getFullYear(), today.getMonth()+4, today.getDate()).getDate();
    const uri: string = 'https://e.io/api/{id}.json';

    // Check the actual values are not the new ones ...
    let itemDetails = await itemContract.getDetails();
    expect(itemDetails[0]).to.be.equal(owner.address);
    expect(itemDetails[1]).to.not.be.equal(title);
    expect(itemDetails[3]).to.not.be.equal(price);

    await expect(itemContract.update(title, description, price, token, endPaymentDate, uri))
        .to.emit(itemContract, "ItemUpdated")
        .withArgs(itemContract.address, owner.address, title, description, price, token, endPaymentDate, uri);

    itemDetails = await itemContract.getDetails();
    expect(itemDetails[0]).to.be.equal(owner.address);
    expect(itemDetails[1]).to.be.equal(title);
    expect(itemDetails[2]).to.be.equal(description);
    expect(itemDetails[3]).to.be.equal(price);
    expect(itemDetails[4]).to.be.equal(token);
    expect(itemDetails[6]).to.be.equal(endPaymentDate);
    expect(itemDetails[7]).to.be.equal(uri);

    expect(await itemContract.uri(1)).to.be.equal(uri);
    expect(await itemContract.balanceOf(itemContract.address,1)).to.be.equal(1);
    expect(await itemContract.balanceOf(itemContract.address,245)).to.be.equal(1);
    expect(await itemContract.balanceOf(itemContract.address,666)).to.be.equal(1);
    expect(await itemContract.balanceOf(itemContract.address,667)).to.be.equal(0);
  });
});