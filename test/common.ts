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

export const authorSignup = async (contract: Contract, name: string, description: string): Promise<Address> => {
    let tx = await contract.deployAuthor(name, description);
    let receipt = await tx.wait();
    receipt = receipt.events?.filter((x: any) => {return x.event == "AuthorDeployed"})[0];
    expect(receipt.args.authorAddress).to.be.properAddress;
    expect(receipt.args.name).to.be.equal(name);
    expect(receipt.args.description).to.be.equal(description);

    return receipt.args.authorAddress;
}

export const createStream = async (contract: Contract, title: string, description: string, entryToken: Address, entryAmount: BigNumber): Promise<Address> => {
    let tx = await contract.createStream(title, description, entryToken, entryAmount);
    let receipt = await tx.wait();
    receipt = receipt.events?.filter((x: any) => {return x.event == "StreamDeployed"})[0];
    expect(receipt.args.streamAddress).to.be.properAddress;
    expect(receipt.args.title).to.be.equal(title);
    expect(receipt.args.description).to.be.equal(description);
    expect(receipt.args.token).to.be.equal(entryToken);
    expect(receipt.args.amount).to.be.equal(entryAmount);

    return receipt.args.streamAddress;
}