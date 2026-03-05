import { handlers } from "@/lib/auth";

// Re-export the HTTP handlers for NextAuth
export const { GET, POST } = handlers;
