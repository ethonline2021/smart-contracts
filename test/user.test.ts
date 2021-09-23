import { ethers } from "hardhat";
import { expect } from 'chai';
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { userSignup, deployMain } from "./common";
import { BigNumber } from "ethers";

let main: Contract;
let userContract: Contract;

let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[];

describe('User', function () {
  beforeEach(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    main = await deployMain();

    const name = 'Mr.X';
    const description = 'Lorem ipsum dolor sit amet';
    const userAddress: Address = await userSignup(main, name, description);
    userContract = await ethers.getContractAt("User", userAddress);
  });
 
  it('Should be able to update his details', async function () {
    const newName = 'Mr.Y';
    const newDescription = 'Another description'
    await expect(userContract.connect(alice).update(newName, newDescription))
            .to.be.revertedWith("User: Not the creator");

    await expect(userContract.update(newName, newDescription))
            .to.emit(userContract, "UserUpdated")
            .withArgs(newName, newDescription);
    
  });
});