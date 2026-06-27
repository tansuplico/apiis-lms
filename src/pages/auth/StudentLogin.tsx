// src/pages/auth/StudentLogin.tsx
import { Link } from "react-router-dom";
import AuthLayout from "../../components/auth/AuthLayout";
import StudentLoginForm from "@/components/auth/StudentLoginForm";

export default function StudentLogin() {
  return (
    <AuthLayout>
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-center text-blue-600">
          Student Login
        </h1>
      </div>
      <StudentLoginForm />

      <p className="text-center text-sm text-gray-500 mt-8">
        Are you a teacher or admin?{" "}
        <Link
          to="/facilitator-admin/login"
          className="text-blue-600 hover:text-blue-700 font-medium underline"
        >
          Log in here
        </Link>
      </p>
    </AuthLayout>
  );
}
