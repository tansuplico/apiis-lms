// src/components/admins/facilitators/EditFacilitatorModal.tsx
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { AccountStatus, Facilitator } from "@/types/types";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface Props {
  facilitator: Facilitator | null;
  onClose: () => void;
  onUpdate: (id: number, data: Partial<Facilitator>) => Promise<void>;
  checkEmailExists: (email: string, excludeId: number) => boolean;
}

export default function EditFacilitatorModal({
  facilitator,
  onClose,
  onUpdate,
  checkEmailExists,
}: Props) {
  // ── Store
  const online = useOnlineStatus();

  // ── State: editable facilitator
  const [facilitatorToEdit, setFacilitatorToEdit] =
    useState<Facilitator | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // ── Effects: initialise form on open
  useEffect(() => {
    if (facilitator) {
      setFacilitatorToEdit({ ...facilitator });
    }
  }, [facilitator]);

  // ── Guard: no facilitator to edit
  if (!facilitatorToEdit) return null;

  // ── Handlers: save changes
  const saveEdit = async () => {
    if (!facilitatorToEdit) return;

    if (!facilitatorToEdit.firstName.trim()) {
      toast.error("First name is required.");
      return;
    }
    if (!facilitatorToEdit.lastName.trim()) {
      toast.error("Last name is required.");
      return;
    }
    if (
      facilitatorToEdit.firstName.trim().length > 50 ||
      facilitatorToEdit.lastName.trim().length > 50
    ) {
      toast.error("Names cannot exceed 50 characters.");
      return;
    }

    if (
      checkEmailExists(facilitatorToEdit.email.trim(), facilitatorToEdit.id)
    ) {
      toast.error("Email already exists for another facilitator.");
      return;
    }

    setIsEditing(true);
    try {
      await onUpdate(facilitatorToEdit.id, facilitatorToEdit);
      toast.success(
        `${facilitatorToEdit.firstName} ${facilitatorToEdit.lastName}'s info updated.`,
        { position: "bottom-right" },
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update facilitator.");
    } finally {
      setIsEditing(false);
    }
  };

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Edit Facilitator
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                First Name
              </label>
              <input
                type="text"
                value={facilitatorToEdit.firstName}
                onChange={(e) =>
                  setFacilitatorToEdit({
                    ...facilitatorToEdit,
                    firstName: e.target.value,
                  })
                }
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                value={facilitatorToEdit.lastName}
                onChange={(e) =>
                  setFacilitatorToEdit({
                    ...facilitatorToEdit,
                    lastName: e.target.value,
                  })
                }
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Middle Name{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={facilitatorToEdit.middleName ?? ""}
              onChange={(e) =>
                setFacilitatorToEdit({
                  ...facilitatorToEdit,
                  middleName: e.target.value || undefined,
                })
              }
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Middle name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Account Status
            </label>
            <select
              value={facilitatorToEdit.status}
              onChange={(e) =>
                setFacilitatorToEdit({
                  ...facilitatorToEdit,
                  status: e.target.value as AccountStatus,
                })
              }
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {facilitatorToEdit.status === "banned"
                ? "Banned facilitators cannot log in or access the application."
                : facilitatorToEdit.status === "inactive"
                  ? "Inactive facilitators cannot log in until reactivated."
                  : "Facilitator has full access to the application."}
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={saveEdit}
            disabled={isEditing || !online}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium cursor-pointer transition-colors"
          >
            {isEditing ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            disabled={isEditing}
            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-xl font-medium cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
