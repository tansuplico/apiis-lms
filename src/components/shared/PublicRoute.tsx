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
  const studentMustChangePassword = useStudentStore(
    (s) => s.currentStudent?.mustChangePassword,
  );
  const isAdmin = !!useAdminStore((s) => s.currentAdmin);
  const isFacilitator = !!useFacilitatorStore((s) => s.currentFacilitator);
  const facilitatorMustChangePassword = useFacilitatorStore(
    (s) => s.currentFacilitator?.mustChangePassword,
  );

  if (isStudent) {
    return (
      <Navigate
        to={
          studentMustChangePassword ? "/change-password" : "/student/dashboard"
        }
        replace
      />
    );
  }
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  if (isFacilitator) {
    return (
      <Navigate
        to={
          facilitatorMustChangePassword
            ? "/facilitator/change-password"
            : "/facilitator/dashboard"
        }
        replace
      />
    );
  }

  return <>{children}</>;
}
