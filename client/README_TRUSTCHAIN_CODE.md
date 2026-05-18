# TrustChain Docs frontend code

Copy these files into your Vite React + TypeScript project.

## Required packages

```bash
npm install react-router-dom framer-motion lucide-react ethers qrcode.react react-hot-toast recharts
```

## Demo flow

1. Login as Employer and create a request through enrollment number or file/hash upload.
2. Logout and login as Student.
3. Approve or reject the request in the Student Dashboard.
4. Return to Employer. The pending result unlocks as Authentic, Tampered, or Rejected.
5. Login as Issuer to issue credentials with local SHA-256 hashing and mock blockchain transaction metadata.
6. Login as Admin to inspect analytics and reset demo state.
