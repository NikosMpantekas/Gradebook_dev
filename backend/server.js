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

// Set environment variable for use in other parts of the app
process.env.FRONTEND_URL = "https://gradebook.pro";
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
const corsOptions = {
  origin: function (origin, callback) {
    console.log('[CORS] Request from origin:', origin);

    // FOR TESTING ONLY: Allow all origins temporarily to diagnose issues
    // This should be removed after testing
    if (process.env.NODE_ENV === 'production' && process.env.CORS_BYPASS === 'true') {
      console.warn('[CORS] WARNING: CORS bypass enabled in production - SECURITY RISK');
      return callback(null, true);
    }

    // In development, allow requests with no origin (like curl, Postman)
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        // For now, allow no-origin requests in production for troubleshoot
        console.warn('[CORS] Allowing no-origin request in production for troubleshooting');
        return callback(null, true);
      } else {
        console.log('[CORS] Request with no origin allowed in development');
        return callback(null, true);
      }
    }

    // More flexible origin checking - exact match or pattern matching
    const originMatches = allowedOrigins.some(allowedOrigin => {
      // Exact match
      if (allowedOrigin === origin) return true;

      // Netlify subdomain pattern match


      return false;
    });

    if (originMatches) {
      console.log('[CORS] Origin allowed:', origin);
      return callback(null, true);
    }

    // Block disallowed origins but log them thoroughly
    console.error('[CORS] Origin blocked:', origin);
    console.error('[CORS] Allowed origins:', allowedOrigins);
    return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
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

