// src/components/shared/PersonalInfo.tsx
import { useState } from "react";
import { User, Edit2 } from "lucide-react";
import { toast } from "react-toastify";
import { useStudentStore } from "@/stores/useStudentStore";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";
import { PersonalInfoProps } from "@/types/types";
import { useAdminStore } from "@/stores/useAdminStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function PersonalInfo({ role }: PersonalInfoProps) {
  // ── Store
  const currentStudent = useStudentStore((s) => s.currentStudent);
  const studentUpdateName = useStudentStore((s) => s.updateProfile);

  const currentFacilitator = useFacilitatorStore((s) => s.currentFacilitator);
  const facilitatorUpdateName = useFacilitatorStore((s) => s.updateProfile);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const adminUpdateName = useAdminStore((s) => s.updateProfile);

  const online = useOnlineStatus();

  // ── Derived: current user & update function
  const currentUser =
    role === "student"
      ? currentStudent
      : role === "facilitator"
        ? currentFacilitator
        : currentAdmin;

  const updateName =
    role === "student"
      ? studentUpdateName
      : role === "facilitator"
        ? facilitatorUpdateName
        : adminUpdateName;

  // ── State: name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValues, setEditNameValues] = useState({
    firstName: currentUser?.firstName ?? "",
    lastName: currentUser?.lastName ?? "",
  });

  // ── Guard: no user
  if (!currentUser) return null;

  // ── Handlers
  const handleEditName = () => {
    setIsEditingName(true);
    setEditNameValues({
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
    });
  };

  const handleSaveName = () => {
    if (!editNameValues.firstName.trim() || !editNameValues.lastName.trim()) {
      toast.error("First and last name cannot be empty.");
      return;
    }
    if (
      editNameValues.firstName.length > 50 ||
      editNameValues.lastName.length > 50
    ) {
      toast.error("Names must be 50 characters or less.");
      return;
    }

    updateName({
      firstName: editNameValues.firstName.trim(),
      lastName: editNameValues.lastName.trim(),
    });
    toast.success("Name updated successfully!", {
      position: "bottom-right",
      autoClose: 3000,
      theme: "colored",
    });
    setIsEditingName(false);
  };

  // ── Derived: display labels
  const identifierLabel = role === "student" ? "Student ID" : "Email";
  const identifierValue =
    role === "student"
      ? currentStudent?.idNumber
      : role === "facilitator"
        ? currentFacilitator?.email
        : currentAdmin?.email;

  const roleLabel =
    role === "student"
      ? "Student"
      : role === "facilitator"
        ? "Facilitator"
        : "Admin";

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <User size={24} className="text-blue-600 dark:text-blue-400" />
          Personal Information
        </h2>

        {!isEditingName && (
          <button
            onClick={handleEditName}
            disabled={!online}
            className="flex items-center gap-2 disabled:cursor-not-allowed text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium cursor-pointer"
          >
            <Edit2 size={18} />
            Edit Name
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            First Name
          </label>
          {isEditingName ? (
            <input
              type="text"
              value={editNameValues.firstName}
              onChange={(e) =>
                setEditNameValues({
                  ...editNameValues,
                  firstName: e.target.value,
                })
              }
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
              autoFocus
            />
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-gray-900 dark:text-gray-100">
              {currentUser.firstName}
            </div>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Last Name
          </label>
          {isEditingName ? (
            <input
              type="text"
              value={editNameValues.lastName}
              onChange={(e) =>
                setEditNameValues({
                  ...editNameValues,
                  lastName: e.target.value,
                })
              }
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
            />
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-gray-900 dark:text-gray-100">
              {currentUser.lastName}
            </div>
          )}
        </div>

        {/* Identifier */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {identifierLabel}
          </label>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-gray-900 dark:text-gray-100 font-mono">
            {identifierValue}
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Role
          </label>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-gray-900 dark:text-gray-100">
            {roleLabel}
          </div>
        </div>
      </div>

      {isEditingName && (
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleSaveName}
            disabled={!online}
            className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium cursor-pointer"
          >
            Save Changes
          </button>
          <button
            onClick={() => setIsEditingName(false)}
            className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-lg font-medium cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
