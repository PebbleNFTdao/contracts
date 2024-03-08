import { ethers } from "hardhat";


const permitterPrivateKey = process.env.PERMITTER_PRIVATE_KEY;
if (!permitterPrivateKey) {
  throw new Error("PERMITTER_PRIVATE_KEY is not set");
}
const baseURI = process.env.BASE_URI;
let stoneAddress: string | undefined = process.env.STONE_ADDRESS;

async function main() {
  if (!baseURI) {
    throw new Error("BASE_URI is not set");
  }
  if (!stoneAddress){
    const stoneFactory = await ethers.getContractFactory("TestStone");
    const stone = await stoneFactory.deploy();
    await stone.deployed();
    stoneAddress = stone.address;
  }
  const permitter = (await ethers.getSigners())[0];
  const pebbleNFTFactory = await ethers.getContractFactory("PebbleNFT");
  const pebbleNFT = await pebbleNFTFactory.deploy(baseURI, stoneAddress, permitter.address);
  await pebbleNFT.deployed();
  console.log("stoneAddress:", stoneAddress);
  console.log("PebbleNFT Address:", pebbleNFT.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
