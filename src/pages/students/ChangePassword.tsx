// src/pages/students/ChangePassword.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useStudentStore } from "@/stores/useStudentStore";

const CODE_LENGTH = 5;

// ── 5-box segmented code input — shared layout for both fields below.
// Handles per-digit typing, backspace-to-previous, and pasting a full code.
function PinCodeInput({
  idPrefix,
  value,
  onChange,
  show,
  autoFocus,
}: {
  idPrefix: string;
  value: string;
  onChange: (val: string) => void;
  show: boolean;
  autoFocus?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? "");

  const setDigit = (index: number, char: string) => {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join("").slice(0, CODE_LENGTH));
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setDigit(index, digit);
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setDigit(index - 1, "");
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted.slice(0, CODE_LENGTH));
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-2 sm:gap-3">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          id={`${idPrefix}-${i}`}
          type={show ? "text" : "password"}
          inputMode="numeric"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-12 h-14 sm:w-13 sm:h-15 text-center text-2xl font-bold rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-colors"
        />
      ))}
    </div>
  );
}

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

  const codesMatch =
    form.newPassword.length === CODE_LENGTH &&
    form.confirmPassword.length === CODE_LENGTH &&
    form.newPassword === form.confirmPassword;

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
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 sm:p-10 w-full max-w-md">
        {/* Icon + Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
            <ShieldCheck size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Set Your Login Code
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-center mt-2 text-sm max-w-xs">
            Welcome, {currentStudent.firstName}! For your security, please set a
            new 5-digit code before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          {/* New Password */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="new-0"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                New Login Code
              </label>
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>
            <PinCodeInput
              idPrefix="new"
              value={form.newPassword}
              onChange={(val) => setForm((f) => ({ ...f, newPassword: val }))}
              show={showNewPassword}
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-400">
              Must be exactly 5 digits (numbers only)
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="confirm-0"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm Login Code
              </label>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            <PinCodeInput
              idPrefix="confirm"
              value={form.confirmPassword}
              onChange={(val) =>
                setForm((f) => ({ ...f, confirmPassword: val }))
              }
              show={showConfirmPassword}
            />
          </div>

          {/* Match indicator */}
          {form.newPassword.length === CODE_LENGTH &&
            form.confirmPassword.length > 0 && (
              <div
                className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 ${
                  codesMatch
                    ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                    : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                }`}
              >
                {codesMatch ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                {codesMatch ? "Codes match" : "Codes do not match"}
              </div>
            )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-medium rounded-xl shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Set Password & Continue"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
