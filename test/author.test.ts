import { ethers } from "hardhat";
import { expect } from 'chai';
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { authorSignup, createStream, deployMain } from "./common";
import { BigNumber } from "ethers";

let main: Contract;
let authorContract: Contract;

let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[];

describe('Author', function () {
  beforeEach(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    main = await deployMain();

    const name = 'Mr.X';
    const description = 'Lorem ipsum dolor sit amet';
    const authorAddress: Address = await authorSignup(main, name, description);
    authorContract = await ethers.getContractAt("Author", authorAddress);
  });
 
  it('Author should be able to update his details', async function () {
    const newName = 'Mr.Y';
    const newDescription = 'Another description'
    await expect(authorContract.connect(alice).update(newName, newDescription))
            .to.be.revertedWith("Author: Not the creator");

    await expect(authorContract.update(newName, newDescription))
            .to.emit(authorContract, "AuthorUpdated")
            .withArgs(newName, newDescription);
    
  });

  it('Should be able to create a new Stream', async function () {
    const title: string = "A Real Live One";
    const description: string = "Yooo this is a test";
    const entryToken: Address = ethers.utils.getAddress("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    const entryAmount: BigNumber = BigNumber.from(23);
    const streamAddress: Address = await createStream(authorContract, title, description, entryToken, entryAmount);
    expect(streamAddress).to.be.a.properAddress;
  });
});