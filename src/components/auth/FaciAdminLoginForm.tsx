// src/components/auth/FaciAdminLoginForm.tsx
import { useAdminStore } from "@/stores/useAdminStore";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function FaciAdminLoginForm() {
  // ── Store
  const navigate = useNavigate();
  const facilitatorLogin = useFacilitatorStore((s) => s.login);
  const { login: adminLogin } = useAdminStore();

  // ── State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ── Handlers
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    const facilitatorSuccess = await facilitatorLogin(
      trimmedEmail,
      trimmedPassword,
    );

    if (facilitatorSuccess) {
      const facilitator = useFacilitatorStore.getState().currentFacilitator;
      if (facilitator?.mustChangePassword) {
        navigate("/facilitator/change-password");
        return;
      }
      navigate("/facilitator/dashboard");
      return;
    }

    const adminSuccess = await adminLogin(trimmedEmail, trimmedPassword);
    if (adminSuccess) {
      navigate("/admin/dashboard");
      return;
    }
    toast.error("Invalid email or password.");
  };

  // ── Render
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
      </div>

      <button
        type="submit"
        className="w-full py-3 px-4 bg-[#0070FF] text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer"
      >
        Log in
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
