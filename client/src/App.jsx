import { useState } from "react";
import { ethers } from "ethers";

import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI
} from "./contracts";

function App() {

  const [hash, setHash] = useState("");
  const [walletAddress, setWalletAddress] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [verifyResult, setVerifyResult] = useState("");
  const connectWallet = async () => {

    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    await provider.send(
      "eth_requestAccounts",
      []
    );

    const signer = await provider.getSigner();

    const address =
      await signer.getAddress();

    setWalletAddress(address);
  };

  

  const generateHash = async (file) => {

    const buffer =
      await file.arrayBuffer();

    const hashBuffer =
      await crypto.subtle.digest(
        "SHA-256",
        buffer
      );

    const hashArray = Array.from(
      new Uint8Array(hashBuffer)
    );

    const hashHex = hashArray
      .map((b) =>
        b.toString(16).padStart(2, "0")
      )
      .join("");

    setHash(hashHex);
  };

  const handleFileChange = (e) => {

    const file = e.target.files[0];

    if (file) {
      generateHash(file);
    }
  };

  const storeHash = async () => {

    try {

      if (!hash) {
        alert("Generate hash first");
        return;
      }

      const provider =
        new ethers.BrowserProvider(window.ethereum);

      const signer =
        await provider.getSigner();

      const contract =
        new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );

      const tx =
        await contract.uploadDocument(
          hash,
          "Sample-IPFS-CID"
        );

      await tx.wait();

      setStatus(
        "Hash stored successfully on blockchain!"
      );

    } catch (error) {

      console.error(error);

      setStatus(
        "Transaction failed"
      );
    }
  };
  const verifyHash = async () => {

  try {

    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }

    const provider = new ethers.BrowserProvider(
      window.ethereum
    );

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );

    const result =
      await contract.verifyDocument(hash);

    if (result) {
      setVerifyResult(
        "✅ Document Exists on Blockchain"
      );
    } else {
      setVerifyResult(
        "❌ Document NOT Found"
      );
    }

  } catch (error) {

    console.error(error);

    setVerifyResult(
      "Verification Failed"
    );
  }
};

  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <h1>TrustChain Docs</h1>

      <h2>
        Decentralized Document Verification
      </h2>

      <button
        onClick={connectWallet}
        style={{
          padding: "10px 20px",
          marginBottom: "20px",
          cursor: "pointer",
        }}
      >
        Connect MetaMask
      </button>

      {walletAddress && (
        <p>
          Wallet Connected:
          <br />
          {walletAddress}
        </p>
      )}

      <input
        type="file"
        onChange={handleFileChange}
      />

      {hash && (
        <div style={{ marginTop: "20px" }}>
          <h3>
            Generated SHA-256 Hash:
          </h3>

          <p
            style={{
              wordBreak: "break-all",
              background: "#f3f3f3",
              padding: "10px",
            }}
          >
            {hash}
          </p>

          <button
            onClick={storeHash}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Store on Blockchain
          </button>
          <button onClick={verifyHash}>
            Verify Document
          </button>
          <h2>{verifyResult}</h2>
        </div>
      )}

      {status && (
        <h3 style={{ marginTop: "20px" }}>
          {status}
        </h3>
      )}
    </div>
  );
}

export default App;