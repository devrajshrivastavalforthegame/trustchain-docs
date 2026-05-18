const crypto = require("crypto");

const key = () => crypto.randomBytes(32).toString("base64");
const secret = () => crypto.randomBytes(48).toString("base64url");

console.log("Copy these into server/.env and client/.env:\n");
console.log(`JWT_SECRET=${secret()}`);
console.log(`ENCRYPTION_MASTER_KEY=${key()}`);
console.log(`LOOKUP_HASH_SECRET=${secret()}`);
const apiWrapperKey = key();
console.log(`API_WRAPPER_KEY=${apiWrapperKey}`);
console.log(`VITE_API_WRAPPER_KEY=${apiWrapperKey}`);
