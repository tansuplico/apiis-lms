// src/components/admins/facilitators/TempPasswordModal.tsx
import { useState } from "react";
import { Copy, Check, Eye, EyeOff, X } from "lucide-react";

interface Props {
  tempPassword: string;
  onClose: () => void;
}

export default function TempPasswordModal({ tempPassword, onClose }: Props) {
  // ── State
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Handlers
  const handleCopyPassword = async () => {
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Check size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Account Created
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Share this temporary password with the facilitator. It will{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            not be shown again
          </span>{" "}
          — copy it now before closing.
        </p>

        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3 mb-4">
          <span className="font-mono text-lg tracking-widest text-gray-900 dark:text-white select-all">
            {showTempPassword ? tempPassword : "•".repeat(tempPassword.length)}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowTempPassword((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title={showTempPassword ? "Hide" : "Show"}
            >
              {showTempPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={handleCopyPassword}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </div>

        {copied && (
          <p className="text-xs text-green-600 dark:text-green-400 mb-4">
            Copied to clipboard!
          </p>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
          The facilitator will be required to set a new password on their first
          login.
        </p>

        <button
          onClick={onClose}
          className="w-full bg-[#0070FF] hover:bg-[#0063e4] text-white py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
        >
          Password Saved
        </button>
      </div>
    </div>
  );
}
