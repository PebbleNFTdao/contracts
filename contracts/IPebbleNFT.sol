/// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface IPebbleNFT {
    error BurnDelayNotPassed(
        uint256 tokenId,
        uint256 mintedAt,
        uint256 burnDelay,
        uint256 blockTimestamp
    );

    error NotOwner(uint256 tokenId, address owner, address msgSender);

    error SignatureExpired(uint256 expiration, uint256 blockTimestamp);

    error NotPermitter(address permitter, address signer);

    event Minted(uint256 tokenId);

    event Burned(uint256 tokenId);

    function batchMint(address to, uint256 amount) external;

    function batchBurn(uint256[] memory tokenIds) external;

    function batchBurnWithPermit(
        uint256[] memory tokenIds,
        uint256 expiration,
        bytes memory signature
    ) external;

    function getOwnedTokens(
        address owner
    ) external view returns (uint256[] memory);
}
