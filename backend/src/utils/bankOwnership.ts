// src/utils/bankOwnership.ts
// Who may change a quiz bank collection or bank question: any admin, or
// the person who created it. Admins and facilitators live in separate
// tables (admin #1 and facilitator #1 are different people), so the
// creator must match on both id and role. Rows with no recorded creator
// (created before ownership was tracked) are admin-only.

export type BankActor = { id: number; role: string };

export type BankOwnerRow = {
  created_by_id: number | null;
  created_by_role: string | null;
};

export const COLLECTION_FORBIDDEN =
  "Only the collection's creator or an admin can change it.";
export const QUESTION_FORBIDDEN =
  "Only the question's creator or an admin can change it.";
export const ADD_TO_COLLECTION_FORBIDDEN =
  "You can only add questions to your own collections.";

export function canModifyBankItem(
  actor: BankActor,
  owner: BankOwnerRow,
): boolean {
  if (actor.role === "admin") return true;
  return (
    owner.created_by_id !== null &&
    Number(owner.created_by_id) === actor.id &&
    owner.created_by_role === actor.role
  );
}
