import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BlockchairsToken } from "../typechain-types/contracts";

describe("Blockchairs investments tests", () => {
  const deploy = async () => {
    const [
      deployer,
      user1,
      user2,
      user3,
      user4,
      user5,
      user6,
      user7,
      user8,
      user9,
      user10,
      user11,
      user12,
      user13,
    ] = await ethers.getSigners();

    const BlockchairsTokenFactory = await ethers.getContractFactory(
      "BlockchairsToken"
    );

    const token: BlockchairsToken = await BlockchairsTokenFactory.deploy();
    await token.deployed();

    return {
      token,
      deployer,
      users: [
        user1,
        user2,
        user3,
        user4,
        user5,
        user6,
        user7,
        user8,
        user9,
        user10,
        user11,
        user12,
        user13,
      ],
    };
  };

  it("All deployed correctly and start settings is right", async () => {
    const { deployer, token } = await loadFixture(deploy);
    expect(await token.balanceOf(deployer.address)).to.equal(100000);
    expect(await token.tokenPrice()).to.equal(
      ethers.utils.parseEther("0.00001")
    );
    expect(await token.nextComputeRewardsDate()).to.equal(
      (await time.latest()) + 31 * 24 * 60 * 60
    );
  });
  it("Buy tokens and get payout", async () => {
    const { deployer, token, users } = await loadFixture(deploy);

    const txBuy = await token
      .connect(users[0])
      .buy({ value: ethers.utils.parseEther("1") });
    await txBuy.wait();

    const tokensBalance = await token.balanceOf(users[0].address);
    expect(tokensBalance).to.equal(100000);
    console.log({tokensBalance})

    const transactionHash = await users[10].sendTransaction({
      to: token.address,
      value: ethers.utils.parseEther("10.0"),
    });
    await transactionHash.wait();

    await time.increaseTo((await time.latest()) + 31 * 24 * 60 * 60 + 1);
    const txComputeRewards = await token.connect(users[0]).computeRewards();
    await txComputeRewards.wait();

    const allowedAmount = await token
      .connect(users[0])
      .getAllowedWithdrawAmount();
    console.log({ allowedAmount });
    const balance = await token.getBalance();
    console.log({ balance });
    const totalSupply = await token.totalSupply();
    console.log({ totalSupply });
    console.log(balance.div(totalSupply))
  });
  it("Compute rewards", async () => {
    const { deployer, token, users } = await loadFixture(deploy);
    const currentTime = await time.latest();
    expect(await token.nextComputeRewardsDate()).to.equal(
      currentTime + 31 * 24 * 60 * 60
    );
    await time.increaseTo(currentTime + 31 * 24 * 60 * 60 + 1);
    const txComputeRewards = await token.connect(users[0]).computeRewards();
    await txComputeRewards.wait();
    /*expect(await token.nextComputeRewardsDate()).to.equal(
      (await time.latest()) + 90 * 24 * 60 * 60 +2
    );*/
  });
});
