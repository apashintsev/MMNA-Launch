// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

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
    address public roundSwitcher;

    struct RoundData {
        uint256 price;
        uint256 startAt;
        uint256 duration;
        uint256 targetUsdt;
        uint256 totalUsdt;
    }

    //k-round number; v- price in usdt
    mapping(uint256 => RoundData) public rounds;
    //mapping(address => bool) public firstRoundWhitelist;
    bytes32 public merkleRootForFirstRound;
    bytes32 public merkleRootForSecondRound;

    modifier onlyOwnerOrSwitcher() {
        require(msg.sender == owner() || msg.sender == roundSwitcher);
        _;
    }

    event CrowdsaleStarted();
    event TokenBuyed(address indexed _from, uint256 amount);
    event RoundFinished();
    event CrowdsaleFinished();

    constructor(address _usdt, address _operator, address _roundSwitcher) {
        usdt = ERC20(_usdt);
        token = ERC20(msg.sender);
        transferOwnership(_operator);
        roundSwitcher = _roundSwitcher;
    }

    function init(
        uint256 firstRoundPrice,
        uint256 secondRoundPrice,
        uint256 thirdRoundPrice
    ) external onlyOwner {
        require(currentRound == 0);
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
        emit CrowdsaleStarted();
    }

    function setMerkleRootForFirstRound(bytes32 root) external onlyOwner {
        merkleRootForFirstRound = root;
    }

    function setMerkleRootForSecondRound(bytes32 root) external onlyOwner {
        merkleRootForSecondRound = root;
    }

    /// @notice Buy token for USDT
    /// @param tokensCount count of full tokens that user will receive
    function buy(uint256 tokensCount, bytes32[] calldata merkleProof) external {
        if (!canBuy(merkleProof)) {
            revert("Buy not allowed");
        }
        uint256 usdtAmount = tokensCount * rounds[currentRound].price;
        rounds[currentRound].totalUsdt += usdtAmount;
        if (
            usdt.balanceOf(msg.sender) >= usdtAmount &&
            token.balanceOf(address(this)) >= tokensCount
        ) {
            usdt.transferFrom(msg.sender, address(this), usdtAmount);
            token.transfer(msg.sender, tokensCount * 10 ** token.decimals());
        }
        emit TokenBuyed(msg.sender, tokensCount);
    }

    function canBuy(bytes32[] calldata merkleProof) public view returns (bool) {
        bool isAllowByRoundCondition = block.timestamp <=
            rounds[currentRound].startAt + rounds[currentRound].duration &&
            rounds[currentRound].totalUsdt <= rounds[currentRound].targetUsdt;
        if (currentRound == 1) {
            return
                isInIwhitelist(msg.sender, merkleProof) &&
                isAllowByRoundCondition;
        }
        if (currentRound == 2) {
            return
                isInIIwhitelist(msg.sender, merkleProof) &&
                isAllowByRoundCondition;
        }
        return isAllowByRoundCondition;
    }

    function isInIwhitelist(
        address user,
        bytes32[] calldata merkleProof
    ) public view returns (bool) {
        return
            MerkleProof.verify(
                merkleProof,
                merkleRootForFirstRound,
                keccak256(abi.encodePacked(user))
            );
    }

    function isInIIwhitelist(
        address user,
        bytes32[] calldata merkleProof
    ) public view returns (bool) {
        return
            MerkleProof.verify(
                merkleProof,
                merkleRootForSecondRound,
                keccak256(abi.encodePacked(user))
            );
    }

    /// @notice Switches round number if condition is passed; sets next round start time
    function switchRound() onlyOwnerOrSwitcher external {
        if (isNeedToSwitchRound()) {
            _switchRound();
        } else {
            revert("Round can not be closed yet");
        }
    }

    function _switchRound() private {
        currentRound += 1;
        rounds[currentRound].startAt = block.timestamp;
        emit RoundFinished();
        if (currentRound == 4) {
            emit CrowdsaleFinished();
        }
    }

    /// @notice Returns true if round ended
    function isNeedToSwitchRound() public view returns (bool) {
        return
            block.timestamp >
            rounds[currentRound].startAt + rounds[currentRound].duration ||
            rounds[currentRound].totalUsdt >= rounds[currentRound].targetUsdt;
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

    function getRoundData(
        uint256 roundNumber
    ) external view returns (RoundData memory) {
        return rounds[roundNumber];
    }
}
