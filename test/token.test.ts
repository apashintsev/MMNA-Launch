import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  Crowdsale__factory,
  MMNALaunchToken__factory,
  USDT__factory,
} from "../typechain-types/factories/contracts";
import { USDT } from "../typechain-types/contracts/USDT";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { keccak256, randomBytes } from "ethers/lib/utils";
import { Wallet } from "ethers";
import { MerkleTree } from "merkletreejs";

describe("Tests", () => {
  const deploy = async () => {
    const [
      deployer,
      user1,
      user2,
      user3,
      team,
      airdrops,
      influencers,
      marketing,
    ] = await ethers.getSigners();

    const usdt = await new USDT__factory(deployer).deploy();

    const token = await new MMNALaunchToken__factory(deployer).deploy(
      team.address,
      airdrops.address,
      influencers.address,
      marketing.address,
      usdt.address
    );
    await token.deployed();

    const crowdsale = await token.crowdsale();

    return {
      usdt,
      token,
      crowdsale,
      deployer,
      user1,
      user2,
      user3,
      team,
      airdrops,
      influencers,
      marketing,
    };
  };

  it("All deployed correctly and start settings is right", async () => {
    const {
      deployer,
      token,
      crowdsale,
      team,
      airdrops,
      influencers,
      marketing,
    } = await loadFixture(deploy);

    expect(await token.maxTotalSupply()).eq(
      ethers.utils.parseEther("88888888888")
    );
    expect(await token.balanceOf(team.address)).eq(
      ethers.utils.parseEther("9777777778")
    );
    expect(await token.balanceOf(airdrops.address)).eq(
      ethers.utils.parseEther("977777778")
    );
    expect(await token.balanceOf(influencers.address)).eq(
      ethers.utils.parseEther("2666666667")
    );
    expect(await token.balanceOf(marketing.address)).eq(
      ethers.utils.parseEther("8888888889")
    );
    expect(await token.balanceOf(crowdsale)).eq(
      ethers.utils.parseEther("66577777776")
    );

    const cs = Crowdsale__factory.connect(crowdsale, deployer);

    expect(await cs.owner()).eq(deployer.address);
    expect(await cs.token()).eq(token.address);
    expect(await cs.currentRound()).eq(0);
    expect(await cs.isFinished()).eq(false);
  });
  it("Round I", async () => {
    const { deployer, token, crowdsale, user1, user2, user3, usdt } =
      await loadFixture(deploy);

    await mintUsdt(usdt, user1.address, 500);
    await mintUsdt(usdt, user2.address, 500);
    await mintUsdt(usdt, user3.address, 500);

    const cs = Crowdsale__factory.connect(crowdsale, deployer);

    const txInit = await cs.init(
      ethers.utils.parseUnits("10", 6),
      ethers.utils.parseUnits("20", 6),
      ethers.utils.parseUnits("30", 6)
    );
    await txInit.wait();
    expect(await cs.currentRound()).eq(1);

    //owner adds users to whitelist
    const txAdd1 = await cs.addToFirstRoundWhitelist(user1.address);
    await txAdd1.wait();

    const txAdd2 = await cs.addToFirstRoundWhitelist(user2.address);
    await txAdd2.wait();

    await time.increaseTo((await time.latest()) + 60 * 60 + 1); //hour

    //try to mint
    await incAllowance(usdt, user1, crowdsale);
    await incAllowance(usdt, user2, crowdsale);
    await incAllowance(usdt, user3, crowdsale);

    const txMint1 = await cs.connect(user1).buy(1, []);
    await txMint1.wait();

    expect(await token.balanceOf(user1.address)).eq(
      ethers.utils.parseEther("1")
    );

    const txMint2 = await cs.connect(user2).buy(10, []);
    await txMint2.wait();

    expect(await token.balanceOf(user2.address)).eq(
      ethers.utils.parseEther("10")
    );

    await expect(cs.connect(user3).buy(10, [])).revertedWith("Buy not allowed");

    await expect(cs.switchRound()).rejectedWith("Round can not be closed yet");

    await time.increaseTo((await time.latest()) + 7 * 60 * 60 + 1); //hour
    const txSwitch = await cs.switchRound();
    await txSwitch.wait();

    expect(await cs.currentRound()).eq(2);
  });
  it("Round II", async () => {
    const { deployer, token, crowdsale, user1, user2, user3, usdt } =
      await loadFixture(deploy);

    await mintUsdt(usdt, user1.address, 550000);
    await mintUsdt(usdt, user2.address, 500);
    await mintUsdt(usdt, user3.address, 500);

    const cs = Crowdsale__factory.connect(crowdsale, deployer);

    const txInit = await cs.init(
      ethers.utils.parseUnits("10", 6),
      ethers.utils.parseUnits("20", 6),
      ethers.utils.parseUnits("30", 6)
    );
    await txInit.wait();
    expect(await cs.currentRound()).eq(1);

    //owner adds users to whitelist
    const txAdd1 = await cs.addToFirstRoundWhitelist(user1.address);
    await txAdd1.wait();

    await time.increaseTo((await time.latest()) + 60 * 60 + 1); //hour

    //try to mint
    await incAllowance(usdt, user1, crowdsale);
    await incAllowance(usdt, user2, crowdsale);
    await incAllowance(usdt, user3, crowdsale);

    const txMint1 = await cs.connect(user1).buy(50000, []);
    await txMint1.wait();

    expect(await token.balanceOf(user1.address)).eq(
      ethers.utils.parseEther("50000")
    );

    const txSwitch = await cs.switchRound();
    await txSwitch.wait();

    expect(await cs.currentRound()).eq(2);

    const randomAddresses = new Array(15)
      .fill(0)
      .map(() => new Wallet(randomBytes(32)).address);

    const merkleTree = new MerkleTree(
      randomAddresses.concat(user2.address),
      keccak256,
      { hashLeaves: true, sortPairs: true }
    );

    const root = merkleTree.getRoot();

    const txSetRoot = await cs.setMerkleRootForSecondRound(root);
    await txSetRoot.wait();

    const proof2 = merkleTree.getHexProof(keccak256(user2.address));
    expect(await cs.connect(user2).canBuy(proof2)).eq(true);
    const balanceBefore = ethers.utils.formatUnits(
      (await usdt.balanceOf(user2.address)).toString(),
      6
    );
    //console.log({ balanceBefore });
    const txBuy = await cs.connect(user2).buy(10, proof2);
    await txBuy.wait();

    const roundPrice = ethers.utils.formatUnits(
      (await cs.getRoundData(2)).price.toString(),
      6
    );
    //console.log({roundPrice})
    expect(await token.balanceOf(user2.address)).eq(
      ethers.utils.parseEther("10")
    );
    const balanceAfter = ethers.utils.formatUnits(
      (await usdt.balanceOf(user2.address)).toString(),
      6
    );
    //console.log({balanceAfter})
    expect(
      Number.parseInt(
        ethers.utils.formatUnits(
          (await usdt.balanceOf(user2.address)).toString(),
          6
        )
      )
    ).eq(500 - 10 * Number.parseInt(roundPrice));

    const proof3 = merkleTree.getHexProof(keccak256(user3.address));
    expect(await cs.connect(user3).canBuy(proof3)).eq(false);

    await expect(cs.connect(user3).buy(10, proof3)).revertedWith(
      "Buy not allowed"
    );

    await expect(cs.switchRound()).rejectedWith("Round can not be closed yet");

    await time.increaseTo((await time.latest()) + 8 * 60 * 60 + 1); //8 hours
    const txSwitch3 = await cs.switchRound();
    await txSwitch3.wait();

    expect(await cs.currentRound()).eq(3);
  });
  it("Round III", async () => {
    const { deployer, token, crowdsale, user1, user2, user3, usdt } =
      await loadFixture(deploy);

    await mintUsdt(usdt, user1.address, 550000);
    await mintUsdt(usdt, user2.address, 3555550);
    await mintUsdt(usdt, user3.address, 50000000000000);

    const cs = Crowdsale__factory.connect(crowdsale, deployer);

    const txInit = await cs.init(
      ethers.utils.parseUnits("10", 6),
      ethers.utils.parseUnits("20", 6),
      ethers.utils.parseUnits("30", 6)
    );
    await txInit.wait();
    expect(await cs.currentRound()).eq(1);

    //owner adds users to whitelist
    await (await cs.addToFirstRoundWhitelist(user1.address)).wait();

    await time.increaseTo((await time.latest()) + 60 * 60 + 1); //hour

    //try to mint
    await incAllowance(usdt, user1, crowdsale);
    await incAllowance(usdt, user2, crowdsale);
    await incAllowance(usdt, user3, crowdsale);

    await (await cs.connect(user1).buy(50000, [])).wait();

    await (await cs.switchRound()).wait();

    const randomAddresses = new Array(12)
      .fill(0)
      .map(() => new Wallet(randomBytes(32)).address);

    const merkleTree = new MerkleTree(
      randomAddresses.concat(user2.address),
      keccak256,
      { hashLeaves: true, sortPairs: true }
    );

    await (await cs.setMerkleRootForSecondRound(merkleTree.getRoot())).wait();

    const proof2 = merkleTree.getHexProof(keccak256(user2.address));

    await (await cs.connect(user2).buy(18000, proof2)).wait();

    await (await cs.switchRound()).wait();

    expect(await cs.currentRound()).eq(3);

    await (await cs.connect(user3).buy(10, [])).wait();

    expect(await token.balanceOf(user3.address)).eq(
      ethers.utils.parseEther("10")
    );

    await expect(cs.switchRound()).rejectedWith("Round can not be closed yet");

    await expect(cs.collectUnsoldTokensAndWithdrawUsdt()).revertedWith(
      "Crowdsale is not ended"
    );

    await time.increaseTo((await time.latest()) + 14 * 60 * 60 + 1); //14 hours
    const txSwitch4 = await cs.switchRound();
    await txSwitch4.wait();

    expect(await cs.currentRound()).eq(4);
    expect(await token.balanceOf(deployer.address)).eq(0);
    await (await cs.collectUnsoldTokensAndWithdrawUsdt()).wait();
    expect(await token.balanceOf(deployer.address)).gt(0);
  });
  it("Transfer before sale ends", async () => {
    const { deployer, token, crowdsale, user1, user2, user3, usdt } =
      await loadFixture(deploy);

    await mintUsdt(usdt, user1.address, 550000);
    await mintUsdt(usdt, user2.address, 3555550);
    await mintUsdt(usdt, user3.address, 500);
    await mintUsdt(usdt, deployer.address, 500);

    const cs = Crowdsale__factory.connect(crowdsale, deployer);

    const txInit = await cs.init(
      ethers.utils.parseUnits("10", 6),
      ethers.utils.parseUnits("20", 6),
      ethers.utils.parseUnits("30", 6)
    );
    await txInit.wait();
    expect(await cs.currentRound()).eq(1);

    //owner adds users to whitelist
    await (await cs.addToFirstRoundWhitelist(user1.address)).wait();

    await time.increaseTo((await time.latest()) + 60 * 60 + 1); //hour

    //try to mint
    await incAllowance(usdt, deployer, crowdsale);
    await incAllowance(usdt, user1, crowdsale);
    await incAllowance(usdt, user2, crowdsale);
    await incAllowance(usdt, user3, crowdsale);

    await (await cs.connect(user1).buy(50000, [])).wait();

    await (await cs.switchRound()).wait();

    const randomAddresses = new Array(12)
      .fill(0)
      .map(() => new Wallet(randomBytes(32)).address);

    const merkleTree = new MerkleTree(
      randomAddresses.concat(user2.address),
      keccak256,
      { hashLeaves: true, sortPairs: true }
    );
    await (await cs.setMerkleRootForSecondRound(merkleTree.getRoot())).wait();

    const proof2 = merkleTree.getHexProof(keccak256(user2.address));
    await (await cs.connect(user2).buy(18000, proof2)).wait();

    await (await cs.switchRound()).wait();

    expect(await cs.currentRound()).eq(3);

    await (await cs.connect(user3).buy(10, [])).wait();

    expect(await token.balanceOf(user3.address)).eq(
      ethers.utils.parseEther("10")
    );

    await expect(
      token.connect(user3).transfer(deployer.address, 100)
    ).revertedWith("Cant transfer before sale ends");

    await (await cs.connect(deployer).buy(10, [])).wait();
    expect(await token.balanceOf(deployer.address)).eq(
      ethers.utils.parseEther("10")
    );
    await (
      await token
        .connect(deployer)
        .transfer(user1.address, ethers.utils.parseEther("10"))
    ).wait();

    await time.increaseTo((await time.latest()) + 14 * 60 * 60 + 1); //14 hours
    await (await cs.switchRound()).wait();

    expect(await cs.currentRound()).eq(4);
    expect(await token.balanceOf(deployer.address)).eq(0);
    await (await cs.collectUnsoldTokensAndWithdrawUsdt()).wait();
    expect(await token.balanceOf(deployer.address)).gt(0);

    const user3Balance = await token.balanceOf(user3.address);
    await expect(
      token.connect(user3).transfer(deployer.address, 100)
    ).revertedWith("Cant transfer before sale ends");

    await time.increaseTo((await time.latest()) + 6 * 60 * 60 + 1); //6 hours
    await (
      await token.connect(user3).transfer(deployer.address, user3Balance)
    ).wait();
    expect(await token.balanceOf(user3.address)).eq(0);
  });
});
async function incAllowance(
  usdt: USDT,
  user: SignerWithAddress,
  crowdsale: string
) {
  const txAllowance = await usdt
    .connect(user)
    .approve(crowdsale, ethers.constants.MaxInt256);
  await txAllowance.wait();
}

async function mintUsdt(usdt: USDT, user: string, amount: number) {
  const txMint = await usdt.mint(
    user,
    ethers.utils.parseUnits(amount.toString(), 6)
  );
  await txMint.wait();
}
