import { task } from "hardhat/config";
import { PepeElonMuskToken__factory } from "../typechain-types/factories/PepeElonMuskToken.sol";
import "dotenv/config";

// npx hardhat set_limits --network testnetBSC --token 0x90A7b6E7871810cc0829c96E76A861B973Ed7DC1 --pool 0x2c621705Cb89e334Fcc6B734D5686ed11AbC9CFD --max 10 --min 0.5
task(
  "set_limits",
  "Установит лимиты, которые будут проверяться для всех держателей токена кроме владельца перед отправкой"
)
  .addParam("token", "Адрес контракта токена")
  .addParam("pool", "Адрес пула ликвидности")
  .addParam("max", "Верхняя граница лимита")
  .addParam("min", "Нижняя граница лимита")
  .setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner(process.env.DEPLOYER_ADDRESS!);

    const token = await PepeElonMuskToken__factory.connect(
      taskArgs.token,
      deployer
    );

    const txSetRule = await token.setRule(
      true,
      taskArgs.pool,
      ethers.utils.parseEther(taskArgs.max),
      ethers.utils.parseEther(taskArgs.min)
    );
    await txSetRule.wait();
    console.log(
      `Limits setted [${ethers.utils.parseEther(
        taskArgs.min
      )} - ${ethers.utils.parseEther(taskArgs.max)}] (${taskArgs.min} - ${
        taskArgs.max
      })`
    );
  });
