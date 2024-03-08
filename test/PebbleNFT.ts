import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, Contract } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PebbleNFT", function () {
  let accounts: Signer[];
  let pebbleNFT: Contract;
  let testStone: Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    [owner, addr1, addr2] = accounts;

    const TestStone = await ethers.getContractFactory("TestStone");
    testStone = await TestStone.deploy();
    await testStone.deployed();

    const PebbleNFT = await ethers.getContractFactory("PebbleNFT");
    pebbleNFT = await PebbleNFT.deploy("baseURI", testStone.address, await owner.getAddress());
    await pebbleNFT.deployed();

    // Send some stones to the addr1 and addr2 for testing
    await testStone.transfer(await addr1.getAddress(), ethers.utils.parseEther("100"));
    await testStone.transfer(await addr2.getAddress(), ethers.utils.parseEther("100"));

    // Permit addr1 and addr2 to spend the stones
    await testStone.connect(addr1).approve(pebbleNFT.address, ethers.constants.MaxUint256);
    await testStone.connect(addr2).approve(pebbleNFT.address, ethers.constants.MaxUint256);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await pebbleNFT.permitter()).to.equal(await owner.getAddress());
    });

    it("Should have correct baseURI", async function () {
      expect(await pebbleNFT.baseURI()).to.equal("baseURI");
    });
  });

  describe("Minting", function () {
    it("Should mint a new token", async function () {
      await pebbleNFT.connect(addr1).batchMint(await addr1.getAddress(), 1);
      expect(await pebbleNFT.nextTokenId()).to.equal(1);
    });

    it("Should emit Minted event on mint", async function () {
      await expect(pebbleNFT.connect(addr1).batchMint(await addr1.getAddress(), 1))
        .to.emit(pebbleNFT, "Minted")
        .withArgs(0); // Assuming the event emits the tokenId
    });

    it("Should cost 0.05 stones per pebble", async function () {
      const numberOfPebbles = 5;
      const beforeBalance = await testStone.balanceOf(await addr1.getAddress());
      await pebbleNFT.connect(addr1).batchMint(await addr1.getAddress(), 5);
      const afterBalance = await testStone.balanceOf(await addr1.getAddress());
      expect(beforeBalance.sub(afterBalance)).to.equal(ethers.utils.parseEther("0.05").mul(numberOfPebbles));
    });
  });

  describe("Burning", function () {
    it("Should not burn a locked token", async function () {
      await pebbleNFT.connect(addr1).batchMint(await addr1.getAddress(), 1);
      await expect(pebbleNFT.connect(addr1).batchBurn([0])).to.be.revertedWithCustomError(pebbleNFT, "BurnDelayNotPassed");
    });

    it("Should burn a token", async function () {
      await pebbleNFT.connect(addr1).batchMint(await addr1.getAddress(), 1);
      const TWO_WEEKS_IN_SECS = 14 * 24 * 60 * 60;
      const unlockTime = (await time.latest()) + TWO_WEEKS_IN_SECS;
      await time.increaseTo(unlockTime);
      await expect(pebbleNFT.connect(addr1).batchBurn([0]))
        .to.emit(pebbleNFT, "Burned")
        .withArgs(0);
    });

    it("Should burn a token with signature", async function () {
      await pebbleNFT.connect(addr1).batchMint(await addr1.getAddress(), 3);
      const tokenIds = [0n, 1n, 2n];
      const expiration = BigInt((await time.latest()) + 60);
      const messageHash = ethers.utils.solidityKeccak256(
        ["uint256[]", "address", "uint256"],
        [tokenIds, await addr1.getAddress(), expiration]
      );
      const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));
      await expect(pebbleNFT.connect(addr1).batchBurnWithPermit(tokenIds, expiration, signature))
        .to.emit(pebbleNFT, "Burned")
        .withArgs(0);
    });

    it("Should not burn a locked token if the signature expired", async function () {
      await pebbleNFT.connect(addr1).batchMint(await addr1.getAddress(), 3);
      const tokenIds = [0n, 1n, 2n];
      const expiration = BigInt((await time.latest()) - 10);
      const messageHash = ethers.utils.solidityKeccak256(
        ["uint256[]", "address", "uint256"],
        [tokenIds, await addr1.getAddress(), expiration]
      );
      const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));
      await expect(pebbleNFT.connect(addr1).batchBurnWithPermit(tokenIds, expiration, signature))
        .to.be.revertedWithCustomError(pebbleNFT, "SignatureExpired");
    });

    it("Should return the stones to the caller after burning", async function () {
      const numberOfPebbles = 3;
      await pebbleNFT.connect(addr1).batchMint(await addr1.getAddress(), numberOfPebbles);
      const TWO_WEEKS_IN_SECS = 14 * 24 * 60 * 60;
      const unlockTime = (await time.latest()) + TWO_WEEKS_IN_SECS;
      await time.increaseTo(unlockTime);
      const beforeBalance = await testStone.balanceOf(await addr1.getAddress());
      await pebbleNFT.connect(addr1).batchBurn([0, 1, 2]);
      const afterBalance = await testStone.balanceOf(await addr1.getAddress());
      expect(afterBalance.sub(beforeBalance)).to.equal(ethers.utils.parseEther("0.05").mul(numberOfPebbles));
    });
  });

  describe("ERC721Enumerable", function () {
    it("Should return the token by index", async function () {
      await pebbleNFT.connect(addr1).batchMint(await addr1.getAddress(), 3);
      expect(await pebbleNFT.tokenByIndex(0)).to.equal(0);
    });

    it("Should return the token of owner by index", async function () {
      await pebbleNFT.connect(addr1).batchMint(await addr1.getAddress(), 3);
      expect(await pebbleNFT.tokenOfOwnerByIndex(await addr1.getAddress(), 0)).to.equal(0);
    });

    it("Should return owned tokens", async function () {
      await pebbleNFT.connect(addr1).batchMint(await addr1.getAddress(), 3);
      expect(await pebbleNFT.getOwnedTokens(await addr1.getAddress())).to.deep.equal([0n, 1n, 2n]);
    } );
  });
});
