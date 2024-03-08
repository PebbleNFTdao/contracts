/// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Liquidity {
    address public stoneAddress;

    function _depositStone(uint256 amount) internal {
        IERC20(stoneAddress).transferFrom(msg.sender, address(this), amount);
    }

    function _withdrawStone(uint256 amount) internal {
        IERC20(stoneAddress).transfer(msg.sender, amount);
    }
}
