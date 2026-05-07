// eslint.config.js
import js from "@eslint/js";
import globals from "globals";

export default [
    {
        ignores: ["dist/**", "node_modules/**"],
    },

    js.configs.recommended,

    // Express / Node backend
    {
        files: ["server/**/*.js", "backend/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module", // use "commonjs" if you use require/module.exports
            globals: globals.node,
        },
        rules: {
            "no-console": "off",
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        },
    },

    // Vite frontend
    {
        files: ["src/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: globals.browser,
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-undef": "error",
        },
    },
];