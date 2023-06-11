// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {Crowdsale} from "./Crowdsale.sol";

contract MMNALaunchToken is ERC20, Ownable, Pausable {
    uint256 public immutable maxTotalSupply;
    Crowdsale public crowdsale;
    mapping(address => bool) public blacklisted;

    modifier onlyAllowed() {
        require(!blacklisted[msg.sender]);
        _;
    }

    constructor(
        address team,
        address airdrops,
        address influencers,
        address marketing,
        address usdt
    ) ERC20("MMNA Launch", "MMNA") {
        maxTotalSupply = 88_888_888_888 * 10 ** decimals();
        crowdsale = new Crowdsale(usdt, msg.sender);

        _mint(team, 9_777_777_778 * 10 ** decimals());
        _mint(airdrops, 977_777_778 * 10 ** decimals());
        _mint(influencers, 2_666_666_667 * 10 ** decimals());
        _mint(marketing, 8_888_888_889 * 10 ** decimals());

        _mint(address(crowdsale), maxTotalSupply - totalSupply());
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused onlyAllowed {
        if (
            !crowdsale.isFinished() &&
            (from != address(crowdsale) &&
                from != owner() &&
                from != address(0))
        ) {
            revert("Cant transfer before sale ends");
        }
        super._beforeTokenTransfer(from, to, amount);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function addToBlackList(address user) external onlyOwner {
        blacklisted[user] = true;
    }

    function removeFromBlackList(address user) external onlyOwner {
        blacklisted[user] = false;
    }
}
