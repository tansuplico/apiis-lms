// src/hooks/useBankViewer.ts
// Who is looking at the question bank, for canModifyBankItem.
import { useAdminStore } from "@/stores/useAdminStore";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";
import type { BankViewer } from "@/utils/bankOwnership";

export function useBankViewer(): BankViewer {
  const adminId = useAdminStore((s) => s.currentAdmin?.id);
  const facilitatorId = useFacilitatorStore((s) => s.currentFacilitator?.id);
  if (adminId !== undefined) return { id: adminId, role: "admin" };
  if (facilitatorId !== undefined) {
    return { id: facilitatorId, role: "facilitator" };
  }
  return null;
}
