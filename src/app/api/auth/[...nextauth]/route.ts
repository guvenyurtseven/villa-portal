import { handlers, authOptions } from "@/lib/auth";

// Re-export the HTTP handlers for NextAuth
export const { GET, POST } = handlers;

// Re-export authOptions so other modules can import from this path if they prefer
export { authOptions };
