import { Contract } from "ethers";
import { ethers } from "hardhat";

export default async function deployContract<T extends Contract>(
  name: string,
  ...args: string[]
): Promise<T> {
  const contractFactory = await ethers.getContractFactory(name);

  const contract: T = (await contractFactory.deploy(...args)) as T;
  await contract.deployed();

  return contract;
}
