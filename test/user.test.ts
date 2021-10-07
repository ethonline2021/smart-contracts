import { ethers } from "hardhat";
import { expect } from 'chai';
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { userSignup, deployMain, deployErc20, deployItemFactory } from "./common";

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

describe('User', function () {
  beforeEach(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    itemFactory = await deployItemFactory();
    main = await deployMain(itemFactory.address, sfHost, sfCfa, sfResolver, sfVersion);
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
            .withArgs(userContract.address, newName, newDescription);

    const userDetails = await userContract.getDetails();
    expect(userDetails[0]).to.be.equal(owner.address);
    expect(userDetails[1]).to.be.equal(newName);
    expect(userDetails[2]).to.be.equal(newDescription);
  });
});