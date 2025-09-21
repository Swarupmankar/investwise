import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute"; // optional
import Login from "@/pages/auth/Login";

// Route wrapper
import Referrals from "@/pages/Referrals";
import Deposit from "@/pages/Deposit";
import Withdraw from "@/pages/Withdraw";
import CreateInvestment from "@/pages/CreateInvestment";
import TransactionHistory from "@/pages/TransactionHistory";
import Instructions from "@/pages/Instructions";
import Notifications from "@/pages/Notifications";
import Broadcasts from "@/pages/Broadcasts";
import Support from "@/pages/Support";
import Profile from "@/pages/Profile";
import InvestmentManagement from "@/pages/InvestmentManagement";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import Layout from "@/components/Layout";
import Register from "@/pages/auth/Register";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="deposit" element={<Deposit />} />
          <Route path="withdraw" element={<Withdraw />} />
          <Route path="create-investment" element={<CreateInvestment />} />
          <Route path="transactions" element={<TransactionHistory />} />
          <Route path="instructions" element={<Instructions />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="broadcasts" element={<Broadcasts />} />
          <Route path="support" element={<Support />} />
          <Route path="profile" element={<Profile />} />
          <Route path="investment/:id" element={<InvestmentManagement />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
