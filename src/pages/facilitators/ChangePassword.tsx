// src/pages/facilitators/ChangePassword.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";

export default function ChangePassword() {
  // ── Store
  const navigate = useNavigate();
  const { currentFacilitator, updatePasswordForced, logout } =
    useFacilitatorStore();

  // ── State
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── Effects: redirect checks
  useEffect(() => {
    if (!currentFacilitator) {
      navigate("/facilitator-admin/login", { replace: true });
      return;
    }
    if (!currentFacilitator.mustChangePassword && !success) {
      navigate("/facilitator/dashboard", { replace: true });
    }
  }, [currentFacilitator, navigate, success]);

  // ── Guards: must change password or redirect
  if (!currentFacilitator || !currentFacilitator.mustChangePassword) {
    return null;
  }

  // ── Handlers: form submission, logout
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const hasUppercase = /[A-Z]/.test(form.newPassword);
    const hasLowercase = /[a-z]/.test(form.newPassword);
    const hasNumber = /[0-9]/.test(form.newPassword);

    if (form.newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      setError(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
      );
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const succeeded = await updatePasswordForced(form.newPassword);
      if (succeeded) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/facilitator/dashboard", { replace: true });
        }, 1500);
      } else {
        setError("Failed to set password. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/facilitator-admin/login", { replace: true });
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
            Welcome, {currentFacilitator.firstName}! Your account was set up by
            an admin. Please set a new password before continuing.
          </p>
        </div>

        {/* Success banner */}
        {success && (
          <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 mb-6">
            <CheckCircle2
              size={18}
              className="text-green-600 dark:text-green-400 shrink-0"
            />
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Password set! Redirecting you now...
            </p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-6">
            <AlertCircle
              size={18}
              className="text-red-600 dark:text-red-400 shrink-0"
            />
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={form.newPassword}
                onChange={(e) => {
                  setError(null);
                  setForm({ ...form, newPassword: e.target.value });
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                placeholder="••••••••"
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
              Min 8 characters with uppercase, lowercase, and a number
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => {
                  setError(null);
                  setForm({ ...form, confirmPassword: e.target.value });
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                placeholder="••••••••"
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
          {form.newPassword.length >= 8 && form.confirmPassword.length > 0 && (
            <p
              className={`text-xs font-medium ${
                form.newPassword === form.confirmPassword
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {form.newPassword === form.confirmPassword
                ? "✓ Passwords match"
                : "✗ Passwords do not match"}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || success}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {isLoading
              ? "Saving..."
              : success
                ? "Redirecting..."
                : "Set Password & Continue"}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoading || success}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Log out and do this later
          </button>
        </form>
      </div>
    </div>
  );
}
