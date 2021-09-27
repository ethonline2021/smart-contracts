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

export const createItem = async (contract: Contract, title: string, description: string, price: BigNumber, token: Address, amount: number, endPaymentDate: number): Promise<Address> => {
    let tx = await contract.deployItem(title, description, price, token, amount, endPaymentDate);
    let receipt = await tx.wait();
    receipt = receipt.events?.filter((x: any) => {return x.event == "ItemDeployed"})[0];
    expect(receipt.args.itemAddress).to.be.properAddress;
    expect(receipt.args.title).to.be.equal(title);
    expect(receipt.args.description).to.be.equal(description);
    expect(receipt.args.price).to.be.equal(price);
    expect(receipt.args.token).to.be.equal(token);
    expect(receipt.args.amount).to.be.equal(amount);
    expect(receipt.args.endPaymentDate).to.be.equal(endPaymentDate);

    return receipt.args.itemAddress;
}