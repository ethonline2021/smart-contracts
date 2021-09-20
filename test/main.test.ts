import { ethers } from "hardhat";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { authorSignup, deployMain } from "./common";

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
 
  it('Should signup an author', async function () {
    const name = 'Mr.X';
    const description = 'Lorem ipsum dolor sit amet';
    const authorAddress: Address = await authorSignup(main, name, description);
  });
});