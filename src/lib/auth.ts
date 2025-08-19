import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createServiceRoleClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials);

        if (!validatedFields.success) {
          return null;
        }

        const { email, password } = validatedFields.data;

        try {
          const supabase = createServiceRoleClient();

          const { data: admin, error } = await supabase
            .from("admin_users")
            .select("*")
            .eq("email", email)
            .eq("is_active", true)
            .single();

          if (error || !admin) {
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, admin.password_hash);

          if (!passwordMatch) {
            return null;
          }

          await supabase
            .from("admin_users")
            .update({ last_login: new Date().toISOString() })
            .eq("id", admin.id);

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name || admin.email,
            role: "admin",
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  // pages kısmını güncelle
  pages: {
    signIn: "/admin-login", // admin/login yerine admin-login
    error: "/admin-login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
});
