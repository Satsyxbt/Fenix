// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20Faucet is ERC20, Ownable {
    error FaucetCooldown();
    mapping(address => uint256) public lastFaucetTime;
    uint8 internal _decimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function faucet() external {
        if (block.timestamp < lastFaucetTime[msg.sender] + 3600) {
            revert FaucetCooldown();
        }
        _mint(msg.sender, 1000 * (10 ** _decimals));
    }

    function mint(address to_, uint256 amount_) external onlyOwner {
        _mint(to_, amount_);
    }
}
