import axios from "axios";
import { toast } from "sonner";
import { store } from "./store";
import { API_URL } from "../config/appConfig";

// Request deduplication cache to prevent duplicate requests
// Maps request signature (method + url + JSON.stringify(data)) to request promise
const requestCache = new Map();

// Set timeout for cache entries (300ms)
const DEDUPE_TIMEOUT = 300;

// Generate a unique client request ID
const generateRequestId = () => {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Debug logging helper for API calls
const logApiCall = (message, data) => {};

// Extract domain or IP from URL for logging
const getHostFromUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (e) {
    return "unknown-host";
  }
};

// Check if URL uses HTTPS
const isHttpsUrl = (url) => {
  try {
    return url.startsWith("https://");
  } catch (e) {
    return false;
  }
};



// Create axios instance with default config
const axiosInstance = axios.create({
  // CRITICAL FIX: Set baseURL to backend API
  baseURL: API_URL,
  // Base configuration
  timeout: 30000, // 30 second timeout
  headers: {
    "x-client-version": "1.6.0.198", // App version for debugging
    "x-client-platform": "web", // Platform identifier
    "x-client-origin":
      typeof window !== "undefined" ? window.location.origin : "unknown", // Origin tracking
    // Add custom header to help with CORS
    "x-frontend-url":
      typeof window !== "undefined" ? window.location.origin : "unknown",
  },
  // Accept 2xx-4xx but reject 429 (rate limited) so error interceptor can surface it
  validateStatus: function (status) {
    return status >= 200 && status < 500 && status !== 429;
  },
  // IMPORTANT: For production environments, we need proper CORS handling
  withCredentials: true, // Send cookies and authentication headers cross-origin
});

// Additional security headers for better CORS handling
axiosInstance.defaults.headers.common["Access-Control-Allow-Origin"] = "*";
axiosInstance.defaults.headers.common["Access-Control-Allow-Methods"] =
  "GET, POST, PUT, DELETE, OPTIONS";
axiosInstance.defaults.headers.common["Access-Control-Allow-Headers"] =
  "Origin, X-Requested-With, Content-Type, Accept, Authorization";



// Add request interceptor for authentication and deduplication
axiosInstance.interceptors.request.use(
  (config) => {
    // Get the current state from Redux store
    const state = store.getState();

    // Check if user is logged in and has a token
    if (state?.auth?.user?.token) {
      // Add token to request headers
      config.headers["Authorization"] = `Bearer ${state.auth.user.token}`;
    }

    // Generate a unique request ID for tracing
    const requestId = generateRequestId();
    config.headers["x-request-id"] = requestId;

    // Only deduplicate GET, POST, PUT, DELETE requests
    // Skip OPTIONS and other special requests
    const method = config.method?.toUpperCase();
    if (["GET", "POST", "PUT", "DELETE"].includes(method)) {
      // Create a request signature based on method, URL and data
      const signature = `${method}:${config.url}:${JSON.stringify(config.data || {})}`;

      // Check if an identical request is already in flight
      if (requestCache.has(signature)) {
        // Return the existing request promise to prevent duplicate
        const source = axios.CancelToken.source();
        config.cancelToken = source.token;
        source.cancel(`Duplicate request prevented: ${signature}`);
      } else {
        // Add this request to the cache
        requestCache.set(signature, true);

        // Remove from cache after timeout
        setTimeout(() => {
          requestCache.delete(signature);
        }, DEDUPE_TIMEOUT);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add response interceptor to handle authentication errors and cleanup request cache
axiosInstance.interceptors.response.use(
  (response) => {
    // Get request signature for cache cleanup
    const method = response.config.method?.toUpperCase();
    const url = response.config.url;
    const signature = `${method}:${url}:${JSON.stringify(response.config.data || {})}`;

    // Clean up the request cache

    // Clear the request from cache after completion
    if (
      response.config.method &&
      ["GET", "POST", "PUT", "DELETE"].includes(
        response.config.method.toUpperCase(),
      )
    ) {
      const signature = `${response.config.method.toUpperCase()}:${response.config.url}:${JSON.stringify(response.config.data || {})}`;
      requestCache.delete(signature);
    }

    return response;
  },
  async (error) => {
    // Don't handle axios cancellation errors (from our deduplication)
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    if (error.config) {
      const method = error.config.method?.toUpperCase();
      const url = error.config.url;
      const signature = `${method}:${url}:${JSON.stringify(error.config.data || {})}`;
      requestCache.delete(signature);
    }

    // Handle maintenance mode (503 Service Unavailable)
    if (error.response && error.response.status === 503) {
      // Check if the response indicates maintenance mode
      const responseData = error.response.data;
      if (responseData && responseData.isMaintenanceMode) {
        // Don't redirect if user is on a public route — let them browse freely
        const publicRoutes = [
          "/home",
          "/about",
          "/contact",
          "/login",
          "/maintenance",
          "/change-password",
        ];
        const currentPath = window.location.pathname;
        const isOnPublicRoute = publicRoutes.includes(currentPath);

        if (isOnPublicRoute) {
          return Promise.reject(error);
        }

        // Redirect to maintenance page if not already there
        if (!currentPath.includes("/maintenance")) {
          window.location.href = "/maintenance";
          return Promise.reject(error);
        }
      }
    }

    // Handle rate limiting (429 Too Many Requests)
    if (error.response && error.response.status === 429) {

      const retrySeconds = error.response.data?.retryAfterSeconds;
      sessionStorage.setItem(
        "rateLimited",
        JSON.stringify({ retrySeconds, ts: Date.now() }),
      );
      const msg = retrySeconds
        ? `Πάρα πολλά αιτήματα. Παρακαλώ περιμένετε ${Math.ceil(retrySeconds / 60)} λεπτά.`
        : "Πάρα πολλά αιτήματα. Παρακαλώ περιμένετε λίγο.";
      toast.error(msg, { id: "rate-limited", duration: 8000 });
    }

    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      const originalRequest = error.config;

      // If already retried, bail to login
      if (originalRequest._retry) {
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      // If a refresh is already in flight, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers["Authorization"] = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const state = store.getState();
        const refreshToken = state?.auth?.user?.refreshToken;
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(
          `${originalRequest.baseURL || ""}/api/users/refresh-token`,
          { refreshToken }
        );

        const newToken = data.token;
        // Update stored user with new token
        const storedUser = JSON.parse(
          localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"
        );
        if (storedUser.token) {
          storedUser.token = newToken;
          if (storedUser.refreshToken && data.refreshToken) {
            storedUser.refreshToken = data.refreshToken;
          }
          if (localStorage.getItem("user")) {
            localStorage.setItem("user", JSON.stringify(storedUser));
          } else {
            sessionStorage.setItem("user", JSON.stringify(storedUser));
          }
        }

        processQueue(null, newToken);
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
