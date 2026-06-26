// src/components/auth/AuthLayout.tsx
import { ReactNode } from "react";
import { ToastContainer } from "react-toastify";

interface AuthLayoutProps {
  children: ReactNode;
  subtitle?: string;
}

export default function AuthLayout({ children, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen h-screen w-full bg-white flex flex-col md:flex-row">
      {/* Left side  */}
      <div className="w-full md:w-1/2 bg-blue-600 p-8 md:p-12 lg:p-16 flex flex-col justify-center items-center text-center text-white order-2 md:order-1">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
          Elevate your Skills
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl opacity-90 max-w-md">
          A modern space for learners
        </p>
      </div>

      {/* Right side */}
      <div className="w-full md:w-1/2 p-6 sm:p-8 md:p-12 lg:p-16 flex items-center justify-center order-1 md:order-2">
        <div className="w-full max-w-md mx-auto">
          {subtitle && <p className="text-gray-400 mb-6 md:mb-8">{subtitle}</p>}
          {children}
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}
