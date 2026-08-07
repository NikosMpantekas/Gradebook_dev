/**
 * Backend Logger — Pino wrapper
 * Same API as before: logger.info('CATEGORY', 'message', data)
 */

const pino = require("pino");

const isProduction = process.env.NODE_ENV === "production";

const pinoLogger = pino({
  level: isProduction ? "info" : "debug",
  // In dev: readable colored output. In prod: raw JSON to stdout (PM2 captures it).
  ...(!isProduction && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:standard" },
    },
  }),
});

// Wrap pino to accept the existing (category, message, data) signature
const wrap = (pinoLevel) => (category, message, data) => {
  if (data instanceof Error) {
    pinoLogger[pinoLevel]({ category, err: data }, message);
  } else {
    pinoLogger[pinoLevel]({ category, ...(data && { data }) }, message);
  }
};

module.exports = {
  debug: wrap("debug"),
  info: wrap("info"),
  warn: wrap("warn"),
  error: wrap("error"),
  critical: wrap("fatal"),
  logError: (category, message, err) => wrap("error")(category, message, err),
  configure: () => {},
  LOG_LEVELS: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4 },
};
