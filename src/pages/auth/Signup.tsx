// src/pages/Signup.tsx
import AuthLayout from "../../components/auth/AuthLayout";
import SignupForm from "../../components/auth/SignupForm";

export default function Signup() {
  return (
    <AuthLayout>
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-center text-blue-600">Signup</h1>
      </div>
      <SignupForm />
    </AuthLayout>
  );
}
