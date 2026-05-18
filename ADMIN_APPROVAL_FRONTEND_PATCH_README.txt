TrustChain Docs — Admin Approval Frontend Patch

What this patch adds:
1. New frontend route: /admin
2. New page: client/src/pages/AdminApprovalPage.tsx
3. New service: client/src/services/adminApprovalService.ts
4. Sidebar link: Admin Approval
5. Navbar link: Admin
6. Register page now handles pending approvals without expecting a token.
7. User type now supports admin role and status.

Expected backend APIs:
GET   /api/admin/users/pending
PATCH /api/admin/users/:userId/approve
PATCH /api/admin/users/:userId/reject

You already tested these APIs by CMD, so this frontend page uses the same endpoints.

Install:
1. Close frontend dev server.
2. Extract this ZIP directly inside C:\TrustChain-Docs.
3. Run:
   cd C:\TrustChain-Docs\client
   npm run dev
4. Login as developer@trustchain.local / Password@123
5. Open:
   http://localhost:5173/admin

Demo flow:
1. Register an issuer/employer account.
2. It should show pending approval and redirect to login.
3. Login as developer.
4. Open Admin Approval from the sidebar.
5. Approve or reject the pending account.
6. Approved users can login; rejected users cannot.
