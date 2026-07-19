// src/components/admins/tickets/ViewTicketModal.tsx
import { X, User, Tag, Calendar } from "lucide-react";
import { Ticket, TicketStatus } from "@/types/types";

interface Props {
  isOpen: boolean;
  ticket: Ticket | null;
  isUpdatingStatus: boolean;
  onStatusChange: (status: TicketStatus) => Promise<void>;
  onClose: () => void;
}

// Same hex values already used for the status pills in the table, so the
// banner and the table row agree on what each status looks like.
const STATUS_COLORS: Record<TicketStatus, string> = {
  Open: "#FFBF00",
  "In Progress": "#0070FF",
  Resolved: "#03C03C",
};

export default function ViewTicketModal({
  isOpen,
  ticket,
  isUpdatingStatus,
  onStatusChange,
  onClose,
}: Props) {
  // ── Guard: modal closed or no ticket
  if (!isOpen || !ticket) return null;

  const statusColor = STATUS_COLORS[ticket.status];

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray">
        {/* Status banner */}
        <div
          className="flex items-center justify-between px-6 md:px-8 py-5 rounded-t-2xl"
          style={{ backgroundColor: statusColor }}
        >
          <div>
            <p className="text-xs font-medium text-white/80 uppercase tracking-wide">
              Ticket #{ticket.id}
            </p>
            <h3 className="text-xl md:text-2xl font-bold text-white mt-0.5">
              {ticket.status}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/10 text-white shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Meta panel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                <User size={13} />
                Sender
              </div>
              <p className="text-gray-900 dark:text-white font-medium">
                {ticket.senderName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {ticket.senderRole}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                <Tag size={13} />
                Category
              </div>
              <p className="text-gray-900 dark:text-white font-medium">
                {ticket.category}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                <Calendar size={13} />
                Submitted
              </div>
              <p className="text-gray-900 dark:text-white font-medium">
                {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Status changer */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Update Status
            </label>
            <select
              value={ticket.status}
              disabled={isUpdatingStatus}
              onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
              className="w-full sm:w-56 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Subject */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Subject
            </label>
            <p className="text-gray-900 dark:text-white text-lg font-semibold">
              {ticket.subject}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Description
            </label>
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                {ticket.description}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 pb-6 md:pb-8">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-xl font-medium transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
