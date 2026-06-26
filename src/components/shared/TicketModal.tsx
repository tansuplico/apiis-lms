// src/components/shared/TicketModal.tsx
import { useState } from "react";
import { X, TicketCheck, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { apiClient } from "@/services/apiClient";

const CATEGORIES = [
  "Technical Issue",
  "Account Problem",
  "Course Content",
  "Grading Concern",
  "General Inquiry",
  "Other",
];

interface Props {
  onClose: () => void;
}

export default function TicketModal({ onClose }: Props) {
  // ── State
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Derived
  const isValid =
    subject.trim().length > 0 &&
    category !== "" &&
    description.trim().length > 0;

  // ── Handlers
  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await apiClient.post("/tickets", {
        category,
        subject: subject.trim(),
        description: description.trim(),
      });

      toast.success("Ticket submitted! We'll get back to you soon.", {
        position: "bottom-right",
        autoClose: 4000,
        theme: "colored",
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit ticket. Please try again.", {
        position: "bottom-right",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 max-w-xl w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <TicketCheck
                size={20}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Submit a Support Ticket
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
            >
              <option value="" disabled>
                Select a category...
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue..."
              maxLength={120}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
              {subject.length}/120
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={5}
              maxLength={5000}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none disabled:opacity-50 scrollbar-thin scrollbar-thumb-gray"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
              {description.length}/5000
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-7">
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-[#0070FF] hover:bg-[#0063e4] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? "Submitting..." : "Submit Ticket"}
          </button>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
