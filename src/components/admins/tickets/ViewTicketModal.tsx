// src/components/admins/tickets/ViewTicketModal.tsx
import { X } from "lucide-react";
import { Ticket, TicketStatus } from "@/types/types";

interface Props {
  isOpen: boolean;
  ticket: Ticket | null;
  isUpdatingStatus: boolean;
  onStatusChange: (status: TicketStatus) => Promise<void>;
  onClose: () => void;
}

export default function ViewTicketModal({
  isOpen,
  ticket,
  isUpdatingStatus,
  onStatusChange,
  onClose,
}: Props) {
  // ── Guard: modal closed or no ticket
  if (!isOpen || !ticket) return null;

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] scrollbar-thin scrollbar-thumb-gray overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Ticket #{String(ticket.id).padStart(5, "0")}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-10">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Sender
              </label>
              <p className="text-gray-900 dark:text-white font-medium capitalize">
                {ticket.senderName} ({ticket.senderRole})
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Category
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {ticket.category}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Status
              </label>
              <select
                value={ticket.status}
                disabled={isUpdatingStatus}
                onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-35 disabled:opacity-50"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Submitted
              </label>
              <p className="text-gray-600 dark:text-gray-400">
                {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Subject
            </label>
            <p className="text-gray-900 text-xl font-medium dark:text-white">
              {ticket.subject}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Description
            </label>
            <div className="max-h-64 scrollbar-thin scrollbar-thumb-gray overflow-y-auto pr-2">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
