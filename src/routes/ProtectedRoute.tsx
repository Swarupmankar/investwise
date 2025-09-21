// src/ProtectedRoute.tsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

/**
 * ProtectedRoute
 * - Requires both Redux auth.isAuthenticated === true AND a token in localStorage.
 * - While auth.isLoading is true we render null (avoid flashing protected UI).
 * - If not authenticated, navigate to /login and preserve attempted location in state.
 */
const ProtectedRoute: React.FC = () => {
  const location = useLocation();

  // Read from Redux store (source of truth)
  const { isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth
  );

  // Fallback check: sometimes store isn't hydrated but token exists in localStorage
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Wait for auth to finish loading (optional UX: show spinner instead)
  if (isLoading) {
    return null; // or return <Spinner /> component if you have one
  }

  const allowed = Boolean(isAuthenticated && token);

  return allowed ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
};

export default ProtectedRoute;
