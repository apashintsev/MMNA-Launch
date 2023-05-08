import hre, { ethers } from "hardhat";
import { PepeElonMuskToken } from "../typechain-types/PepeElonMuskToken.sol";
import "dotenv/config";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  //Деплой токена
  //деплой скриптом npx hardhat run --network testnetBSC  .\scripts\deploy.ts
  const totalSupply = ethers.utils.parseEther(process.env.TOKEN_TOTAL_SUPPLY!);
  const accounts = await ethers.getSigners();
  const deployer = accounts.find(
    (x) => x.address == process.env.DEPLOYER_ADDRESS
  );

  console.log("Deploying contracts with the account:", deployer?.address);

  const contractFactory = await ethers.getContractFactory("PepeElonMuskToken");
  const token: PepeElonMuskToken = (await contractFactory.deploy(
    totalSupply
  )) as PepeElonMuskToken;

  await token.deployed();
  console.log("PepeElonMusk Token deployed to:", token.address);

  await sleep(5*1000);

  try {
    await hre.run("verify:verify", {
      address: token.address,
      contract: "contracts/PepeElonMuskToken.sol:PepeElonMuskToken",
      constructorArguments: [totalSupply],
    });
  } catch (e) {
    //console.log(e);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
