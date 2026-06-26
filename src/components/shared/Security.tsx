// src/components/shared/Security.tsx
import { useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "react-toastify";
import { useStudentStore } from "@/stores/useStudentStore";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";
import { useAdminStore } from "@/stores/useAdminStore";
import { isOnline } from "@/services/networkStatus";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type Role = "student" | "facilitator" | "admin";

interface SecurityProps {
  role: Role;
}

export default function Security({ role }: SecurityProps) {
  // ── Store
  const studentUpdatePassword = useStudentStore((s) => s.updatePassword);
  const studentLogout = useStudentStore((s) => s.logout);
  const facilitatorUpdatePassword = useFacilitatorStore(
    (s) => s.updatePassword,
  );
  const facilitatorLogout = useFacilitatorStore((s) => s.logout);
  const adminUpdatePassword = useAdminStore((s) => s.updatePassword);
  const adminLogout = useAdminStore((s) => s.logout);

  const updatePassword =
    role === "student"
      ? studentUpdatePassword
      : role === "facilitator"
        ? facilitatorUpdatePassword
        : adminUpdatePassword;

  const logout =
    role === "student"
      ? studentLogout
      : role === "facilitator"
        ? facilitatorLogout
        : adminLogout;

  // ── State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const online = useOnlineStatus();

  // ── Handlers
  const handleChangePassword = async () => {
    if (
      !passwordValues.current ||
      !passwordValues.new ||
      !passwordValues.confirm
    ) {
      toast.error("All fields are required.");
      return;
    }

    if (passwordValues.new !== passwordValues.confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    if (role === "student") {
      if (!/^\d{5}$/.test(passwordValues.new)) {
        toast.error("New PIN must be exactly 5 digits.");
        return;
      }
    } else {
      if (passwordValues.new.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
    }

    const success = await updatePassword(
      passwordValues.current,
      passwordValues.new,
    );
    if (success) {
      toast.success("Password changed successfully!", {
        position: "bottom-right",
        autoClose: 3000,
        theme: "colored",
      });
      setPasswordValues({ current: "", new: "", confirm: "" });
      setShowPasswordForm(false);
    }
  };

  const handleLogout = () => {
    if (!isOnline()) {
      toast.warning(
        "You're offline. Logging out will require internet to log back in.",
        {
          position: "bottom-right",
        },
      );
      return;
    }
    logout();
  };

  const handlePinInput =
    (field: "current" | "new" | "confirm") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 5);
      setPasswordValues({ ...passwordValues, [field]: digits });
    };

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-3">
        <Lock size={24} className="text-red-600 dark:text-red-400" />
        Security
      </h2>

      <div className="space-y-6">
        <button
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          disabled={!online}
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium cursor-pointer"
        >
          Change Password
        </button>

        {showPasswordForm && (
          <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <input
              type={role === "student" ? "text" : "password"}
              inputMode={role === "student" ? "numeric" : undefined}
              maxLength={role === "student" ? 5 : undefined}
              placeholder={
                role === "student" ? "Current PIN" : "Current Password"
              }
              value={passwordValues.current}
              onChange={
                role === "student"
                  ? handlePinInput("current")
                  : (e) =>
                      setPasswordValues({
                        ...passwordValues,
                        current: e.target.value,
                      })
              }
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type={role === "student" ? "text" : "password"}
              inputMode={role === "student" ? "numeric" : undefined}
              maxLength={role === "student" ? 5 : undefined}
              placeholder={role === "student" ? "New PIN" : "New Password"}
              value={passwordValues.new}
              onChange={
                role === "student"
                  ? handlePinInput("new")
                  : (e) =>
                      setPasswordValues({
                        ...passwordValues,
                        new: e.target.value,
                      })
              }
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type={role === "student" ? "text" : "password"}
              inputMode={role === "student" ? "numeric" : undefined}
              maxLength={role === "student" ? 5 : undefined}
              placeholder={
                role === "student" ? "Confirm New PIN" : "Confirm New Password"
              }
              value={passwordValues.confirm}
              onChange={
                role === "student"
                  ? handlePinInput("confirm")
                  : (e) =>
                      setPasswordValues({
                        ...passwordValues,
                        confirm: e.target.value,
                      })
              }
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={handleChangePassword}
              disabled={!online}
              className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium cursor-pointer"
            >
              Update Password
            </button>
          </div>
        )}

        <button
          onClick={handleLogout}
          disabled={!online}
          className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium cursor-pointer"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
