// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title Crowdsale
/// @author MMNA Launch Team
/// @notice Crowdsale contract to spend project tokens
contract Crowdsale is Ownable {
    using SafeERC20 for ERC20;
    ERC20 public immutable token;
    ERC20 public immutable usdt;
    uint256 public currentRound;

    struct RoundData {
        uint256 price;
        uint256 startAt;
        uint256 duration;
        uint256 targetUsdt;
        uint256 totalUsdt;
    }

    //k-round number; v- price in usdt
    mapping(uint256 => RoundData) public rounds;
    mapping(address => bool) public firstRoundWhitelist;
    bytes32 public merkleRootForSecondRound;

    constructor(address _usdt, address _operator) {
        usdt = ERC20(_usdt);
        token = ERC20(msg.sender);
        transferOwnership(_operator);
    }

    function init(
        uint256 firstRoundPrice,
        uint256 secondRoundPrice,
        uint256 thirdRoundPrice
    ) external onlyOwner {
        rounds[1] = RoundData(
            firstRoundPrice,
            block.timestamp,
            5 hours,
            500_000 * 10 ** usdt.decimals(),
            0
        );
        rounds[2] = RoundData(
            secondRoundPrice,
            0,
            6 hours,
            355_555 * 10 ** usdt.decimals(),
            0
        );
        rounds[3] = RoundData(
            thirdRoundPrice,
            0,
            12 hours,
            577_777 * 10 ** usdt.decimals(),
            0
        );
        currentRound = 1;
    }

    function addToFirstRoundWhitelist(address user) external {
        firstRoundWhitelist[user] = true;
    }

    function setMerkleRootForSecondRound(bytes32 root) external onlyOwner {
        merkleRootForSecondRound = root;
    }

    /// @notice Buy token for USDT
    /// @param amount amount of tokens that user will receive
    function buy(uint256 amount, bytes32[] calldata merkleProof) external {
        uint256 tokenAmount = (amount * 10 ** token.decimals()) /
            rounds[currentRound].price;
        if (canBuy(msg.sender, merkleProof)) {
            uint256 usdtAmount = tokenAmount / rounds[currentRound].price;
            rounds[currentRound].totalUsdt += usdtAmount;
            usdt.transferFrom(msg.sender, address(this), usdtAmount);
            token.transfer(msg.sender, tokenAmount);
        } else {
            revert("Buy not allowed");
        }
    }

    function canBuy(
        address sender,
        bytes32[] calldata merkleProof
    ) public view returns (bool) {
        bool isAllowByRoundCondition = block.timestamp <=
            rounds[currentRound].startAt + rounds[currentRound].duration &&
            rounds[currentRound].totalUsdt <= rounds[currentRound].targetUsdt;
        if (currentRound == 1) {
            return firstRoundWhitelist[sender] && isAllowByRoundCondition;
        }
        if (currentRound == 1) {
            return
                MerkleProof.verify(
                    merkleProof,
                    merkleRootForSecondRound,
                    keccak256(abi.encodePacked(sender))
                ) && isAllowByRoundCondition;
        }
        return isAllowByRoundCondition;
    }

    /// @notice Switches round number if condition is passed; sets next round start time
    function switchRound() external onlyOwner {
        if (
            block.timestamp >
            rounds[currentRound].startAt + rounds[currentRound].duration ||
            rounds[currentRound].totalUsdt >= rounds[currentRound].targetUsdt
        ) {
            currentRound += 1;
            rounds[currentRound].startAt = block.timestamp;
        }
    }

    /// @notice Collects to owner all tokens that was not sold on Crowdsale
    function collectUnsoldTokensAndWithdrawUsdt() external onlyOwner {
        if (currentRound > 3) {
            token.transfer(msg.sender, token.balanceOf(address(this)));
            usdt.transfer(msg.sender, usdt.balanceOf(address(this)));
        } else {
            revert("Crowdsale is not ended");
        }
    }

    function isFinished() public view returns (bool) {
        return
            currentRound > 3 &&
            block.timestamp >= rounds[3].startAt + rounds[3].duration + 6 hours;
    }
}
