import { ethers } from "hardhat";
import { Contract, ContractFactory } from '@ethersproject/contracts';
import { expect } from 'chai';
import { Address } from "hardhat-deploy/dist/types";
import { BigNumber } from "ethers";

export const deployMain = async(): Promise<Contract> => {
    const mainFactory: ContractFactory = await ethers.getContractFactory("Main");
    const main: Contract = await mainFactory.deploy();
    expect(main.address).to.be.properAddress;

    return main;
}

export const userSignup = async (contract: Contract, name: string, description: string): Promise<Address> => {
    let tx = await contract.deployUser(name, description);
    let receipt = await tx.wait();
    receipt = receipt.events?.filter((x: any) => {return x.event == "UserDeployed"})[0];
    expect(receipt.args.userAddress).to.be.properAddress;
    expect(receipt.args.name).to.be.equal(name);
    expect(receipt.args.description).to.be.equal(description);

    return receipt.args.userAddress;
}