const path = require("path");
const https = require('https');
const fs = require('fs');
const express = require("express");
const dotenv = require("dotenv");
const colors = require("colors");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { errorHandler } = require("./middleware/errorMiddleware");
const { setSchoolContext } = require("./middleware/schoolIdMiddleware");
const { connectDB } = require("./config/db");
const webpush = require("web-push");

// Load environment variables
dotenv.config();

// Connect to the single MongoDB database for multi-tenancy
connectDB()
  .then(async () => {
    console.log("MongoDB Connected with multi-tenant configuration".cyan.bold);

    // Run migrations on startup
    try {
      // Update all admin users with correct permissions
      const migrationResult = await updateAllAdminPermissions();
      console.log(
        `Admin permissions migration result: ${migrationResult.updatedCount} users updated`
          .green
      );
      
      // Add pushNotificationEnabled field to users who don't have it
      const pushMigrationResult = await addPushNotificationEnabledField();
      console.log(
        `Push notification migration result: ${pushMigrationResult.updated} users updated`
          .green
      );
    } catch (error) {
      console.error(`Migration error: ${error.message}`.red);
    }
  })
  .catch((err) => {
    console.error(`MongoDB Connection Error: ${err.message}`.red.bold);
    process.exit(1);
  });

// Set up web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log('✅ VAPID keys configured successfully');
  } catch (error) {
    console.warn('⚠️  VAPID key configuration failed (push notifications disabled):', error.message);
  }
} else {
  console.log('ℹ️  VAPID keys not configured - push notifications disabled');
}

const app = express();

// Configure Express to trust proxy headers to fix rate-limit warnings
// This is required when running behind reverse proxies (Cloudflare, Netlify, etc.)
if (process.env.NODE_ENV === 'production') {
  // Trust first proxy in production (Cloudflare, load balancers, etc.)
  app.set('trust proxy', 1);
  console.log('[PROXY] Trust proxy enabled for production environment'.cyan);
} else {
  // Trust all proxies in development for testing
  app.set('trust proxy', true);
  console.log('[PROXY] Trust proxy enabled for development environment'.cyan);
}

// Middleware
// Enhanced CORS configuration for production deployment
const allowedOrigins = [
  process.env.FRONTEND_URL, // Environment variable if set
  "http://localhost:5000", // Local development
  "https://localhost:5000" // Local HTTPS development
];


// Log confirmation of frontend URL
console.log('[SERVER] Frontend URL set to:', process.env.FRONTEND_URL);
console.log('[SERVER] HTTPS enforced for all API connections');

// No need for dynamic domains since we know the exact URL
if (process.env.NODE_ENV === 'production') {
  console.log('[CORS] Production environment detected - using fixed Netlify domain');
}

// Log allowed origins for debugging
console.log('[CORS] Allowed origins:', allowedOrigins.filter(origin => origin));

// Configure enhanced CORS with better security & compatibility
// Special CORS handling for public endpoints
app.use('/api/system/maintenance/status', cors({
  origin: '*', // Allow all origins for maintenance status (public endpoint)
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: false
}));

const corsOptions = {
  origin: function (origin, callback) {
    console.log('[CORS] Request from origin:', origin);

    // PRODUCTION SECURITY: STRICT ORIGIN VALIDATION ONLY
    if (process.env.NODE_ENV === 'production') {
      // NO bypass allowed in production - SECURITY FIRST
      if (!origin) {
        console.error('[CORS] BLOCKED: No origin header in production request');
        const error = new Error('CORS policy: Origin required in production');
        error.status = 403;
        return callback(error, false);
      }
      
      // Only allow exact frontend domain in production
      if (origin !== process.env.FRONTEND_URL) {
        console.error(`[CORS] BLOCKED: Unauthorized origin: ${origin}`);
        const error = new Error(`CORS policy: Origin ${origin} not authorized`);
        error.status = 403;
        return callback(error, false);
      }
      
      console.log(`[CORS] AUTHORIZED: ${origin}`);
      return callback(null, true);
    }

    // Development mode - allow localhost origins only
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      console.log(`[CORS] Dev mode - allowed: ${origin || 'no-origin'}`);
      return callback(null, true);
    }
    
    // Reject all unauthorized origins
    console.error(`[CORS] BLOCKED: Unauthorized origin: ${origin}`);
    const error = new Error(`CORS policy: Origin ${origin} not authorized`);
    error.status = 403;
    return callback(error, false);
  },
  // Extended methods and headers for better compatibility
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-requested-with",
    "x-client-version",
    "x-client-platform",
    "x-client-origin",
    "x-frontend-url",
    "x-request-id",
    "cache-control",
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Methods",
    "Access-Control-Allow-Headers"
  ],
  exposedHeaders: [
    "X-Request-ID",
    "X-Server-ID"
  ],
  credentials: true, // Important for authentication
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request tracking to help debug duplicate requests
app.use((req, res, next) => {
  // Generate unique ID for this request
  const requestId = Math.random().toString(36).substring(2, 15);
  const startTime = Date.now();

  // Add custom header to response to identify source server and prevent duplicates
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Server-ID', 'backend-server-v1');

  // Debug log for request start
  console.log(`[REQUEST ${requestId}] ${req.method} ${req.path} started at ${new Date().toISOString()}`);
  console.log(`[REQUEST ${requestId}] Headers: ${JSON.stringify(req.headers['user-agent'])}`);

  // Add response finished event logging
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[REQUEST ${requestId}] ${req.method} ${req.path} completed with ${res.statusCode} in ${duration}ms`);
  });

  next();
});

// Add middleware to handle API URLs with trailing slashes
// This must be added BEFORE the API routes
app.use((req, res, next) => {
  // Only apply to API routes with trailing slashes
  if (
    req.path.startsWith("/api/") &&
    req.path.length > 5 &&
    req.path.endsWith("/")
  ) {
    // Remove the trailing slash and redirect
    const normalizedPath = req.path.slice(0, -1);
    console.log(
      `[API URL Normalizer] Redirecting ${req.path} to ${normalizedPath}`
    );

    // Preserve query parameters if any
    const queryString =
      Object.keys(req.query).length > 0
        ? "?" + new URLSearchParams(req.query).toString()
        : "";

    // 307 preserves the HTTP method (GET, POST, etc)
    return res.redirect(307, normalizedPath + queryString);
  }
  next();
});

// Import logger for consistent detailed logging
const logger = require("./utils/logger");

// Health check endpoint for Render deployment
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// CRITICAL SECURITY: Block ALL external requests (curl, postman, direct HTTP)
// This blocks requests that bypass browser CORS protection
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const userAgent = req.headers['user-agent'] || '';
  const host = req.headers.host;
  
  logger.info('SECURITY', 'Request validation', {
    ip: req.ip,
    origin: origin || 'NO_ORIGIN',
    referer: referer || 'NO_REFERER', 
    userAgent: userAgent,
    host: host,
    path: req.path,
    method: req.method
  });
  
  // Allow health check to pass through
  if (req.path === '/health') {
    return next();
  }
  
  // PRODUCTION: Strict validation - BLOCK ALL external requests
  if (process.env.NODE_ENV === 'production') {
    // Must have origin from authorized frontend
    if (!origin || origin !== process.env.FRONTEND_URL) {
      logger.warn('SECURITY', 'BLOCKED: Unauthorized origin in production', {
        ip: req.ip,
        origin: origin || 'MISSING',
        userAgent: userAgent,
        path: req.path
      });
      return res.status(403).json({ 
        error: 'Access denied', 
        code: 'UNAUTHORIZED_ORIGIN',
        message: 'This API only accepts requests from authorized frontend applications'
      });
    }
    
    // Must have referer from authorized frontend 
    if (!referer || !referer.startsWith(process.env.FRONTEND_URL)) {
      logger.warn('SECURITY', 'BLOCKED: Invalid referer in production', {
        ip: req.ip,
        referer: referer || 'MISSING',
        userAgent: userAgent,
        path: req.path
      });
      return res.status(403).json({ 
        error: 'Access denied',
        code: 'INVALID_REFERER',
        message: 'Invalid request source' 
      });
    }
    
    // Block suspicious user agents (curl, postman, wget, etc)
    const suspiciousAgents = ['curl', 'postman', 'wget', 'httpie', 'insomnia', 'rest-client', 'python-requests'];
    const isSuspicious = suspiciousAgents.some(agent => 
      userAgent.toLowerCase().includes(agent.toLowerCase())
    );
    
    if (isSuspicious || !userAgent || userAgent.length < 10) {
      logger.warn('SECURITY', 'BLOCKED: Suspicious user agent', {
        ip: req.ip,
        userAgent: userAgent || 'MISSING',
        path: req.path,
        isSuspicious: isSuspicious
      });
      return res.status(403).json({ 
        error: 'Access denied',
        code: 'SUSPICIOUS_CLIENT',
        message: 'Direct API access not allowed'
      });
    }
  }
  
  // Development mode: Still block obvious external tools
  if (process.env.NODE_ENV !== 'production') {
    const suspiciousAgents = ['curl', 'postman', 'wget', 'httpie'];
    const isSuspicious = suspiciousAgents.some(agent => 
      userAgent.toLowerCase().includes(agent.toLowerCase())
    );
    
    if (isSuspicious) {
      logger.warn('SECURITY', 'BLOCKED: External tool in dev mode', {
        ip: req.ip,
        userAgent: userAgent,
        path: req.path
      });
      return res.status(403).json({ 
        error: 'Access denied',
        code: 'EXTERNAL_TOOL_BLOCKED',
        message: 'External API tools are blocked. Use the frontend application.'
      });
    }
  }
  
  logger.info('SECURITY', 'Request authorized', {
    ip: req.ip,
    path: req.path,
    userAgent: userAgent.substring(0, 50) + '...'
  });
  
  next();
});

// Import migrations
const { updateAllAdminPermissions } = require("./utils/migrations");
const { addPushNotificationEnabledField } = require("./migrations/addPushNotificationEnabled");

// CRITICAL: System maintenance STATUS route must be completely public
// Register the public status endpoint BEFORE any auth middleware
app.get('/api/system/maintenance/status', require('./controllers/systemMaintenanceController').getMaintenanceStatus);

// System maintenance admin routes (protected)
app.use("/api/system/maintenance", require("./routes/systemMaintenanceRoutes"));

// User routes - No global middleware for auth checking, each route will handle individually
app.use("/api/users", require("./routes/userRoutes"));

// Setup global middleware for the main routes - all routes here need auth & school context
const { protect, checkMaintenanceMode } = require("./middleware/authMiddleware");
const {
  addFeatureFlags,
  checkCalendarEnabled,
  checkRatingEnabled
} = require("./middleware/featureToggleMiddleware");

// Setup routes that need school context middlewares
// Add the feature flags middleware to all routes so they have access to feature information
app.use(
  "/api/contacts",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/contactRoutes")
); // Contact form

// Public patch notes route (no authentication required)
app.get(
  "/api/patch-notes/public",
  async (req, res) => {
    try {
      const PatchNote = require('./models/patchNoteModel');
      // Only return active patch notes for public endpoint
      const patchNotes = await PatchNote.find({ isActive: true })
        .sort({ createdAt: -1 })
        .select('title version type createdAt') // Only return essential fields for security
        .lean();
      
      console.log('Public patch notes requested - returning', patchNotes.length, 'active patch notes');
      
      res.status(200).json(patchNotes);
    } catch (error) {
      console.error('Error retrieving public patch notes:', error);
      res.status(500).json({ message: 'Failed to retrieve patch notes' });
    }
  }
);

app.use(
  "/api/patch-notes",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/patchNoteRoutes")
); // Protected patch notes
app.use(
  "/api/directions",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/directionRoutes")
); // Directions API
app.use(
  "/api/subjects",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/subjectRoutes")
); // Subjects API
app.use(
  "/api/students",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/studentRoutes")
); // Students API
// Grade Analysis API - MUST come before general grade routes to avoid conflicts
app.use(
  "/api/grades",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/gradeAnalysisRoutes")
); // Grade Analysis API (specific routes first)
app.use(
  "/api/grades",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/gradeRoutes")
); // Grades API (general routes second)
app.use(
  "/api/classes",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/classRoutes")
); // Classes API (new)
app.use(
  "/api/schedule",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/scheduleRoutes")
); // Schedule API
app.use(
  "/api/stats",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/studentStatsRoutes")
); // Student Statistics API
app.use(
  "/api/notifications",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/notificationRoutes")
); // Notifications API
app.use(
  "/api/payments",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  require("./routes/paymentRoutes")
); // Payments API

// Feature-toggled routes - these routes require specific features to be enabled
app.use(
  "/api/ratings",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  checkRatingEnabled,
  require("./routes/ratingRoutes")
); // Rating system API
app.use(
  "/api/events",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  checkCalendarEnabled,
  require("./routes/eventRoutes")
); // Calendar Events API

// Attendance System Routes
app.use(
  "/api/sessions",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/sessionRoutes")
); // Sessions API
app.use(
  "/api/attendance",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/classAttendanceRoutes")
); // Class Attendance API
app.use(
  "/api/reports",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/reportingRoutes")
); // Attendance Reports API

logger.info("SERVER", "Routes configured with proper middleware ordering");

// Add essential middleware AFTER route definitions but BEFORE frontend serving
// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Add API request validation middleware for production
if (process.env.NODE_ENV === 'production') {
  app.use('/api', (req, res, next) => {
    const referer = req.headers.referer || '';
    const origin = req.headers.origin || '';
    
    const isValidReferer = referer.includes('grademanager.netlify.app') ||
                          referer.includes('gradebook.pro') ||
                          referer.includes('gradebookbeta.netlify.app');
                          
    const isValidOrigin = origin.includes('grademanager.netlify.app') ||
                         origin.includes('gradebook.pro') ||
                         origin.includes('gradebookbeta.netlify.app');

    console.log(`[API Security] ${req.method} ${req.originalUrl} - Valid: ${isValidReferer || isValidOrigin}`);

    if (!isValidReferer && !isValidOrigin) {
      console.error('[API Security] Blocked direct API access without proper headers');
      return res.status(403).json({
        success: false,
        message: 'Access denied: Direct API access not permitted'
      });
    }
    
    next();
  });
}

// Routes that may access multiple schools or don't require schoolId filtering
app.use("/api/schools", require("./routes/schoolRoutes")); // School routes have special handling

app.use(
  "/api/school-permissions",
  protect,
  checkMaintenanceMode,
  require("./routes/schoolPermissionsRoutes")
); // School permissions management
app.use("/api/branches", protect, checkMaintenanceMode, require("./routes/branchRoutes")); // School branch name lookups
app.use("/api/contact", protect, checkMaintenanceMode, require("./routes/contactRoutes")); // Contact messages for admin/superadmin
app.use("/api/subscriptions", require("./routes/subscriptionRoutes")); // Push notification subscriptions (includes VAPID public key)
app.use("/api/superadmin", require("./routes/superAdminRoutes")); // Superadmin routes bypass schoolId filtering
app.use("/api/maintenance-announcements", protect, require("./routes/maintenanceAnnouncementRoutes")); // Maintenance announcements

// Add catch-all for unmatched API routes to return proper JSON errors
app.use('/api/*', (req, res) => {
  console.log(`[API 404] Unmatched API route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    error: 'Route not found'
  });
});

// Add stats overview endpoint for admin dashboard
app.get("/api/stats/overview", protect, async (req, res) => {
  try {
    // Basic stats endpoint for admin dashboard
    const stats = {
      totalUsers: 0,
      totalStudents: 0,
      totalTeachers: 0,
      totalClasses: 0,
      totalNotifications: 0,
      message: 'Stats endpoint is working but requires implementation',
      timestamp: new Date().toISOString()
    };
    
    console.log('[STATS] Overview requested by user:', req.user?.role, req.user?._id);
    res.json(stats);
  } catch (error) {
    console.error('[STATS] Error fetching overview:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching stats overview',
      error: error.message 
    });
  }
});

// Migration routes removed - migration system has been discontinued

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  // List all files in the directory to debug
  const fs = require("fs");

  // Try multiple possible build locations
  const possibleBuildPaths = [
    path.join(__dirname, "../frontend/build"),
    path.join(__dirname, "../build"),
    path.join(__dirname, "../../frontend/build"),
    path.join(__dirname, "/frontend/build")
  ];

  let staticPath = null;
  let indexPath = null;

  console.log("Looking for build directory in these locations:");
  possibleBuildPaths.forEach((pathToCheck, i) => {
    const exists = fs.existsSync(pathToCheck);
    console.log(
      `${i + 1}. ${pathToCheck} - ${exists ? "EXISTS" : "NOT FOUND"}`
    );
    if (exists && !staticPath) {
      staticPath = pathToCheck;
      indexPath = path.join(pathToCheck, "index.html");

      // List files in build directory
      console.log("\nFiles in build directory:");
      try {
        const files = fs.readdirSync(pathToCheck);
        files.forEach((file) => {
          console.log(
            `- ${file} ${
              fs.statSync(path.join(pathToCheck, file)).isDirectory()
                ? "(directory)"
                : ""
            }`
          );
        });
      } catch (err) {
        console.error("Error reading directory:", err);
      }
    }
  });

  if (staticPath) {
    console.log("\nUsing static files from:", staticPath);
    console.log("Index.html path:", indexPath);
    console.log(
      "Checking if index.html exists:",
      fs.existsSync(indexPath) ? "YES" : "NO"
    );

    // First serve static files (important: this must come BEFORE the catch-all route)
    app.use(express.static(staticPath));

    // Add a special debug route to test if the server is serving static files correctly
    app.get("/appinfo", (req, res) => {
      res.json({
        success: true,
        message: "App info debug endpoint",
        serverTime: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        availableRoutes: [
          "/app",
          "/app/profile",
          "/app/notifications",
          "/dashboard"
        ]
      });
    });

    // CRITICAL: Make sure API routes are defined BEFORE the catch-all route
    // This is already done above with app.use('/api/...')

    // Enhanced proxy trust for Nginx reverse proxy setup
    app.set('trust proxy', true);
    app.use((req, res, next) => {
      // Log X-Forwarded headers from Nginx for debugging
      if (process.env.NODE_ENV === 'production') {
        console.log('[PROXY] X-Forwarded-For:', req.headers['x-forwarded-for']);
        console.log('[PROXY] X-Forwarded-Proto:', req.headers['x-forwarded-proto']);
        console.log('[PROXY] X-Real-IP:', req.headers['x-real-ip']);

        // Force HTTPS if behind proxy and not already HTTPS
        if (req.headers['x-forwarded-proto'] === 'http') {
          console.log('[PROXY] Redirecting to HTTPS');
          return res.redirect(`https://${req.headers.host}${req.url}`);
        }
      }
      next();
    });

    // Define known protected route patterns that need special handling
    const protectedRoutePatterns = [
      "/app/*",
      "/admin*",
      "/teacher*",
      "/profile",
      "/notifications",
      "/grades*",
      "/settings*",
      "/dashboard"
    ];

    // Handle all protected routes
    protectedRoutePatterns.forEach((pattern) => {
      if (pattern === "/app/*") {
        // Handle /app/* directly without redirection
        app.get("/app/*", (req, res) => {
          console.log(
            `Serving index.html for ${pattern} route: ${req.originalUrl}`
          );
          if (!fs.existsSync(indexPath)) {
            console.error(
              "ERROR: index.html does not exist at path:",
              indexPath
            );
            return res
              .status(500)
              .send(
                "Frontend build files not found. Please check server configuration."
              );
          }
          return res.sendFile(indexPath);
        });
      } else {
        // Add redirection for routes that should be under /app
        const basePattern = pattern.replace("*", "");
        app.get(pattern, (req, res) => {
          const targetUrl = `/app${req.originalUrl}`;
          console.log(`Redirecting ${basePattern} route to ${targetUrl}`);
          return res.redirect(targetUrl);
        });
      }
    });

    // Add special route for dashboard
    app.get("/dashboard", (req, res) => {
      console.log("Redirecting /dashboard to /app/dashboard");
      return res.redirect("/app/dashboard");
    });

    // IMPORTANT: This catch-all must be the LAST middleware registered!
    // For all other NON-API routes, serve index.html
    app.get("*", (req, res) => {
      // CRITICAL: Never intercept API routes - they should have been handled by now
      if (req.originalUrl.startsWith("/api/")) {
        console.error(`[FRONTEND CATCH-ALL] API route ${req.originalUrl} reached catch-all - this should not happen!`);
        return res.status(404).json({
          success: false,
          message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
          error: 'Route not registered properly'
        });
      }

      console.log(`[FRONTEND] Serving index.html for client-side route: ${req.originalUrl}`);

      if (!fs.existsSync(indexPath)) {
        console.error("ERROR: index.html does not exist at path:", indexPath);
        return res.status(500).send("Frontend build files not found. Please check server configuration.");
      }

      // Send the React app's index.html for all client-side routes
      return res.sendFile(indexPath);
    });
  } else {
    console.error(
      "CRITICAL ERROR: Could not find build directory in any location!"
    );
    app.get("*", (req, res) => {
      res
        .status(500)
        .send(
          "Build directory not found. Please check deployment configuration."
        );
    });
  }
} else {
  app.get("/", (req, res) => res.send("API is running..."));
}

// Error middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Create SSL folder if it doesn't exist
const sslDir = path.join(__dirname, 'ssl');
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
  console.log(`Created SSL directory at ${sslDir}`.cyan);
}

// Implement HTTPS server
// Implement server startup with Cloudflare Tunnel priority
try {
  // Check for Cloudflare Tunnel mode FIRST (highest priority)
  if (process.env.NODE_ENV === 'production' && process.env.USE_CLOUDFLARE_TUNNEL === 'true') {
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on localhost:${PORT} (Cloudflare Tunnel)`.green.bold);
      console.log('🔒 Using Cloudflare Tunnel for HTTPS termination at backend.gradebook.pro'.cyan);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL}`.cyan);
    });
  } else {
    // Check for existing SSL certificates for HTTPS mode
    const keyPath = path.join(__dirname, 'ssl', 'private.key');
    const certPath = path.join(__dirname, 'ssl', 'certificate.crt');

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      // Load SSL certificates and create HTTPS server
      const sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
        minVersion: 'TLSv1.2',
        ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA',
        secureOptions: require('constants').SSL_OP_NO_SSLv2 | require('constants').SSL_OP_NO_SSLv3,
        honorCipherOrder: true
      };

      const httpsServer = https.createServer(sslOptions, app);

      httpsServer.listen(PORT, () => {
        console.log(`HTTPS Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.green.bold);
        console.log(`Frontend URL: ${process.env.FRONTEND_URL}`.cyan);
        console.log('SSL/HTTPS enabled successfully!'.green);
      });

      // Add error handlers
      httpsServer.on('error', (error) => {
        console.error('[HTTPS] Server Error:', error);
      });

      httpsServer.on('tlsClientError', (err, tlsSocket) => {
        console.error(`[TLS ERROR] Client IP: ${tlsSocket.remoteAddress}, Error: ${err.message}`);
      });

      httpsServer.on('clientError', (err, socket) => {
        console.error(`[CLIENT ERROR] ${err.message} from ${socket.remoteAddress}`);
      });

      httpsServer.on('secureConnection', (tlsSocket) => {
        console.log('[HTTPS] New secure connection:'.cyan);
        console.log(`   Protocol: ${tlsSocket.getProtocol()}`.green);
        console.log(`   Cipher: ${tlsSocket.getCipher().name}`.green);
        console.log(`   Client: ${tlsSocket.remoteAddress}`.green);
      });
    } else {
      // Fallback to HTTP if no SSL certificates
      app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on HTTP port ${PORT}`.yellow.bold);
        console.log('WARNING: Running in HTTP mode (not secure)!'.red.bold);
      });
    }
  }
} catch (error) {
  console.error('Server failed to start:'.red, error.message);
  console.log('Falling back to HTTP server'.yellow);

  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on HTTP port ${PORT}`.yellow.bold);
    console.log('WARNING: Running in HTTP mode (not secure)!'.red.bold);
  });
}