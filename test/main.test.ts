import { ethers } from "hardhat";
import { expect } from 'chai';
import { Contract, ContractFactory } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { authorSignup } from "./common";

let mainFactory: ContractFactory;
let main: Contract;

let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[];

describe('Main', function () {
  beforeEach(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();

    mainFactory = await ethers.getContractFactory("Main");
    main = await mainFactory.deploy();
    expect(main.address).to.be.properAddress;
  });
 
  it('Should signup a creator', async function () {
    const name = 'Mr.X';
    const description = 'Lorem ipsum dolor sit amet';
    const authorAddress = await authorSignup(main, name, description);
  });
});