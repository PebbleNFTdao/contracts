/// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IPebbleNFT} from "./IPebbleNFT.sol";
import {Liquidity} from "./Liquidity.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract PebbleNFT is ERC721Enumerable, Liquidity, IPebbleNFT {
    using MessageHashUtils for bytes32;

    /// @notice Pebble price in STONE
    uint256 constant PEBBLE_PRICE = 50000000000000000;

    /// @notice Delay before burning a pebble
    uint256 constant BURN_DELAY = 14 days;

    /// @notice baseURI for the NFT
    string public baseURI;

    /// @notice Permitter address for `batchBurnWithPermit`
    address public permitter;

    /// @notice counter for the next token id
    uint256 public nextTokenId = 0;

    /// @notice mapping from token id to minted timestamp
    mapping(uint256 => uint256) mintedAt;

    constructor(
        string memory baseURI_,
        address stoneAddress_,
        address permitter_
    ) ERC721("PebbleNFT", "PNFT") {
        baseURI = baseURI_;
        stoneAddress = stoneAddress_;
        permitter = permitter_;
    }

    /**
     * @dev Override for ERC721 to use the baseURI.
     */
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    /**
     * @notice Set a new baseURI for the NFT.
     * @param baseURI_ the new baseURI
     */
    function setBaseURI(string memory baseURI_) external {
        if (msg.sender != permitter) {
            revert NotPermitter(permitter, msg.sender);
        }
        baseURI = baseURI_;
    }

    /**
     * @notice Mint a pebble NFT to the given address.
     * The timestamp of the minting is stored.
     * @param to the address to mint the pebble to
     */
    function _mint(address to) internal {
        uint256 tokenId = nextTokenId;
        _mint(to, tokenId);
        mintedAt[tokenId] = block.timestamp;
        emit Minted(tokenId);
        nextTokenId++;
    }

    /**
     * @notice Burn a pebble NFT.
     * The delay is enforced unless `skipDelay` is true.
     * @param tokenId the id of the pebble to burn
     * @param skipDelay whether to skip the delay
     */
    function _burn(uint256 tokenId, bool skipDelay) internal {
        if (!skipDelay && block.timestamp < mintedAt[tokenId] + BURN_DELAY) {
            revert BurnDelayNotPassed(
                tokenId,
                mintedAt[tokenId],
                BURN_DELAY,
                block.timestamp
            );
        }
        _burn(tokenId);
        emit Burned(tokenId);
    }

    /**
     * @notice Mint pebble NFTs to the given address and deposit
     * the corresponding amount of STONE.
     * @param to the address to mint the pebbles to
     * @param number the number of pebbles to mint
     */
    function batchMint(address to, uint256 number) external {
        _depositStone(number * PEBBLE_PRICE);
        for (uint256 i = 0; i < number; i++) {
            _mint(to);
        }
    }

    /**
     * @notice Burn pebble NFTs and withdraw the corresponding
     * amount of STONE.
     * @param tokenIds the ids of the pebbles to burn
     */
    function batchBurn(uint256[] memory tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (ownerOf(tokenIds[i]) != msg.sender) {
                revert NotOwner(tokenIds[i], ownerOf(tokenIds[i]), msg.sender);
            }
            _burn(tokenIds[i], false);
        }
        _withdrawStone(tokenIds.length * PEBBLE_PRICE);
    }

    /**
     * @notice Burn pebble NFTs and withdraw the corresponding
     * amount of STONE without enforcing the delay for each pebble.
     * The signature must be produced by the permitter.
     * @param tokenIds the ids of the pebbles to burn
     * @param expiration the expiration timestamp of the signature
     * @param signature the signature produced by the permitter
     */
    function batchBurnWithPermit(
        uint256[] memory tokenIds,
        uint256 expiration,
        bytes memory signature
    ) external {
        if (expiration < block.timestamp) {
            revert SignatureExpired(expiration, block.timestamp);
        }
        bytes32 messageHash = keccak256(
            abi.encodePacked(tokenIds, msg.sender, expiration)
        );
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        if (signer != permitter) {
            revert NotPermitter(permitter, signer);
        }
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (ownerOf(tokenIds[i]) != msg.sender) {
                revert NotOwner(tokenIds[i], ownerOf(tokenIds[i]), msg.sender);
            }
            _burn(tokenIds[i], true);
        }
        _withdrawStone(tokenIds.length * PEBBLE_PRICE);
    }

    /**
     * @notice Get the ids of the pebbles owned by the given address.
     * @param owner the address to query
     * @return tokenIds ids of the pebbles owned by the given address
     */
    function getOwnedTokens(
        address owner
    ) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        if (tokenCount == 0) {
            return new uint256[](0);
        } else {
            uint256[] memory result = new uint256[](tokenCount);
            for (uint256 i = 0; i < tokenCount; i++) {
                result[i] = tokenOfOwnerByIndex(owner, i);
            }
            return result;
        }
    }
}
