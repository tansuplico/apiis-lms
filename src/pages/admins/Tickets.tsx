import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  WifiOff,
} from "lucide-react";
import { toast } from "react-toastify";
import ViewTicketModal from "@/components/admins/tickets/ViewTicketModal";
import { Ticket, TicketStatus } from "@/types/types";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal";
import { isOnline, onNetworkChange } from "@/services/networkStatus";
import { useTicketStore } from "@/stores/useTicketStore";
import TicketTableSkeleton from "@/components/ui/TicketSkeleton";

const ITEMS_PER_PAGE = 10;

export default function AdminTickets() {
  const { tickets, isLoading, deleteTicket, updateTicketStatus } =
    useTicketStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [online, setOnline] = useState(isOnline());
  useEffect(() => {
    const unsubscribe = onNetworkChange(setOnline);
    return () => unsubscribe();
  }, []);

  // ── Client-side search ───────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    if (!searchTerm.trim()) return tickets;
    const lower = searchTerm.toLowerCase().trim();
    return tickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(lower) ||
        t.senderName.toLowerCase().includes(lower),
    );
  }, [searchTerm, tickets]);

  // ── Client-side pagination ───────────────────────────────────────────────
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTickets = filteredTickets.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = (ticket: Ticket) => {
    setTicketToDelete(ticket);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!ticketToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteTicket(ticketToDelete.id);
      toast.success(
        `Ticket #${String(ticketToDelete.id).padStart(5, "0")} deleted.`,
        { position: "bottom-right" },
      );
      setShowDeleteModal(false);
      setTicketToDelete(null);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete ticket.", {
        position: "bottom-right",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── View + status update ─────────────────────────────────────────────────
  const handleView = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowViewModal(true);
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await updateTicketStatus(selectedTicket.id, newStatus);
      setSelectedTicket((prev) => prev && { ...prev, status: newStatus });
      toast.success("Ticket status updated.", { position: "bottom-right" });
    } catch {
      // error toast handled by store (updateTicketStatus)
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-10 pb-12 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl md:text-4xl text-gray-900 dark:text-white">
          All Support Tickets
        </h1>
        <div className="w-full sm:w-80 flex items-center gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg">
          <Search size={20} className="text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search by subject or sender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Offline notice */}
      {!online && !isLoading && tickets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 dark:text-gray-400">
          <WifiOff size={32} className="text-amber-500" />
          <p className="font-medium text-gray-700 dark:text-gray-300">
            You're offline
          </p>
          <p className="text-sm">
            Ticket data requires an internet connection.
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && (tickets.length > 0 || online) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-28">
                    Ticket ID
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-56">
                    Sender
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Subject
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-36">
                    Status
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-36">
                    Date
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 text-right w-32">
                    Actions
                  </th>
                </tr>
              </thead>

              {isLoading ? (
                <TicketTableSkeleton rows={ITEMS_PER_PAGE} />
              ) : (
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedTickets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-16 text-gray-500 dark:text-gray-400"
                      >
                        No tickets found
                      </td>
                    </tr>
                  ) : (
                    paginatedTickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          #{String(ticket.id).padStart(5, "0")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {ticket.senderName}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {ticket.senderRole}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300 max-w-xs">
                          <div className="line-clamp-1" title={ticket.subject}>
                            {ticket.subject}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                              ticket.status === "Open"
                                ? "bg-[#FFBF00] text-white dark:bg-yellow-900/40 dark:text-yellow-300"
                                : ticket.status === "In Progress"
                                  ? "bg-[#0070FF] text-white dark:bg-blue-900/40 dark:text-blue-300"
                                  : "bg-[#03C03C] text-white dark:bg-green-900/40 dark:text-green-300"
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {new Date(ticket.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </td>
                        <td className="px-6 py-4 text-right flex gap-2 justify-end">
                          <button
                            onClick={() => handleView(ticket)}
                            disabled={!online}
                            title={!online ? "You're offline" : "View Ticket"}
                            className={`p-2 rounded-lg text-blue-600 dark:text-blue-400 ${!online ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-50 dark:hover:bg-blue-900/30"}`}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(ticket)}
                            disabled={!online}
                            title={!online ? "You're offline" : "Delete Ticket"}
                            className={`p-2 rounded-lg text-red-600 dark:text-red-400 ${!online ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50 dark:hover:bg-red-900/30"}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              )}
            </table>
          </div>

          {/* Pagination */}
          {filteredTickets.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              <div>
                Showing {startIndex + 1} to{" "}
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredTickets.length)}{" "}
                out of {filteredTickets.length} tickets
              </div>
              <div className="flex items-center gap-1 mt-4 sm:mt-0">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const page = currentPage - 3 + i;
                  if (page < 1 || page > totalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`w-8 h-8 rounded font-medium transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && ticketToDelete && (
        <DeleteConfirmModal
          title="Delete Ticket?"
          message={`Are you sure you want to permanently delete ticket #${String(ticketToDelete?.id).padStart(5, "0")} from`}
          itemName={ticketToDelete?.senderName || ""}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteModal(false);
            setTicketToDelete(null);
          }}
          isDeleting={isDeleting}
        />
      )}

      {/* View Modal */}
      {showViewModal && selectedTicket && (
        <ViewTicketModal
          isOpen={showViewModal}
          ticket={selectedTicket}
          isUpdatingStatus={isUpdatingStatus}
          onStatusChange={handleStatusChange}
          onClose={() => {
            setShowViewModal(false);
            setSelectedTicket(null);
          }}
        />
      )}
    </div>
  );
}
