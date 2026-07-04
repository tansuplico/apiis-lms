// src/components/admins/facilitators/CreateFacilitatorModal.tsx
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  }) => Promise<string>;
}

export default function CreateFacilitatorModal({
  isOpen,
  onClose,
  onCreate,
}: Props) {
  // ── Store
  const online = useOnlineStatus();

  // ── State: form fields
  const [createForm, setCreateForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  // ── Derived
  const isCreateValid =
    createForm.firstName.trim() !== "" &&
    createForm.lastName.trim() !== "" &&
    createForm.email.trim() !== "" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim());

  // ── Handlers
  const resetForm = () => {
    setCreateForm({ firstName: "", middleName: "", lastName: "", email: "" });
  };

  const handleCreate = async () => {
    if (!isCreateValid) return;
    setIsCreating(true);
    try {
      await onCreate({
        firstName: createForm.firstName.trim(),
        middleName: createForm.middleName.trim() || undefined,
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim().toLowerCase(),
      });
      resetForm();
      onClose();
    } catch {
      toast.error("Failed to create facilitator. Please try again.", {
        position: "bottom-right",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // ── Guard: not open
  if (!isOpen) return null;

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] scrollbar-thin scrollbar-thumb-gray overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Add Facilitator
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={createForm.firstName}
              onChange={(e) =>
                setCreateForm({ ...createForm, firstName: e.target.value })
              }
              maxLength={50}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="First name"
            />
          </div>

          {/* Middle Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Middle Name{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={createForm.middleName}
              onChange={(e) =>
                setCreateForm({ ...createForm, middleName: e.target.value })
              }
              maxLength={50}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Middle name"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={createForm.lastName}
              onChange={(e) =>
                setCreateForm({ ...createForm, lastName: e.target.value })
              }
              maxLength={50}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Last name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) =>
                setCreateForm({ ...createForm, email: e.target.value })
              }
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="name@example.com"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              A temporary password will be generated and shown after creation.
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={handleCreate}
            disabled={!isCreateValid || isCreating || !online}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 px-6 rounded-xl font-medium"
          >
            {isCreating ? "Creating..." : "Create Account"}
          </button>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isCreating}
            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-xl font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
