import { ethers } from "hardhat";
import { expect } from 'chai';
import { Contract, ContractFactory } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { authorSignup, deployMain } from "./common";

let main: Contract;

let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[];

describe('Author', function () {
  beforeEach(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    main = await deployMain();
  });
 
  it('Author should be able to update his details', async function () {
    const name = 'Mr.X';
    const description = 'Lorem ipsum dolor sit amet';
    const authorAddress: Address = await authorSignup(main, name, description);

    const newName = 'Mr.Y';
    const newDescription = 'Another description'
    const authorContract = await ethers.getContractAt("Author", authorAddress);
    await expect(authorContract.connect(alice).update(newName, newDescription))
            .to.be.revertedWith("Author: Not the creator");

    await expect(authorContract.update(newName, newDescription))
            .to.emit(authorContract, "AuthorUpdated")
            .withArgs(newName, newDescription);
    
  });
});