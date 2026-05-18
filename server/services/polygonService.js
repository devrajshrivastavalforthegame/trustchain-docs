const ethers = require("ethers");

const abi = [
  "function issueDocument(bytes32 documentHash,address studentWallet,bytes32 studentIdHash,string metadataURI) external",
  "function reissueDocument(bytes32 oldHash,bytes32 newHash,string metadataURI) external",
  "function verifyDocument(bytes32 documentHash) external view returns(bool,bool,uint256,uint256,address,address,bytes32,bytes32,bytes32,uint8,string)",
];

let contract;

function cleanHash(hash) {
  const clean = String(hash || "").replace(/^0x/, "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error("Document hash must be a 64-character SHA-256 hex string.");
  }
  return clean;
}

function toBytes32Hash(hash) {
  return `0x${cleanHash(hash)}`;
}

function getBlockchainConfig() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "";
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || "";
  const contractAddress = process.env.CONTRACT_ADDRESS || "";
  const configured = Boolean(
    rpcUrl &&
    privateKey &&
    contractAddress &&
    /^0x[0-9a-fA-F]{64}$/.test(privateKey) &&
    ethers.isAddress(contractAddress)
  );

  return { rpcUrl, privateKey, contractAddress, configured };
}

function getContract() {
  const config = getBlockchainConfig();
  if (!config.configured) {
    throw new Error(
      "Blockchain is not configured. Set BLOCKCHAIN_RPC_URL, BLOCKCHAIN_PRIVATE_KEY, and CONTRACT_ADDRESS."
    );
  }

  if (!contract) {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);
    contract = new ethers.Contract(config.contractAddress, abi, wallet);
  }

  return contract;
}

function blockchainReceipt(status, overrides = {}) {
  return {
    success: status === "confirmed",
    status,
    txHash: "",
    blockNumber: "",
    network: process.env.BLOCKCHAIN_NETWORK || "unknown",
    error: "",
    ...overrides,
  };
}

async function waitForReceipt(tx) {
  const receipt = await tx.wait();
  return blockchainReceipt("confirmed", {
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber ? String(receipt.blockNumber) : "",
    gasUsed: receipt?.gasUsed ? receipt.gasUsed.toString() : "",
  });
}

const storeHashOnBlockchain = async (hash, options = {}) => {
  try {
    const config = getBlockchainConfig();
    if (!config.configured) {
      return blockchainReceipt("unconfigured", {
        error: "Blockchain anchoring skipped: missing RPC URL, private key, or deployed contract address.",
      });
    }

    const studentWallet = options.studentWallet && ethers.isAddress(options.studentWallet)
      ? options.studentWallet
      : ethers.ZeroAddress;
    const studentIdHash = options.studentIdHash ? toBytes32Hash(options.studentIdHash) : ethers.ZeroHash;

    if (studentWallet === ethers.ZeroAddress && studentIdHash === ethers.ZeroHash) {
      return blockchainReceipt("invalid-input", {
        error: "Smart contract issueDocument requires either a student wallet or a non-zero studentIdHash.",
      });
    }

    const tx = await getContract().issueDocument(
      toBytes32Hash(hash),
      studentWallet,
      studentIdHash,
      options.metadataURI || ""
    );

    return await waitForReceipt(tx);
  } catch (error) {
    console.log("Blockchain anchoring failed:", error.message);
    return blockchainReceipt("failed", { error: error.message });
  }
};

const reissueHashOnBlockchain = async (oldHash, newHash, metadataURI = "") => {
  try {
    const config = getBlockchainConfig();
    if (!config.configured) {
      return blockchainReceipt("unconfigured", {
        error: "Blockchain reissue skipped: missing RPC URL, private key, or deployed contract address.",
      });
    }

    const tx = await getContract().reissueDocument(toBytes32Hash(oldHash), toBytes32Hash(newHash), metadataURI || "");
    return await waitForReceipt(tx);
  } catch (error) {
    console.log("Blockchain reissue failed:", error.message);
    return blockchainReceipt("failed", { error: error.message });
  }
};

const verifyHashOnBlockchain = async (hash) => {
  try {
    if (!getBlockchainConfig().configured) return [false, 0, ethers.ZeroAddress, false, "unconfigured"];
    const result = await getContract().verifyDocument(toBytes32Hash(hash));
    // exists, active, timestamp, version, issuer, studentWallet, previousHash, supersededBy, studentIdHash, status, metadataURI
    return [Boolean(result[0] && result[1]), result[2] || 0, result[4] || ethers.ZeroAddress, Boolean(result[1]), String(result[9])];
  } catch (error) {
    console.log("Blockchain verify failed; using DB proof only:", error.message);
    return [false, 0, ethers.ZeroAddress, false, "failed"];
  }
};

module.exports = {
  storeHashOnBlockchain,
  verifyHashOnBlockchain,
  reissueHashOnBlockchain,
  toBytes32Hash,
  getBlockchainConfig,
};
