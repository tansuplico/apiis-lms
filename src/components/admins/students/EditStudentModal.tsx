// src/components/admins/students/EditStudentModal.tsx
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import { AccountStatus, Student } from "@/types/types";
import { useStudentListStore } from "@/stores/useStudentListStore";
import { useCenterStore } from "@/stores/useCenterStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface Props {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditStudentModal({
  isOpen,
  student,
  onClose,
  onSuccess,
}: Props) {
  // ── Store
  const { updateStudent } = useStudentListStore();
  const {
    addStudent: addStudentToCenter,
    removeStudent: removeStudentFromCenter,
    centers,
  } = useCenterStore();
  const online = useOnlineStatus();

  // ── State: editable student copy
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ── Effects: initialise form when student prop changes
  useEffect(() => {
    if (student) {
      setStudentToEdit({ ...student, password: "" });
      setShowPassword(false);
    }
  }, [student]);

  // ── Validation helpers
  const isValidStudentId = (id: string): boolean =>
    /^\d{2}-\d{4}-\d{2}$/.test(id);

  const validateFields = (): boolean => {
    if (!studentToEdit) return false;
    const { firstName, lastName, idNumber, password } = studentToEdit;
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
    if (password?.trim() && !/^\d{5}$/.test(password)) {
      toast.error("Login code must be exactly 5 digits.");
      return false;
    }
    return true;
  };

  const checkForDuplicates = (idNumber: string, excludeId: number): boolean => {
    const trimmedId = idNumber.trim();
    const { students } = useStudentListStore.getState();
    return students.some((s) => s.idNumber === trimmedId && s.id !== excludeId);
  };

  // ── Handlers: save changes
  const saveEdit = async () => {
    if (!studentToEdit) return;
    if (!validateFields()) return;
    if (checkForDuplicates(studentToEdit.idNumber, studentToEdit.id)) {
      toast.error("ID Number already exists for another student.");
      return;
    }

    setIsEditing(true);
    try {
      const previousStudent = useStudentListStore
        .getState()
        .students.find((s) => s.id === studentToEdit.id);
      const previousCenterId = previousStudent?.currentCenter ?? null;
      const newCenterId = studentToEdit.currentCenter ?? null;

      // Handle center reassignment
      if (previousCenterId !== newCenterId) {
        if (previousCenterId !== null) {
          await removeStudentFromCenter(previousCenterId, studentToEdit.id);
        }
        if (newCenterId !== null) {
          await addStudentToCenter(newCenterId, studentToEdit.id);
        }
      }

      const updatePayload: any = {
        firstName: studentToEdit.firstName,
        middleName: studentToEdit.middleName,
        lastName: studentToEdit.lastName,
        idNumber: studentToEdit.idNumber,
        status: studentToEdit.status,
        currentCenter: studentToEdit.currentCenter,
      };
      if (studentToEdit.password?.trim()) {
        updatePayload.password = studentToEdit.password;
      }

      await updateStudent(studentToEdit.id, updatePayload);
      toast.success(
        `${studentToEdit.firstName} ${studentToEdit.lastName}'s info updated.`,
        { position: "bottom-right" },
      );
      onClose();
      onSuccess?.();
    } catch {
      // error toast handled by store (updateStudent)
    } finally {
      setIsEditing(false);
    }
  };

  // ── Guard: modal closed or no data
  if (!isOpen || !studentToEdit) return null;

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] scrollbar-thin scrollbar-thumb-gray overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Edit Student
        </h3>

        <div className="space-y-6">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={studentToEdit.firstName}
              onChange={(e) =>
                setStudentToEdit({
                  ...studentToEdit,
                  firstName: e.target.value,
                })
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
              value={studentToEdit.middleName ?? ""}
              onChange={(e) =>
                setStudentToEdit({
                  ...studentToEdit,
                  middleName: e.target.value,
                })
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
              value={studentToEdit.lastName}
              onChange={(e) =>
                setStudentToEdit({ ...studentToEdit, lastName: e.target.value })
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
              value={studentToEdit.idNumber}
              onChange={(e) =>
                setStudentToEdit({ ...studentToEdit, idNumber: e.target.value })
              }
              className={`w-full p-3 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                checkForDuplicates(studentToEdit.idNumber, studentToEdit.id)
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
              }`}
              placeholder="e.g. 18-1234-56"
            />
            {checkForDuplicates(studentToEdit.idNumber, studentToEdit.id) && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                This ID Number already exists for another student.
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
                type={showPassword ? "text" : "password"}
                value={studentToEdit.password}
                onChange={(e) =>
                  setStudentToEdit({
                    ...studentToEdit,
                    password: e.target.value,
                  })
                }
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                placeholder="Enter new password (leave blank to keep current)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Exactly 5 digits (leave empty to keep current password)
            </p>
          </div>

          {/* Account Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Account Status
            </label>
            <select
              value={studentToEdit.status}
              onChange={(e) =>
                setStudentToEdit({
                  ...studentToEdit,
                  status: e.target.value as AccountStatus,
                })
              }
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {studentToEdit.status === "banned"
                ? "Banned students cannot log in or access the application."
                : studentToEdit.status === "inactive"
                  ? "Inactive students cannot log in until reactivated."
                  : "Student has full access to the application."}
            </p>
          </div>

          {/* Assigned Center */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned Center
            </label>
            <select
              value={studentToEdit.currentCenter ?? ""}
              onChange={(e) =>
                setStudentToEdit({
                  ...studentToEdit,
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
            onClick={saveEdit}
            disabled={
              isEditing ||
              !online ||
              checkForDuplicates(studentToEdit.idNumber, studentToEdit.id)
            }
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium"
          >
            {isEditing ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            disabled={isEditing}
            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-xl font-medium cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
