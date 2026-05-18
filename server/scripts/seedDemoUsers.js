require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const users = [
  { name: "Demo Issuer", email: "issuer@trustchain.local", password: "Password@123", role: "issuer" },
  { name: "Demo Student", email: "student@trustchain.local", password: "Password@123", role: "student" },
  { name: "Demo Employer", email: "employer@trustchain.local", password: "Password@123", role: "employer" },
  { name: "Demo Developer", email: "developer@trustchain.local", password: "Password@123", role: "developer" },
];

async function main() {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await pool.query(
      `INSERT INTO users(name, email, password, role)
       VALUES($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password, role = EXCLUDED.role`,
      [user.name, user.email, passwordHash, user.role]
    );
  }

  console.log("Seeded demo users. Password for all: Password@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
