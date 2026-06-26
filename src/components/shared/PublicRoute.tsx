// src/components/shared/PublicRoute.tsx
import { Navigate } from "react-router-dom";
import { useStudentStore } from "@/stores/useStudentStore";
import { useAdminStore } from "@/stores/useAdminStore";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";

export default function PublicRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const isStudent = useStudentStore((s) => s.isAuthenticated);
  const isAdmin = !!useAdminStore((s) => s.currentAdmin);
  const isFacilitator = !!useFacilitatorStore((s) => s.currentFacilitator);

  if (isStudent) return <Navigate to="/student/dashboard" replace />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  if (isFacilitator) return <Navigate to="/facilitator/dashboard" replace />;

  return <>{children}</>;
}
