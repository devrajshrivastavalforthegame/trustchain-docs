try {
  require("dotenv").config({ path: require("path").join(__dirname, "server", ".env") });
} catch (_) {
  // dotenv is optional for Hardhat-only installs. Environment variables can also be exported manually.
}

require("@nomiclabs/hardhat-ethers");

const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || "";
const amoyRpc = process.env.POLYGON_AMOY_RPC_URL || process.env.BLOCKCHAIN_RPC_URL || "";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: process.env.LOCALHOST_RPC_URL || "http://127.0.0.1:8545",
      chainId: 31337,
    },
    amoy: {
      url: amoyRpc || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: /^0x[0-9a-fA-F]{64}$/.test(privateKey) ? [privateKey] : [],
    },
  },
};
