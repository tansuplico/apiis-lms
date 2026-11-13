// src/utils/bankOwnership.ts
// Same rule as the server's backend/src/utils/bankOwnership.ts: any admin,
// or the item's creator (matching id AND role, since admins and
// facilitators are separate tables), may change a bank collection or bank
// question. Items with no recorded creator are admin-only. The server
// enforces this; the app uses it only to hide what you can't change.

export type BankViewer = { id: number; role: "admin" | "facilitator" } | null;

export function canModifyBankItem(
  viewer: BankViewer,
  item: {
    createdById: number | null;
    createdByRole: "admin" | "facilitator" | null;
  },
): boolean {
  if (!viewer) return false;
  if (viewer.role === "admin") return true;
  return (
    item.createdById !== null &&
    item.createdById === viewer.id &&
    item.createdByRole === viewer.role
  );
}
