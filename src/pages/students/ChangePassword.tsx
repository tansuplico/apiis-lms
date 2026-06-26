// src/pages/students/ChangePassword.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useStudentStore } from "@/stores/useStudentStore";

export default function ChangePassword() {
  // ── Store
  const navigate = useNavigate();
  const { currentStudent, updatePassword } = useStudentStore();

  // ── State
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Guards: redirect if not authenticated or no need to change
  if (!currentStudent) {
    navigate("/student/login");
    return null;
  }

  if (!currentStudent.mustChangePassword) {
    navigate("/student/dashboard");
    return null;
  }

  // ── Handlers: form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{5}$/.test(form.newPassword)) {
      toast.error("Login code must be exactly 5 digits.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error("Login codes do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const success = await updatePassword("", form.newPassword);
      if (success) {
        toast.success("Login code set! Welcome!", { position: "bottom-right" });
        navigate("/student/dashboard");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Icon + Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <Lock size={32} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Set Your Password
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-center mt-2 text-sm">
            Welcome, {currentStudent.firstName}! For your security, please set a
            new password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Login Code
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={form.newPassword}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                  setForm({ ...form, newPassword: val });
                }}
                inputMode="numeric"
                maxLength={5}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 tracking-widest text-2xl font-bold"
                placeholder="•••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Must be exactly 5 digits (numbers only)
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm Login Code
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                  setForm({ ...form, confirmPassword: val });
                }}
                inputMode="numeric"
                maxLength={5}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 tracking-widest text-2xl font-bold"
                placeholder="•••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Match indicator */}
          {form.newPassword.length === 5 && form.confirmPassword.length > 0 && (
            <p
              className={`text-xs font-medium ${
                form.newPassword === form.confirmPassword
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {form.newPassword === form.confirmPassword
                ? "✓ Codes match"
                : "✗ Codes do not match"}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Saving..." : "Set Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
