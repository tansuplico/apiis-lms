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
  const studentMustChangePassword = useStudentStore(
    (s) => s.currentStudent?.mustChangePassword,
  );
  const isAdmin = !!useAdminStore((s) => s.currentAdmin);
  const isFacilitator = !!useFacilitatorStore((s) => s.currentFacilitator);
  const facilitatorMustChangePassword = useFacilitatorStore(
    (s) => s.currentFacilitator?.mustChangePassword,
  );

  if (role === "student" && !isStudent)
    return <Navigate to="/student/login" replace />;
  if (role === "admin" && !isAdmin)
    return <Navigate to="/facilitator-admin/login" replace />;
  if (role === "facilitator" && !isFacilitator)
    return <Navigate to="/facilitator-admin/login" replace />;

  if (role === "student" && studentMustChangePassword)
    return <Navigate to="/change-password" replace />;
  if (role === "facilitator" && facilitatorMustChangePassword)
    return <Navigate to="/facilitator/change-password" replace />;

  return <>{children}</>;
}
