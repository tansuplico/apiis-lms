// src/components/auth/FaciAdminLoginForm.tsx
import { apiClient, ApiError } from "@/services/apiClient";
import { useAdminStore } from "@/stores/useAdminStore";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

type ForgotStep = "login" | "request" | "reset";

export default function FaciAdminLoginForm() {
  // ── Store
  const navigate = useNavigate();
  const facilitatorLogin = useFacilitatorStore((s) => s.login);
  const { login: adminLogin } = useAdminStore();

  // ── Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ── Forgot password state
  const [step, setStep] = useState<ForgotStep>("login");
  const [resetEmail, setResetEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // ── Handlers: login
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    setIsLoggingIn(true);

    try {
      try {
        await facilitatorLogin(trimmedEmail, trimmedPassword);

        const facilitator = useFacilitatorStore.getState().currentFacilitator;

        if (facilitator?.mustChangePassword) {
          navigate("/facilitator/change-password", { replace: true });
          return;
        }

        navigate("/facilitator/dashboard", { replace: true });
        return;
      } catch (facilitatorErr: any) {
        if (
          !(facilitatorErr instanceof ApiError) ||
          facilitatorErr.statusCode !== 401
        ) {
          toast.error(
            facilitatorErr.message ?? "Something went wrong. Please try again.",
          );
          return;
        }
      }

      try {
        await adminLogin(trimmedEmail, trimmedPassword);
        navigate("/admin/dashboard", { replace: true });
      } catch (adminErr: any) {
        if (adminErr instanceof ApiError && adminErr.statusCode === 401) {
          toast.error("Invalid email or password.");
        } else {
          toast.error(
            adminErr.message ?? "Something went wrong. Please try again.",
          );
        }
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ── Handlers: forgot password
  const handleRequestCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post(
        "/auth/forgot-password",
        { email: resetEmail.trim() },
        false,
      );
      toast.success("If that email exists, a code has been sent.");
      setCooldown(60);
      setStep("reset");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post(
        "/auth/reset-password-with-code",
        { email: resetEmail.trim(), code: code.trim(), newPassword },
        false,
      );
      toast.success("Password reset. You can now log in.");
      setStep("login");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setResetEmail("");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render: request-code step
  if (step === "request") {
    return (
      <form onSubmit={handleRequestCode} className="space-y-6">
        <div>
          <label
            htmlFor="resetEmail"
            className="block text-sm font-medium text-black mb-1"
          >
            Enter your email
          </label>
          <input
            id="resetEmail"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="w-full px-4 py-3 bg-[#F5F5F5] rounded-lg text-[#939393] placeholder-[#939393] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="name@example.com"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting || cooldown > 0}
          className="w-full py-3 px-4 bg-[#0070FF] text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer disabled:opacity-50"
        >
          {submitting
            ? "Sending..."
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Send reset code"}
        </button>

        <p className="text-center text-sm text-gray-400 mt-6">
          <button
            type="button"
            onClick={() => setStep("login")}
            className="text-blue-400 hover:text-blue-300 font-medium bg-transparent border-none p-0 cursor-pointer underline"
          >
            Back to login
          </button>
        </p>
      </form>
    );
  }

  // ── Render: enter-code + new password step
  if (step === "reset") {
    return (
      <form onSubmit={handleResetPassword} className="space-y-6">
        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-black mb-1"
          >
            6-digit code
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-3 bg-[#F5F5F5] rounded-lg text-[#939393] placeholder-[#939393] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest text-center"
            placeholder="123456"
            required
          />
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-black mb-1"
          >
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#F5F5F5] rounded-lg text-[#939393] placeholder-[#939393] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="New password"
            required
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-black mb-1"
          >
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#F5F5F5] rounded-lg text-[#939393] placeholder-[#939393] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Confirm new password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-4 bg-[#0070FF] text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer disabled:opacity-50"
        >
          {submitting ? "Resetting..." : "Reset password"}
        </button>

        <p className="text-center text-sm text-gray-400 mt-6">
          <button
            type="button"
            onClick={() => setStep("request")}
            className="text-blue-400 hover:text-blue-300 font-medium bg-transparent border-none p-0 cursor-pointer underline"
          >
            Didn't get a code? Try again
          </button>
        </p>
      </form>
    );
  }

  // ── Render: login step (default)
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-black mb-1"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 bg-[#F5F5F5] rounded-lg text-[#939393] placeholder-[#939393] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="name@example.com"
          required
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-black mb-1"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-[#F5F5F5] rounded-lg text-[#939393] placeholder-[#939393] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Password"
          required
        />
        <div className="text-right mt-2">
          <button
            type="button"
            onClick={() => {
              setResetEmail(email);
              setStep("request");
            }}
            className="text-sm text-blue-500 hover:text-blue-400 bg-transparent border-none p-0 cursor-pointer underline"
          >
            Forgot password?
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoggingIn}
        className="w-full py-3 px-4 bg-[#0070FF] text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          "Log in"
        )}
      </button>

      <p className="text-center text-sm text-gray-400 mt-6">
        Are you a student?{" "}
        <button
          type="button"
          onClick={() => navigate("/student/login")}
          className="text-blue-400 hover:text-blue-300 font-medium bg-transparent border-none p-0 cursor-pointer underline"
        >
          Log in here
        </button>
      </p>
    </form>
  );
}
