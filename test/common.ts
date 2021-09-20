import { ethers } from "hardhat";
import { Contract, ContractFactory } from '@ethersproject/contracts';
import { expect } from 'chai';
import { Address } from "hardhat-deploy/dist/types";

export const deployMain = async(): Promise<Contract> => {
    const mainFactory: ContractFactory = await ethers.getContractFactory("Main");
    const main: Contract = await mainFactory.deploy();
    expect(main.address).to.be.properAddress;

    return main;
}

export const authorSignup = async (contract: Contract, name: string, description: string): Promise<Address> => {
    let tx = await contract.deployAuthor(name, description);
    let receipt = await tx.wait();
    receipt = receipt.events?.filter((x: any) => {return x.event == "AuthorDeployed"})[0];
    expect(receipt.args.authorAddress).to.be.properAddress;
    expect(receipt.args.name).to.be.equal(name);
    expect(receipt.args.description).to.be.equal(description);

    return receipt.args.authorAddress;
}