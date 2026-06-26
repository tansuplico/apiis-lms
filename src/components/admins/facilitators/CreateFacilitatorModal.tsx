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
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl ">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Add Facilitator
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          A secure temporary password will be generated automatically. Share it
          with the facilitator — they'll be prompted to change it on first
          login.
        </p>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.firstName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, firstName: e.target.value })
                }
                maxLength={50}
                placeholder="First name"
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.lastName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, lastName: e.target.value })
                }
                maxLength={50}
                placeholder="Last name"
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              value={createForm.middleName}
              onChange={(e) =>
                setCreateForm({ ...createForm, middleName: e.target.value })
              }
              maxLength={50}
              placeholder="Middle name"
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) =>
                setCreateForm({ ...createForm, email: e.target.value })
              }
              placeholder="name@example.com"
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
            <span>🔐</span>
            <span>
              A temporary password will be auto-generated and shown to you once
              after creation.
            </span>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={handleCreate}
            disabled={!isCreateValid || isCreating || !online}
            className="flex-1 bg-[#0070FF] hover:bg-[#0063e4] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
          >
            {isCreating ? "Creating..." : "Create Account"}
          </button>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isCreating}
            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
