import { useMemo, useState } from "react";
import { BrowserProvider } from "ethers";
import toast from "react-hot-toast";

export interface BlockchainState {
  walletAddress: string;
  networkName: string;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<string>;
  issueCredentialOnChain: (hash: string) => Promise<{ txHash: string; blockNumber: number }>;
}

export const useBlockchain = (): BlockchainState => {
  const [walletAddress, setWalletAddress] = useState("");
  const [networkName, setNetworkName] = useState("Not connected");
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask/EIP-1193 wallet is required. No demo wallet is generated in real mode.");
      }

      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setWalletAddress(address);
      setNetworkName(network.name === "unknown" ? `Chain ${network.chainId.toString()}` : network.name);
      toast.success("Wallet connected");
      return address;
    } finally {
      setIsConnecting(false);
    }
  };

  const issueCredentialOnChain = async (_hash: string) => {
    throw new Error("Frontend mock blockchain issuance is disabled. The backend anchors hashes through polygonService.js after upload.");
  };

  return useMemo(
    () => ({
      walletAddress,
      networkName,
      isConnected: Boolean(walletAddress),
      isConnecting,
      connectWallet,
      issueCredentialOnChain,
    }),
    [walletAddress, networkName, isConnecting],
  );
};
