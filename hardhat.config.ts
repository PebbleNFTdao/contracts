import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const {SEPOLIA_RPC, PERMITTER_PRIVATE_KEY} = process.env;

if (!SEPOLIA_RPC) {
  throw new Error("SEPOLIA_RPC is not set");
}
if (!PERMITTER_PRIVATE_KEY) {
  throw new Error("PERMITTER_PRIVATE_KEY is not set");
}

const config: HardhatUserConfig = {
  solidity: "0.8.23",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC,
      accounts: [PERMITTER_PRIVATE_KEY]
    }
  }
};

export default config;
