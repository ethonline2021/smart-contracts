import { ethers } from "hardhat";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Address } from "hardhat-deploy/dist/types";
import { userSignup, deployMain, deployErc20 } from "./common";
import { expect } from "chai";
import { BigNumber } from "ethers";

let main: Contract;

let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[];

let erc20Contract: Contract;

// SuperFluid config
const sfHost: Address = process.env.SUPERFLUID_HOST || '';
const sfCfa: Address = process.env.SUPERFLUID_CFA || '';
const sfResolver: Address = process.env.SUPERFLUID_RESOLVER || '';
const sfVersion: string = process.env.SUPERFLUID_VERSION || '';

describe('Main', function () {
  beforeEach(async function () {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    main = await deployMain(sfHost, sfCfa, sfResolver, sfVersion);
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

  it('Should fail deploying an item externally', async function () {
    await expect(main.deployItem(
      erc20Contract.address, 'Thy Title', 'Desc', BigNumber.from(42), erc20Contract.address, 666, 1, 'https://a.com/api/{id}.json'
    )).to.be.revertedWith("Main: Forbidden sender");
  });
});