// Health check endpoint for Render deployment
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// EMERGENCY DIAGNOSTIC ROUTE - for debugging deployment issues
app.get("/emergency-diagnostics", (req, res) => {
  console.log("EMERGENCY DIAGNOSTICS ENDPOINT ACCESSED");

  // Get information about the environment
  const diagnosticInfo = {
    environment: process.env.NODE_ENV,
    port: process.env.PORT,
    mongoUriExists: !!process.env.MONGO_URI,
    jwtSecretExists: !!process.env.JWT_SECRET,
    headers: req.headers,
    buildDirectories: {
      staticPath: path.join(__dirname, "../frontend/build"),
      staticPathExists: require("fs").existsSync(
        path.join(__dirname, "../frontend/build")
      ),
      indexPath: path.resolve(
        __dirname,
        "../",
        "frontend",
        "build",
        "index.html"
      ),
      indexPathExists: require("fs").existsSync(
        path.resolve(__dirname, "../", "frontend", "build", "index.html")
      )
    },
    serverUptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    time: new Date().toISOString()
  };

  if (diagnosticInfo.buildDirectories.staticPathExists) {
    try {
      // List files in build directory
      const files = require("fs").readdirSync(
        diagnosticInfo.buildDirectories.staticPath
      );
      diagnosticInfo.buildDirectories.files = files;

      // Check if index.html has content
      if (diagnosticInfo.buildDirectories.indexPathExists) {
        const indexContent = require("fs").readFileSync(
          diagnosticInfo.buildDirectories.indexPath,
          "utf8"
        );
        diagnosticInfo.buildDirectories.indexContentLength =
          indexContent.length;
        diagnosticInfo.buildDirectories.indexContentPreview =
          indexContent.substring(0, 100) + "...";
      }
    } catch (err) {
      diagnosticInfo.buildDirectories.error = err.message;
    }
  }

  // Create simple HTML response with diagnostic info
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>GradeBook Emergency Diagnostics</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
        h1 { color: #333; }
        .success { color: green; }
        .error { color: red; }
      </style>
    </head>
    <body>
      <h1>GradeBook Emergency Diagnostics</h1>
      <h2>Server Environment</h2>
      <pre>${JSON.stringify(diagnosticInfo, null, 2)}</pre>

      <h2>Manual Authentication Test</h2>
      <form id="authForm" action="/api/users/login" method="post">
        <div>
          <label for="email">Email:</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div style="margin-top: 10px;">
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required>
        </div>
        <div style="margin-top: 10px;">
          <button type="submit">Test Login</button>
        </div>
      </form>

      <div id="result" style="margin-top: 20px;"></div>

      <script>
        document.getElementById('authForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;

          try {
            const response = await fetch('/api/users/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            const resultDiv = document.getElementById('result');
            if (response.ok) {
              resultDiv.innerHTML =
                '<div class="success">Login Successful!</div>' +
                '<h3>Auth Data:</h3>' +
                '<pre>' + JSON.stringify(data, null, 2) + '</pre>';

              // Store token for testing
              localStorage.setItem('testToken', data.token);

              // Test a protected endpoint
              if (data.token) {
                const meResponse = await fetch('/api/users/me', {
                  headers: {
                    'Authorization': 'Bearer ' + data.token
                  }
                });

                const meData = await meResponse.json();
                resultDiv.innerHTML +=
                  '<h3>Protected Endpoint Test:</h3>' +
                  '<pre>' + JSON.stringify(meData, null, 2) + '</pre>';
              }
            } else {
              resultDiv.innerHTML =
                '<div class="error">Login Failed</div>' +
                '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            }
          } catch (error) {
            document.getElementById('result').innerHTML =
              '<div class="error">Error: ' + error.message + '</div>';
          }
        });
      </script>
    </body>
    </html>
  `;

  res.send(htmlContent);
});

// Import logger for consistent detailed logging
const logger = require("./utils/logger");

// Import migrations
const { updateAllAdminPermissions } = require("./utils/migrations");

// User routes - No global middleware for auth checking, each route will handle individually
app.use("/api/users", require("./routes/userRoutes"));

// Setup global middleware for the main routes - all routes here need auth & school context
const { protect } = require("./middleware/authMiddleware");
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
  setSchoolContext,
  addFeatureFlags,
  require("./routes/contactRoutes")
); // Contact form
app.use(
  "/api/patch-notes",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/patchNoteRoutes")
); // Patch notes
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
  setSchoolContext,
  addFeatureFlags,
  require("./routes/studentRoutes")
); // Students API
// Grade Analysis API - MUST come before general grade routes to avoid conflicts
app.use(
  "/api/grades",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/gradeAnalysisRoutes")
); // Grade Analysis API (specific routes first)
app.use(
  "/api/grades",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/gradeRoutes")
); // Grades API (general routes second)
app.use(
  "/api/classes",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/classRoutes")
); // Classes API (new)
app.use(
  "/api/schedule",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/scheduleRoutes")
); // Schedule API
app.use(
  "/api/stats",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/studentStatsRoutes")
); // Student Statistics API
app.use(
  "/api/notifications",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/notificationRoutes")
); // Notifications API

// Feature-toggled routes - these routes require specific features to be enabled
app.use(
  "/api/ratings",
  protect,
  setSchoolContext,
  addFeatureFlags,
  checkRatingEnabled,
  require("./routes/ratingRoutes")
); // Rating system API
app.use(
  "/api/events",
  protect,
  setSchoolContext,
  addFeatureFlags,
  checkCalendarEnabled,
  require("./routes/eventRoutes")
); // Calendar Events API

logger.info("SERVER", "Routes configured with proper middleware ordering");

// Routes that may access multiple schools or don't require schoolId filtering
app.use("/api/schools", require("./routes/schoolRoutes")); // School routes have special handling
app.use(
  "/api/school-permissions",
  protect,
  require("./routes/schoolPermissionsRoutes")
); // School permissions management
app.use("/api/branches", protect, require("./routes/branchRoutes")); // School branch name lookups
app.use("/api/contact", protect, require("./routes/contactRoutes")); // Contact messages for admin/superadmin
app.use("/api/subscriptions", require("./routes/subscriptionRoutes")); // Push notification subscriptions (includes VAPID public key)

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
app.use("/api/superadmin", require("./routes/superAdminRoutes")); // Superadmin routes bypass schoolId filtering
app.use("/api/ratings", require("./routes/ratingRoutes")); // Rating system for teachers and subjects

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    // Log request body but hide sensitive info
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = "[HIDDEN]";
    console.log("Request body:", JSON.stringify(sanitizedBody));
  }
  next();
});

// Add rate limiting middleware for security
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
    message: "Too many requests from this IP, please try again later"
  })
);

// Add API request validation middleware
app.use('/api', (req, res, next) => {
  // Only allow requests with proper headers in production
  if (process.env.NODE_ENV === 'production') {
    // Check for required custom header or referer from our frontend
    const referer = req.headers.referer || '';
    const isValidReferer = referer.includes('grademanager.netlify.app') ||
                          referer.includes('gradebook.pro');

    // Log referer info for debugging
    console.log(`[API Security] Request referer: ${referer}`);

    // Block requests without proper origin/referer in production
    if (!isValidReferer && !req.headers.origin) {
      console.error('[API Security] Blocked direct API access without proper headers');
      return res.status(403).json({
        success: false,
        message: 'Access denied: Direct API access not permitted'
      });
    }
  }

  next();
});

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

    // IMPORTANT: Fix the order of middleware - this must be the LAST middleware registered!
    // For all other routes, serve index.html
    app.use("*", (req, res, next) => {
      // CRITICAL: Don't intercept API routes - they should be handled by their own handlers
      if (req.originalUrl.startsWith("/api/")) {
        console.log(
          `API route detected, skipping catch-all for: ${req.originalUrl}`
        );
        return next();
      }

      console.log(
        `Serving index.html for client-side route: ${req.originalUrl}`
      );

      if (!fs.existsSync(indexPath)) {
        console.error("ERROR: index.html does not exist at path:", indexPath);
        return res
          .status(500)
          .send(
            "Frontend build files not found. Please check server configuration."
          );
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