import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

const PublicRoute: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // If user is authenticated, send them to dashboard (or desired route)
  return isAuthenticated && token ? <Navigate to="/" replace /> : <Outlet />;
};

export default PublicRoute;
