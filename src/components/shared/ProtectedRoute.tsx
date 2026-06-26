// src/components/shared/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useStudentStore } from "@/stores/useStudentStore";
import { useAdminStore } from "@/stores/useAdminStore";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";

interface ProtectedRouteProps {
  role: "student" | "admin" | "facilitator";
  children: React.ReactNode;
}

export default function ProtectedRoute({
  role,
  children,
}: ProtectedRouteProps) {
  const isStudent = useStudentStore((s) => s.isAuthenticated);
  const isAdmin = !!useAdminStore((s) => s.currentAdmin);
  const isFacilitator = !!useFacilitatorStore((s) => s.currentFacilitator);

  if (role === "student" && !isStudent)
    return <Navigate to="/student/login" replace />;
  if (role === "admin" && !isAdmin)
    return <Navigate to="/facilitator-admin/login" replace />;
  if (role === "facilitator" && !isFacilitator)
    return <Navigate to="/facilitator-admin/login" replace />;

  return <>{children}</>;
}
