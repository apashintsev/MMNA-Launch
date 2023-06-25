import hre, { ethers } from "hardhat";
import "dotenv/config";
import {
  MMNALaunchToken__factory,
  USDT__factory,
} from "../typechain-types/factories/contracts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  //Деплой токена
  //деплой скриптом npx hardhat run --network mumbai  .\scripts\deploy.ts
  const accounts = await ethers.getSigners();
  const deployer = accounts.find(
    (x) => x.address == process.env.DEPLOYER_ADDRESS
  );

  let usdtAddress = ethers.constants.AddressZero;
  const usdt = await new USDT__factory(deployer).deploy();
  await usdt.deployed();
  usdtAddress = usdt.address;

  const token = await new MMNALaunchToken__factory(deployer).deploy(
    process.env.ADDRESS_TEAM!,
    process.env.ADDRESS_AIRDROPS!,
    process.env.ADDRESS_MARKETING!,
    process.env.ADDRESS_INFLUENCERS!,
    usdtAddress,
    process.env.ROUND_SWITCHER_ADDRESS!
  );
  await token.deployed();

  await sleep(35 * 1000);

  try {
    await hre.run("verify:verify", {
      address: token.address,
      contract: "contracts/MMNALaunchToken.sol:MMNALaunchToken",
      constructorArguments: [
        process.env.ADDRESS_TEAM!,
        process.env.ADDRESS_AIRDROPS!,
        process.env.ADDRESS_MARKETING!,
        process.env.ADDRESS_INFLUENCERS!,
        usdtAddress,
        process.env.ROUND_SWITCHER_ADDRESS!,
      ],
    });
  } catch (e) {
    //console.log(e);
  }
  const crowdsaleAddress = await token.crowdsale();

  try {
    await hre.run("verify:verify", {
      address: crowdsaleAddress,
      contract: "contracts/Crowdsale.sol:Crowdsale",
      constructorArguments: [usdtAddress, deployer?.address],
    });
  } catch (e) {
    //console.log(e);
  }

  try {
    await hre.run("verify:verify", {
      address: usdtAddress,
      contract: "contracts/USDT.sol:USDT",
      constructorArguments: [],
    });
  } catch (e) {
    //console.log(e);
  }
  console.log("MMNALaunchToken Token deployed to:", token.address);
  console.log("MMNALaunch Crowdsale deployed to:", crowdsaleAddress);
  console.log("USDT deplyed to: " + usdtAddress);
  console.log("All deployed.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
