import { DemoAccount, User, UserRole } from "../types/domain";

export const demoAccounts: DemoAccount[] = [
  {
    role: "student",
    label: "Student",
    email: "alex.jain@student.edu",
    password: "student123",
    name: "Alex Jain",
    organization: "National Institute of Digital Learning",
  },
  {
    role: "employer",
    label: "Employer",
    email: "verify@acme.com",
    password: "employer123",
    name: "Maya Rao",
    organization: "Acme Talent Verification",
  },
  {
    role: "issuer",
    label: "Issuer",
    email: "registrar@university.edu",
    password: "issuer123",
    name: "Dr. Kavita Menon",
    organization: "National Institute of Digital Learning",
  },
  {
    role: "admin",
    label: "Admin",
    email: "admin@trustchain.edu",
    password: "admin123",
    name: "TrustChain Operator",
    organization: "TrustChain Docs",
  },
];

const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export interface LoginPayload {
  email: string;
  password: string;
  role: UserRole;
}

export const authService = {
  async login(payload: LoginPayload): Promise<User> {
    await wait(450);

    const account = demoAccounts.find(
      (item) =>
        item.email.toLowerCase() === payload.email.toLowerCase() &&
        item.password === payload.password &&
        item.role === payload.role,
    );

    if (!account) {
      throw new Error("Invalid demo credentials for the selected role.");
    }

    return {
      id: `user_${account.role}`,
      name: account.name,
      email: account.email,
      role: account.role as UserRole,
      organization: account.organization,
    };
  },
};
