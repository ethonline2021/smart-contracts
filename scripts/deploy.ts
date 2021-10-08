import { ethers } from "hardhat";
import { Address } from "hardhat-deploy/dist/types";

async function deploy(contractName: string, constructorArgs: any[], finalOwner: string): Promise<string> {
  const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", owner.address);
  console.log(
    `Owner [${owner.address}] Balance:`,
    ethers.utils.formatEther(await owner.getBalance()).toString()
  );
  
  const Contract = await ethers.getContractFactory(contractName);
  const deployed = await Contract.deploy(...constructorArgs);
  
  console.log(`${contractName} deployed to:`, deployed.address);
  
  if(finalOwner != '') {
    await deployed.transferOwnership(finalOwner);
    console.log("Ownership transfered to:", finalOwner);
  } 

  return deployed.address;
}

async function setItemFactory(mainAddr: Address, itemFactoryAddr: Address){
  const mainContract = await ethers.getContractAt("Main", mainAddr);
  await mainContract.setItemFactory(itemFactoryAddr);
}

const sfHost = process.env.SUPERFLUID_HOST || '';
const sfCfa = process.env.SUPERFLUID_CFA || '';
const sfResolver = process.env.SUPERFLUID_RESOLVER || '';
const sfVersion = process.env.SUPERFLUID_VERSION || '';

deploy("Main", [sfHost, sfCfa, sfResolver, sfVersion], "0xdF83f67321635C8c2Df962C0FB2ab9C8c92dBaB1")
  .then(async (mainAddr) => {
    const itemFactoryAddr = await deploy("ItemFactory", [mainAddr], "");
    await setItemFactory(mainAddr, itemFactoryAddr);
  })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });