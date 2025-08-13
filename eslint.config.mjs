import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  js.configs.recommended, // JS önerilen kurallar
  ...compat.extends("next/core-web-vitals", "next/typescript"), // Next.js + TS kuralları
  prettier, // Prettier ile çakışan kuralları kapatır
  {
    rules: {
      "no-unused-vars": "warn",
      "react/react-in-jsx-scope": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
