// src/pages/auth/AdminLogin.tsx
import AuthLayout from "../../components/auth/AuthLayout";
import LoginForm from "../../components/auth/FaciAdminLoginForm";

export default function AdminLogin() {
  return (
    <AuthLayout>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-center text-blue-600">
          Facilitator and Admin Login
        </h1>
      </div>
      <LoginForm />
    </AuthLayout>
  );
}
