// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Crowdsale} from "./Crowdsale.sol";

contract MMNALaunch is ERC20, Pausable, Ownable {
    uint256 public immutable maxTotalSupply;
    Crowdsale public crowdsale;

    constructor(
        address _team,
        address _airdrops,
        address _influencers,
        address _marketing,
        address _usdt
    ) ERC20("MMNA Launch", "MMNA") {
        maxTotalSupply = 88_888_888_888 * 10 ** decimals();
        _mint(_team, 9_777_777_778 * 10 ** decimals());
        _mint(_airdrops, 977_777_778 * 10 ** decimals());
        _mint(_influencers, 2_666_666_667 * 10 ** decimals());
        _mint(_marketing, 8_888_888_889 * 10 ** decimals());

        crowdsale = new Crowdsale(_usdt, msg.sender);
        _mint(address(crowdsale), maxTotalSupply - totalSupply());
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        if (
            !crowdsale.isFinished() &&
            (from != address(crowdsale) || from != owner())
        ) {
            revert("Cant transfer before sale ends");
        }
        super._beforeTokenTransfer(from, to, amount);
    }

    function _mint(address account, uint256 amount) internal override {
        require(
            totalSupply() + amount <= maxTotalSupply,
            "Max total supply reached!"
        );
        super._mint(account, amount);
    }
}
