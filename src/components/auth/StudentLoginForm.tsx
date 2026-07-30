// src/components/auth/StudentLoginForm.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useStudentStore } from "@/stores/useStudentStore";

export default function StudentLoginForm() {
  // ── Store
  const navigate = useNavigate();
  const { login } = useStudentStore();

  // ── State
  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ── Helpers: ID formatting
  const formatStudentId = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  };

  // ── Handlers
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdNumber(formatStudentId(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsLoggingIn(true);

    try {
      const success = await login(idNumber.trim(), password.trim());

      if (success) {
        const { currentStudent } = useStudentStore.getState();

        if (currentStudent?.mustChangePassword) {
          navigate("/change-password", { replace: true });
        } else {
          toast.success("Login successful!");
          navigate("/student/dashboard", { replace: true });
        }
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ── Render
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="idNumber"
          className="block text-sm font-medium text-black mb-1"
        >
          Student ID
        </label>

        <input
          id="idNumber"
          type="text"
          value={idNumber}
          onChange={handleIdChange}
          className="w-full px-4 py-3 bg-[#F5F5F5] rounded-lg text-[#939393] placeholder-[#939393] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="00-0000-00"
          maxLength={10}
          inputMode="numeric"
          required
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-black mb-1"
        >
          Login Code
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value.replace(/\D/g, "").slice(0, 5))
          }
          inputMode="numeric"
          maxLength={5}
          className="w-full px-4 py-3 bg-[#F5F5F5] rounded-lg text-[#939393] placeholder-[#939393] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest text-lg"
          placeholder="•••••"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoggingIn}
        className="w-full py-3 px-4 bg-[#0070FF] text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoggingIn ? (
          <>
            <svg
              className="w-5 h-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>

            <span>Logging in...</span>
          </>
        ) : (
          "Login"
        )}
      </button>
    </form>
  );
}
