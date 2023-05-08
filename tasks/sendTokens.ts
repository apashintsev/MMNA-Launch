import { task } from "hardhat/config";
import { PepeElonMuskToken__factory } from "../typechain-types/factories/PepeElonMuskToken.sol/PepeElonMuskToken__factory";
import "dotenv/config";

// npx hardhat send_tokens --network testnetBSC --token 0xFa60D973F7642B748046464e165A65B7323b0DEE
task(
  "send_tokens",
  "Отправит с адреса деплоера на адреса из .енв указанное там количество токенов"
)
  .addParam("token", "Адрес контракта токена")
  .setAction(async (taskArgs, { ethers }) => {
    const deployer = await ethers.getSigner(process.env.DEPLOYER_ADDRESS!);

    const token = await PepeElonMuskToken__factory.connect(
      taskArgs.token,
      deployer
    );

    console.log("Transfer PepeElonMusk Token from " + deployer.address);

    await transferTo(process.env.ADDRESS_CEX!, process.env.ADDRESS_CEX_AMOUNT!);
    await transferTo(
      process.env.ADDRESS_AIRDROP!,
      process.env.ADDRESS_AIRDROP_AMOUNT!
    );

    async function transferTo(to: string, amount: string) {
      await token.transfer(to, ethers.utils.parseEther(amount));
      console.log(ethers.utils.parseEther(amount) + " to " + to);
    }
  });
