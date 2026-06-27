// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import studentRoutes from "./routes/students";
import facilitatorRoutes from "./routes/facilitators";
import adminRoutes from "./routes/admins";
import centerRoutes from "./routes/centers";
import courseRoutes from "./routes/courses";
import progressRoutes from "./routes/progress";
import attendanceRoutes from "./routes/attendance";
import shopRoutes from "./routes/shop";
import ticketRoutes from "./routes/tickets";
import videoRoutes from "./routes/videos";
import thumbnailRoutes from "./routes/thumbnail";
import centerThumbnailRoutes from "./routes/centerThumbnail";
import fileRoutes from "./routes/files";
import submissionRoutes from "./routes/submission";
import courseImageRoutes from "./routes/courseImage";

import swaggerUi from "swagger-ui-express";

// ── Config
dotenv.config();

const requiredEnvVars = ["JWT_SECRET", "DATABASE_URL"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`CRITICAL: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === "development";

// ── Security & middleware
app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http://localhost:3000"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "http://localhost:3000"],
        mediaSrc: ["'self'", "http://localhost:3000"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

const defaultTauriOrigins = ["tauri://localhost", "http://tauri.localhost"];
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : defaultTauriOrigins;

app.use(
  cors({
    origin: isDev ? "*" : allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(morgan(isDev ? "dev" : "combined"));

// ── Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts, please try again later.",
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 500,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ── Health check
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Server is running.",
    ...(isDev && { timestamp: new Date() }),
  });
});

app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

// ── Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/students", apiLimiter, studentRoutes);
app.use("/api/facilitators", apiLimiter, facilitatorRoutes);
app.use("/api/admins", apiLimiter, adminRoutes);
app.use("/api/centers", apiLimiter, centerRoutes);
app.use("/api/courses", apiLimiter, courseRoutes);
app.use("/api/progress", apiLimiter, progressRoutes);
app.use("/api/attendance", apiLimiter, attendanceRoutes);
app.use("/api/shop", apiLimiter, shopRoutes);
app.use("/api/tickets", apiLimiter, ticketRoutes);
app.use("/api/videos", apiLimiter, videoRoutes);
app.use("/api/thumbnails", apiLimiter, thumbnailRoutes);
app.use("/api/center-thumbnails", apiLimiter, centerThumbnailRoutes);
app.use("/api/files", apiLimiter, fileRoutes);
app.use("/api/submissions", apiLimiter, submissionRoutes);
app.use("/api/content-images", courseImageRoutes);
// ── Swagger (development only)
if (isDev) {
  const swaggerSpec = {
    openapi: "3.0.0",
    info: {
      title: "APIIS LMS API",
      version: "1.0.0",
      description: "API documentation for APIIS LMS",
    },
    servers: [{ url: "http://localhost:3000/api" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/auth/admin/login": {
        post: {
          tags: ["Auth"],
          summary: "Admin login",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", example: "admin@example.com" },
                    password: { type: "string", example: "••••••••" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Login successful" } },
        },
      },
      "/auth/facilitator/login": {
        post: {
          tags: ["Auth"],
          summary: "Facilitator login",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string" },
                    password: { type: "string", example: "••••••••" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Login successful" } },
        },
      },
      "/auth/facilitator/signup": {
        post: {
          tags: ["Auth"],
          summary: "Facilitator signup",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "firstName", "lastName"],
                  properties: {
                    email: { type: "string" },
                    password: { type: "string", example: "••••••••" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Account created" } },
        },
      },
      "/auth/student/login": {
        post: {
          tags: ["Auth"],
          summary: "Student login",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["idNumber", "password"],
                  properties: {
                    idNumber: { type: "string", example: "16-0850-04" },
                    password: { type: "string", example: "••••••••" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Login successful" } },
        },
      },
      "/students": {
        get: {
          tags: ["Students"],
          summary: "Get all students",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "List of students" } },
        },
        post: {
          tags: ["Students"],
          summary: "Create student",
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["idNumber", "password", "firstName", "lastName"],
                  properties: {
                    idNumber: { type: "string", example: "18-1234-56" },
                    password: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    currentCenter: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Student created" } },
        },
      },
      "/students/{id}": {
        get: {
          tags: ["Students"],
          summary: "Get student by ID",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: { "200": { description: "Student data" } },
        },
        put: {
          tags: ["Students"],
          summary: "Update student",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: { "200": { description: "Student updated" } },
        },
        delete: {
          tags: ["Students"],
          summary: "Delete student",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: { "200": { description: "Student deleted" } },
        },
      },
      "/facilitators": {
        get: {
          tags: ["Facilitators"],
          summary: "Get all facilitators",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "List of facilitators" } },
        },
        post: {
          tags: ["Facilitators"],
          summary: "Create facilitator",
          security: [{ bearerAuth: [] }],
          responses: { "201": { description: "Facilitator created" } },
        },
      },
      "/facilitators/{id}": {
        get: {
          tags: ["Facilitators"],
          summary: "Get facilitator by ID",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: { "200": { description: "Facilitator data" } },
        },
        put: {
          tags: ["Facilitators"],
          summary: "Update facilitator",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: { "200": { description: "Facilitator updated" } },
        },
      },
      "/centers": {
        get: {
          tags: ["Centers"],
          summary: "Get all centers",
          responses: { "200": { description: "List of centers" } },
        },
        post: {
          tags: ["Centers"],
          summary: "Create center",
          security: [{ bearerAuth: [] }],
          responses: { "201": { description: "Center created" } },
        },
      },
      "/centers/{id}": {
        get: {
          tags: ["Centers"],
          summary: "Get center by ID",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: { "200": { description: "Center data" } },
        },
        put: {
          tags: ["Centers"],
          summary: "Update center",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: { "200": { description: "Center updated" } },
        },
        delete: {
          tags: ["Centers"],
          summary: "Delete center",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: { "200": { description: "Center deleted" } },
        },
      },
      "/courses": {
        get: {
          tags: ["Courses"],
          summary: "Get all courses",
          responses: { "200": { description: "List of courses" } },
        },
        post: {
          tags: ["Courses"],
          summary: "Create course",
          security: [{ bearerAuth: [] }],
          responses: { "201": { description: "Course created" } },
        },
      },
      "/courses/{id}": {
        get: {
          tags: ["Courses"],
          summary: "Get course by ID",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: { "200": { description: "Course data" } },
        },
        put: {
          tags: ["Courses"],
          summary: "Update course",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: { "200": { description: "Course updated" } },
        },
        delete: {
          tags: ["Courses"],
          summary: "Delete course",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: { "200": { description: "Course deleted" } },
        },
      },
      "/attendance": {
        post: {
          tags: ["Attendance"],
          summary: "Submit attendance",
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    centerId: { type: "number" },
                    date: { type: "string", example: "2026-03-06" },
                    records: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          studentId: { type: "number" },
                          status: {
                            type: "string",
                            enum: ["present", "absent"],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Attendance submitted" } },
        },
      },
      "/attendance/center/{centerId}": {
        get: {
          tags: ["Attendance"],
          summary: "Get attendance by center",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "centerId",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
            {
              name: "date",
              in: "query",
              schema: { type: "string", example: "2026-03-06" },
            },
          ],
          responses: { "200": { description: "Attendance records" } },
        },
      },
      "/attendance/{attendanceId}": {
        delete: {
          tags: ["Attendance"],
          summary: "Delete attendance record",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "attendanceId",
              in: "path",
              required: true,
              schema: { type: "number" },
            },
          ],
          responses: { "200": { description: "Attendance deleted" } },
        },
      },
      "/progress": {
        get: {
          tags: ["Progress"],
          summary: "Get student progress",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Progress data" } },
        },
      },
      "/progress/complete-part": {
        post: {
          tags: ["Progress"],
          summary: "Complete a part",
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["courseId", "moduleNumber", "partSlug"],
                  properties: {
                    courseId: { type: "number" },
                    moduleNumber: { type: "number" },
                    partSlug: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Part completed" } },
        },
      },
      "/progress/save-quiz": {
        post: {
          tags: ["Progress"],
          summary: "Save quiz answers",
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["courseId", "moduleNumber", "answers"],
                  properties: {
                    courseId: { type: "number" },
                    moduleNumber: { type: "number" },
                    answers: { type: "object" },
                    coinsToAward: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Quiz saved" } },
        },
      },
    },
  };

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec as any));
  console.log(`📚 Swagger UI available at http://localhost:${PORT}/api-docs`);
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
});

export default app;
