import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { AppShell } from "./components/AppShell";
import { useAuth } from "./context/AuthContext";
import { TrustChainProvider } from "./context/TrustChainContext";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { IssuerDashboard } from "./pages/IssuerDashboard";
import { StudentDashboard } from "./pages/StudentDashboard";
import { EmployerVerify } from "./pages/EmployerVerify";
import { PublicVerify } from "./pages/PublicVerify";
import { DeveloperDashboard } from "./pages/DeveloperDashboard";
import { AdminApprovalPage } from "./pages/AdminApprovalPage";
import { Notifications } from "./pages/Notifications";
import type { UserRole } from "./types/domain";
import type {ReactElement} from "react";

const roleHome = (role: UserRole) => (role === "issuer" ? "/issuer" : role === "student" ? "/student" : role === "employer" ? "/employer" : role === "admin" ? "/admin" : "/developer");

const ProtectedRoute = ({ roles, children }: { roles?: UserRole[]; children: ReactElement }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return children;
};

const AnimatedPage = ({ children }: { children: ReactElement }) => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.22 }}>
    {children}
  </motion.div>
);

export const App = () => {
  const location = useLocation();
  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: "#020617", color: "#fff", border: "1px solid rgba(255,255,255,.12)" } }} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify/:id" element={<PublicVerify />} />
          <Route
            element={
              <ProtectedRoute>
                <TrustChainProvider>
                  <AppShell />
                </TrustChainProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/issuer" element={<ProtectedRoute roles={["issuer", "developer"]}><AnimatedPage><IssuerDashboard /></AnimatedPage></ProtectedRoute>} />
            <Route path="/student" element={<ProtectedRoute roles={["student", "developer"]}><AnimatedPage><StudentDashboard /></AnimatedPage></ProtectedRoute>} />
            <Route path="/employer" element={<ProtectedRoute roles={["employer", "developer"]}><AnimatedPage><EmployerVerify /></AnimatedPage></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute roles={["student", "developer"]}><AnimatedPage><Notifications /></AnimatedPage></ProtectedRoute>} />
            <Route path="/developer" element={<ProtectedRoute roles={["developer"]}><AnimatedPage><DeveloperDashboard /></AnimatedPage></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={["developer", "admin"]}><AnimatedPage><AdminApprovalPage /></AnimatedPage></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
};
