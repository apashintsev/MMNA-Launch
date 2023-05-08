import { task } from "hardhat/config";
import { PepeElonMuskToken__factory } from "../typechain-types/factories/PepeElonMuskToken.sol";
import "dotenv/config";

// npx hardhat renounce_ownership --network testnetBSC --token 0x90A7b6E7871810cc0829c96E76A861B973Ed7DC1
task("renounce_ownership", "Владельцем станет нулевой адрес")
  .addParam("token", "Адрес контракта токена")
  .setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner(process.env.DEPLOYER_ADDRESS!);

    const token = await PepeElonMuskToken__factory.connect(
      taskArgs.token,
      deployer
    );

    const txRenounceOwnership = await token.renounceOwnership();
    await txRenounceOwnership.wait();
    console.log(
      `Limits setted [${ethers.utils.parseEther(
        taskArgs.min
      )} - ${ethers.utils.parseEther(taskArgs.max)}] (${taskArgs.min} - ${
        taskArgs.max
      })`
    );
  });
