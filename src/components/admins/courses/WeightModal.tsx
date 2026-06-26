// src/components/admin/course/WeightModal.tsx
import { useState, useMemo, useEffect } from "react";
import { X } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export interface ModuleWeight {
  id: number;
  number: number;
  title: string;
  weight?: number | null;
}

interface WeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  modules: ModuleWeight[];
  onSave: (weights: Record<number, string>) => Promise<void>;
}

export default function WeightModal({
  isOpen,
  onClose,
  modules,
  onSave,
}: WeightModalProps) {
  // ── Store
  const online = useOnlineStatus();

  // ── State
  const [weights, setWeights] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── Effects: initialise weights on open
  useEffect(() => {
    if (isOpen) {
      const initial: Record<number, string> = {};
      modules.forEach((mod) => {
        initial[mod.number] = mod.weight != null ? String(mod.weight) : "";
      });
      setWeights(initial);
      setError(null);
    }
  }, [isOpen, modules]);

  // ── Derived: weight sums & helpers
  const explicitSum = useMemo(() => {
    return modules.reduce((sum, mod) => {
      const val = parseFloat(weights[mod.number] ?? "");
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [weights, modules]);

  const blankCount = modules.filter(
    (mod) => (weights[mod.number] ?? "").trim() === "",
  ).length;

  const autoShare = blankCount > 0 ? (100 - explicitSum) / blankCount : 0;

  const isOverLimit = explicitSum > 100.001;
  const isExact = Math.abs(explicitSum - 100) <= 0.01;
  const isValid = !isOverLimit && (isExact || blankCount > 0);

  const barColor = isOverLimit
    ? "bg-red-500"
    : explicitSum === 100
      ? "bg-green-500"
      : "bg-blue-500";

  // ── Guard: not open
  if (!isOpen) return null;

  // ── Handlers
  const handleSave = async () => {
    for (const mod of modules) {
      const val = weights[mod.number]?.trim();
      if (val !== "" && val !== undefined) {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) {
          setError("All weights must be positive numbers.");
          return;
        }
      }
    }

    if (isOverLimit) {
      setError("Weights exceed 100%. Please reduce some values.");
      return;
    }

    if (!isExact && blankCount === 0) {
      setError("Weights must sum to exactly 100%.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(weights);
      onClose();
    } catch {
      setError("Failed to save weights. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const reset: Record<number, string> = {};
    modules.forEach((mod) => {
      reset[mod.number] = "";
    });
    setWeights(reset);
    setError(null);
  };

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Module Weight Distribution
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Set how much each module contributes to the final grade
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Assigned
            </span>
            <span
              className={`text-sm font-bold ${
                isOverLimit
                  ? "text-red-600 dark:text-red-400"
                  : isExact
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-900 dark:text-white"
              }`}
            >
              {explicitSum.toFixed(1)}% / 100%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${Math.min(explicitSum, 100)}%` }}
            />
          </div>
          {blankCount > 0 && !isOverLimit && autoShare > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              {blankCount} unset module{blankCount > 1 ? "s" : ""} will each
              receive{" "}
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {autoShare > 0 ? autoShare.toFixed(2) : "0"}%
              </span>{" "}
              automatically
            </p>
          )}
        </div>

        {/* Module rows */}
        <div className="px-6 py-3 space-y-3 max-h-72 overflow-y-auto">
          {modules.map((mod) => {
            const val = weights[mod.number] ?? "";
            const isEmpty = val.trim() === "";
            const effectiveDisplay =
              isEmpty && autoShare > 0
                ? `auto (${autoShare.toFixed(2)}%)`
                : null;

            return (
              <div key={mod.number} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
                  {mod.number}
                </div>
                <span
                  className="flex-1 text-sm text-gray-900 dark:text-white truncate"
                  title={mod.title}
                >
                  {mod.title}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="auto"
                      value={val}
                      onChange={(e) => {
                        setWeights((prev) => ({
                          ...prev,
                          [mod.number]: e.target.value,
                        }));
                        setError(null);
                      }}
                      className="w-20 text-sm px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    %
                  </span>
                </div>
                {effectiveDisplay && (
                  <span className="text-xs text-blue-500 dark:text-blue-400 shrink-0 w-24 text-right">
                    {effectiveDisplay}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mb-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 gap-3">
          <button
            onClick={handleReset}
            disabled={!online}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Reset all to auto
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !isValid || !online}
              className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save Weights"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
