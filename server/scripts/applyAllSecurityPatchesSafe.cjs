#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverDir = path.join(projectRoot, "server");
const appPath = path.join(serverDir, "app.js");
const envExamplePath = path.join(serverDir, ".env.example");
const packagePath = path.join(serverDir, "package.json");
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
const backupDir = path.join(serverDir, ".patch-backups", `security-safe-${timestamp}`);

function exists(filePath) {
  return fs.existsSync(filePath);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function backup(filePath) {
  if (!exists(filePath)) return;
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(filePath, path.join(backupDir, path.basename(filePath)));
}

function ensureContains(content, anchor, insertion) {
  if (content.includes(insertion.trim())) return content;
  const index = content.indexOf(anchor);
  if (index === -1) return `${insertion}\n${content}`;
  const end = index + anchor.length;
  return `${content.slice(0, end)}\n${insertion}${content.slice(end)}`;
}

function replaceFirst(content, regex, replacement) {
  if (regex.test(content)) return content.replace(regex, replacement);
  return content;
}

function patchAppJs() {
  if (!exists(appPath)) {
    throw new Error(`Cannot find ${appPath}. Run this installer from the TrustChain-Docs project root.`);
  }

  backup(appPath);
  let content = read(appPath);

  const imports = `const trustchainSecurityCors = require("./middleware/trustchainSecurityCors");
const { generalLimiter, authLimiter, uploadLimiter, verificationLimiter, aiLimiter } = require("./middleware/trustchainRateLimiter");
const { trustchainCryptoWrapper } = require("./middleware/trustchainCryptoWrapper");
const securityDemoRoutes = require("./routes/securityDemoRoutes");`;

  if (!content.includes("trustchainSecurityCors")) {
    if (content.includes('const rateLimit = require("express-rate-limit");')) {
      content = ensureContains(content, 'const rateLimit = require("express-rate-limit");', imports);
    } else if (content.includes('const helmet = require("helmet");')) {
      content = ensureContains(content, 'const helmet = require("helmet");', imports);
    } else {
      content = `${imports}\n${content}`;
    }
  }

  const flags = `
function trustchainFlag(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") return defaultValue;
  return String(value).toLowerCase() === "true";
}
const trustchainRateLimitEnabled = trustchainFlag("ENABLE_RATE_LIMIT", true);
const trustchainSecureCorsEnabled = trustchainFlag("ENABLE_SECURE_CORS", true);
const trustchainNoRateLimit = (_req, _res, next) => next();
`;

  if (!content.includes("trustchainFlag(")) {
    content = replaceFirst(content, /const app = express\(\);\s*/, `const app = express();${flags}\n`);
  }

  if (!content.includes("app.use(trustchainSecureCorsEnabled")) {
    content = content.replace(
      /app\.use\(cors\(\{\s*origin:\s*process\.env\.CLIENT_ORIGIN\s*\|\|\s*["']http:\/\/localhost:5173["'],\s*credentials:\s*true\s*\}\)\);/,
      `app.use(trustchainSecureCorsEnabled ? trustchainSecurityCors : cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));`
    );
  }

  if (!content.includes("trustchainRateLimitEnabled ? generalLimiter")) {
    content = content.replace(
      /app\.use\(rateLimit\(\{\s*windowMs:\s*15 \* 60 \* 1000,\s*max:\s*\d+\s*\}\)\);\s*/,
      `app.use("/api", trustchainRateLimitEnabled ? generalLimiter : trustchainNoRateLimit);\n`
    );
  }

  if (!content.includes("app.use(trustchainCryptoWrapper);")) {
    const bodyParserAnchor = "app.use(express.urlencoded({ extended: true, limit: \"1mb\" }));";
    if (content.includes(bodyParserAnchor)) {
      content = ensureContains(content, bodyParserAnchor, "app.use(trustchainCryptoWrapper);");
    } else if (content.includes("app.use(express.json")) {
      content = content.replace(/app\.use\(express\.json\([^\n]+\);/, (match) => `${match}\napp.use(trustchainCryptoWrapper);`);
    }
  }

  const routeReplacements = [
    [/app\.use\(["']\/api\/auth["'],\s*authRoutes\);/, `app.use("/api/auth", trustchainRateLimitEnabled ? authLimiter : trustchainNoRateLimit, authRoutes);`],
    [/app\.use\(["']\/api\/issuer["'],\s*issuerRoutes\);/, `app.use("/api/issuer", trustchainRateLimitEnabled ? uploadLimiter : trustchainNoRateLimit, issuerRoutes);`],
    [/app\.use\(["']\/api\/verification["'],\s*verificationRoutes\);/, `app.use("/api/verification", trustchainRateLimitEnabled ? verificationLimiter : trustchainNoRateLimit, verificationRoutes);`],
    [/app\.use\(["']\/api\/ai["'],\s*aiRoutes\);/, `app.use("/api/ai", trustchainRateLimitEnabled ? aiLimiter : trustchainNoRateLimit, aiRoutes);`]
  ];

  for (const [regex, replacement] of routeReplacements) {
    if (!content.includes(replacement)) {
      content = content.replace(regex, replacement);
    }
  }

  if (!content.includes('app.use("/api/security", securityDemoRoutes);')) {
    const routeAnchorCandidates = [
      'app.use("/api/ai", trustchainRateLimitEnabled ? aiLimiter : trustchainNoRateLimit, aiRoutes);',
      'app.use("/api/ai", aiRoutes);',
      'app.use("/api/developer", developerRoutes);'
    ];
    let inserted = false;
    for (const anchor of routeAnchorCandidates) {
      if (content.includes(anchor)) {
        content = ensureContains(content, anchor, 'app.use("/api/security", securityDemoRoutes);');
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      content += '\napp.use("/api/security", securityDemoRoutes);\n';
    }
  }

  write(appPath, content);
}

function patchEnvExample() {
  if (!exists(envExamplePath)) return;
  backup(envExamplePath);
  let content = read(envExamplePath);

  const additionsPath = path.join(serverDir, ".env.example.security-additions");
  const additions = exists(additionsPath) ? read(additionsPath) : "";

  content = content.replace(/API_RESPONSE_ENCRYPTION\s*=\s*true/g, "API_RESPONSE_ENCRYPTION=false");
  content = content.replace(/JWT_EXPIRY\s*=\s*1d/g, "JWT_EXPIRY=15m");

  if (!content.includes("ENABLE_RBAC=")) {
    content += `\n\n${additions}\n`;
  }

  write(envExamplePath, content);
}

function patchPackageJson() {
  if (!exists(packagePath)) return;
  backup(packagePath);
  const pkg = JSON.parse(read(packagePath));
  pkg.dependencies = pkg.dependencies || {};

  const required = {
    cors: "^2.8.6",
    "express-rate-limit": "^7.5.0",
    jsonwebtoken: "^9.0.3"
  };

  let changed = false;
  for (const [name, version] of Object.entries(required)) {
    if (!pkg.dependencies[name] && !(pkg.devDependencies && pkg.devDependencies[name])) {
      pkg.dependencies[name] = version;
      changed = true;
    }
  }

  if (changed) write(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function main() {
  console.log("Applying TrustChain safe combined security patch...");
  patchAppJs();
  patchEnvExample();
  patchPackageJson();
  console.log("Done. Backups saved to:");
  console.log(backupDir);
  console.log("\nNext commands:");
  console.log("  cd server");
  console.log("  npm install");
  console.log("  npm run dev");
}

try {
  main();
} catch (error) {
  console.error("Patch installer failed:", error.message);
  process.exit(1);
}
