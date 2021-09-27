import { ethers } from "hardhat";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { userSignup, deployMain } from "./common";
import { expect } from "chai";

let main: Contract;

let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[];

describe('Main', function () {
  beforeEach(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    main = await deployMain();
  });
 
  it('Should signup a user', async function () {
    const name = 'Mr.X';
    const description = 'Lorem ipsum dolor sit amet';
    const deployedUserAddress: Address = await userSignup(main, name, description);
    expect(deployedUserAddress).to.be.a.properAddress;

    expect(await main.getDeployedUser(owner.address)).to.be.equal(deployedUserAddress);
    expect(await main.getDeployedUser(alice.address)).to.be.equal('0x0000000000000000000000000000000000000000');
  });
});