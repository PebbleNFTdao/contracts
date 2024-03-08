/// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestStone is ERC20 {
    constructor() ERC20("Stone", "STONE") {
        _mint(msg.sender, 1000000000000000000000000);
    }
}
