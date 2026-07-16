import { GradebookEntry } from "@/services/studentService";

// ─── Primitives ───────────────────────────────────────────────
export type AccountStatus = "active" | "inactive" | "banned";
export type AttendanceStatus = "present" | "absent";
export type Role = "student" | "facilitator" | "admin";

// ─── Users ────────────────────────────────────────────────────
export type Student = {
  id: number;
  idNumber: string;
  password: string;
  mustChangePassword: boolean;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  coins: number;
  profilePicture: string;
  coverColor: string;
  courseProgress: Record<number, CourseProgress>;
  accessoriesOwned: number[];
  currentCenter: number | null;
  previousCenters: number[];
  status: AccountStatus;
};

export type Facilitator = {
  id: number;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  profilePicture: string | null;
  coverColor: string;
  status: AccountStatus;
  assignedCenterIds: number[];
  mustChangePassword: boolean;
  createdAt?: string;
};

export type Admin = {
  id: number;
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  profilePicture: string;
  coverColor: string;
  status: AccountStatus;
};

// ─── Centers ──────────────────────────────────────────────────
export type Center = {
  id: number;
  title: string;
  slug?: string;
  facilitatorIds: number[];
  courses: number[];
  students: number[];
  thumbnailUrl: string;
  coverColor: string;
  location: string;
};

// ─── Courses ──────────────────────────────────────────────────
export type QuizQuestionType =
  | "multiple_choice"
  | "identification"
  | "fill_in_the_blank"
  | "true_false"
  | "matching";

export type MatchingPair = {
  left: string;
  right: string;
};

export type QuizQuestion = {
  id: number;
  type: QuizQuestionType;
  question: string;
  imageUrl?: string;
  options?: string[]; // multiple_choice
  correctOptionIndex?: number; // multiple_choice
  correctAnswer?: string; // fill_in_the_blank (single blank, one accepted answer)
  correctAnswers?: string[]; // identification (any of these accepted, case-insensitive)
  correctBoolean?: boolean; // true_false
  matchingPairs?: MatchingPair[]; // matching
  explanation?: string;
  bankQuestionId?: number;
};

export type CoursePart = {
  id: number;
  slug: string;
  name: string;
  coverColor: string;
  quizQuestions?: QuizQuestion[];
  content?: string;
  order: number;
  updatedAt?: string;
};

export type ModuleVideo = {
  id: number;
  moduleId: number;
  title: string;
  filename: string;
  durationSeconds: number | null;
  sortOrder: number;
  localPath?: string | null;
  downloaded?: boolean;
};

export type ModuleFile = {
  id: number;
  moduleId: number;
  title: string;
  originalFilename: string;
  mimeType: string;
  sortOrder: number;
};

export type CourseModule = {
  id: number;
  number: number;
  title: string;
  parts: CoursePart[];
  weight?: number | null;
  totalRewardCoins?: number;
  videos?: ModuleVideo[];
  files?: ModuleFile[];
};

export type Course = {
  id: number;
  title: string;
  category: string;
  description: string;
  level: string;
  levelColor: string;
  bgColor: string;
  thumbnailUrl: string;
  modulesCount?: number;
  totalDuration?: string;
  subtitle?: string;
  instructor?: string;
  modules: CourseModule[];
  canManage?: boolean;
};

export type CourseProgress = {
  courseId: number;
  completedParts: string[];
  lastVisitedModule: number;
  lastVisitedPart: string;
  quizAnswers: Record<
    number,
    Record<string, number | string | boolean | string[]>
  >;
};

// ─── Accessories ──────────────────────────────────────────────
interface CoverColorAccessory {
  id: number;
  name: string;
  category: "Cover Photo Color";
  price: number;
  color: string;
  avatar?: never;
}

interface AvatarAccessory {
  id: number;
  name: string;
  category: "Profile Avatar";
  price: number;
  avatar: string;
  color?: never;
  targetRole?: Role | null;
}

export type Accessory = CoverColorAccessory | AvatarAccessory;
export type AccessoryCategory = Accessory["category"];

// ─── Attendance ───────────────────────────────────────────────
export type AttendanceRecord = {
  id: number;
  studentId: number;
  studentName: string;
  studentIdNumber: string;
  studentAvatar: string;
  status: AttendanceStatus;
  date?: string;
  centerId?: number;
  centerTitle?: string;
  facilitatorId?: number;
};

export type AttendanceSession = {
  id: number;
  centerId: number;
  centerName: string;
  date: string;
  records: AttendanceRecord[];
  savedBy: number;
};

// ─── Tickets ──────────────────────────────────────────────────
export type TicketStatus = "Open" | "In Progress" | "Resolved";
export type SenderRole = "student" | "facilitator";

export interface Ticket {
  id: number;
  senderId: number;
  senderRole: SenderRole;
  senderName: string;
  category: string;
  subject: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export type GetAllTicketsParams = {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  role?: SenderRole;
};

export type TicketsApiResponse = {
  data: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// ─── Gradebook ────────────────────────────────────────────────
export interface GradebookState {
  overallScore: number;
  overallPassed: boolean;
  modules: GradebookEntry[];
}

// ─── Component Props ──────────────────────────────────────────
export interface CourseCardProps {
  course: Course;
  onClick: (course: Course) => void;
}

export interface PersonalInfoProps {
  role: Role;
}

export type BankQuestion = Omit<QuizQuestion, "bankQuestionId"> & {
  courseId: number | null;
  createdById: number;
  createdByRole: "admin" | "facilitator";
  createdAt: string;
  updatedAt: string;
};
