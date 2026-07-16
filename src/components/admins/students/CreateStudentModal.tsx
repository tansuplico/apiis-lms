// src/components/admins/students/CreateStudentModal.tsx
import { useState } from "react";
import { X, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import { useCenterStore } from "@/stores/useCenterStore";
import { useStudentListStore } from "@/stores/useStudentListStore";
import { formatStudentId } from "@/utils/formatter";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateStudentModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateStudentModalProps) {
  // ── Store
  const { centers } = useCenterStore();
  const { addStudent, students } = useStudentListStore();
  const online = useOnlineStatus();

  // ── State: form & UI
  const [newStudent, setNewStudent] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    idNumber: "",
    password: "",
    currentCenter: null as number | null,
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // ── Helpers
  const generatePassword = () =>
    String(Math.floor(10000 + Math.random() * 90000));

  const isValidStudentId = (id: string): boolean =>
    /^\d{2}-\d{4}-\d{2}$/.test(id);

  const isDuplicateId = (idNumber: string): boolean => {
    const trimmed = idNumber.trim();
    if (!trimmed) return false;
    return students.some((s) => s.idNumber === trimmed);
  };

  const validateFields = (): boolean => {
    const { firstName, lastName, idNumber, password } = newStudent;
    if (!firstName.trim()) {
      toast.error("First name is required.");
      return false;
    }
    if (!lastName.trim()) {
      toast.error("Last name is required.");
      return false;
    }
    if (firstName.length > 50 || lastName.length > 50) {
      toast.error("Names cannot exceed 50 characters.");
      return false;
    }
    if (!idNumber.trim()) {
      toast.error("ID Number is required.");
      return false;
    }
    if (!isValidStudentId(idNumber.trim())) {
      toast.error("ID Number must be in the format: 12-0452-01");
      return false;
    }
    if (!password.trim()) {
      toast.error("Password is required.");
      return false;
    }
    if (!/^\d{5}$/.test(password)) {
      toast.error("Login code must be exactly 5 digits.");
      return false;
    }
    return true;
  };

  // ── Handlers: create student
  const handleCreate = async () => {
    if (!validateFields()) return;

    setIsCreating(true);
    try {
      await addStudent({
        idNumber: newStudent.idNumber.trim(),
        password: newStudent.password,
        firstName: newStudent.firstName.trim(),
        middleName: newStudent.middleName.trim() || undefined,
        lastName: newStudent.lastName.trim(),
        currentCenter: newStudent.currentCenter,
        profilePicture: null,
      });

      setNewStudent({
        firstName: "",
        middleName: "",
        lastName: "",
        idNumber: "",
        password: "",
        currentCenter: null,
      });
      setShowNewPassword(false);
      onClose();
      onSuccess?.();
    } catch {
      // error toast handled by store (addStudent)
    } finally {
      setIsCreating(false);
    }
  };

  // ── Guard: modal closed
  if (!isOpen) return null;

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] scrollbar-thin scrollbar-thumb-gray overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Create New Student
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
              value={newStudent.firstName}
              onChange={(e) =>
                setNewStudent({ ...newStudent, firstName: e.target.value })
              }
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
              value={newStudent.middleName}
              onChange={(e) =>
                setNewStudent({ ...newStudent, middleName: e.target.value })
              }
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
              value={newStudent.lastName}
              onChange={(e) =>
                setNewStudent({ ...newStudent, lastName: e.target.value })
              }
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Last name"
            />
          </div>

          {/* ID Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ID Number
            </label>
            <input
              type="text"
              value={newStudent.idNumber}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  idNumber: formatStudentId(e.target.value),
                })
              }
              className={`w-full p-3 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                isDuplicateId(newStudent.idNumber)
                  ? "border-red-400 dark:border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
              }`}
              placeholder="e.g. 18-1234-56"
              maxLength={10}
              inputMode="numeric"
            />
            {isDuplicateId(newStudent.idNumber) ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                ID Number already exists for another student.
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Format: 00-0000-00
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newStudent.password}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, password: e.target.value })
                }
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
                placeholder="Enter password"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const generated = generatePassword();
                    setNewStudent({ ...newStudent, password: generated });
                    setShowNewPassword(true);
                    toast.info("Password generated! Make sure to copy it.", {
                      position: "bottom-right",
                      autoClose: 3000,
                    });
                  }}
                  className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800"
                  title="Generate password"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Must be exactly 5 digits
              </p>
              {newStudent.password && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newStudent.password);
                    toast.success("Password copied to clipboard!", {
                      position: "bottom-right",
                      autoClose: 2000,
                    });
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Copy password
                </button>
              )}
            </div>
          </div>

          {/* Assigned Center */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assign Center
            </label>
            <select
              value={newStudent.currentCenter ?? ""}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  currentCenter: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Not assigned</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={handleCreate}
            disabled={
              isCreating || !online || isDuplicateId(newStudent.idNumber)
            }
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 px-6 rounded-xl font-medium"
          >
            {isCreating ? "Creating..." : "Create Student"}
          </button>
          <button
            onClick={onClose}
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
