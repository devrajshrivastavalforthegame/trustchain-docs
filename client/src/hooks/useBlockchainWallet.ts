import { useState } from "react";
import toast from "react-hot-toast";

export interface WalletState {
  address: string;
  connected: boolean;
  connecting: boolean;
  network: string;
}

const getChainName = (chainId: string): string => {
  const known: Record<string, string> = {
    "0x1": "Ethereum Mainnet",
    "0x89": "Polygon",
    "0x13882": "Polygon Amoy",
    "0x7a69": "Hardhat Local"
  };
  return known[chainId] ?? chainId;
};

export const useBlockchainWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: "",
    connected: false,
    connecting: false,
    network: "Not connected"
  });

  const connect = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask is not installed in this browser.");
      return;
    }
    setWallet((current) => ({ ...current, connecting: true }));
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const chainId = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      setWallet({
        address: accounts[0] ?? "",
        connected: Boolean(accounts[0]),
        connecting: false,
        network: getChainName(chainId)
      });
      toast.success("Wallet connected.");
    } catch (error) {
      setWallet((current) => ({ ...current, connecting: false }));
      toast.error("Wallet connection cancelled.");
    }
  };

  return { wallet, connect };
};
