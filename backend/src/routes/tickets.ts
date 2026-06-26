import { Router } from "express";
import {
  getAllTickets,
  getMyTickets,
  createTicket,
  updateTicketStatus,
  deleteTicket,
} from "../controllers/ticketController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// ── Admin: view all tickets (paginated, filterable by status/role)
router.get("/", authenticate, authorize("admin"), getAllTickets);

// ── Student / Facilitator: view own tickets
router.get(
  "/my",
  authenticate,
  authorize("student", "facilitator"),
  getMyTickets,
);

// ── Student / Facilitator: submit a ticket
router.post(
  "/",
  authenticate,
  authorize("student", "facilitator"),
  createTicket,
);

// ── Admin: update ticket status
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin"),
  updateTicketStatus,
);

// ── Admin: delete a ticket
router.delete("/:id", authenticate, authorize("admin"), deleteTicket);

export default router;
