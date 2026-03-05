import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function POST(request: Request) {
  try {
    const supabase = createServiceRoleClient();

    const { count: adminCount, error: countError } = await supabase
      .from("admin_users")
      .select("id", { count: "exact", head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Bootstrap: no admin exists yet => setup key is required.
    // After first admin exists => only authenticated admin can access this endpoint.
    if ((adminCount ?? 0) > 0) {
      const unauthorized = await requireAdmin();
      if (unauthorized) return unauthorized;
    } else {
      const { searchParams } = new URL(request.url);
      const setupKey = searchParams.get("key");
      if (!process.env.SETUP_KEY || setupKey !== process.env.SETUP_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const { data: existingAdmin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingAdmin) {
      return NextResponse.json({ error: "Admin already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: newAdmin, error } = await supabase
      .from("admin_users")
      .insert({
        email,
        password_hash: hashedPassword,
        name: name || email,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
      },
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}