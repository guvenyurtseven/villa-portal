import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    // Güvenlik kontrolü
    const { searchParams } = new URL(request.url);
    const setupKey = searchParams.get("key");

    if (setupKey !== process.env.SETUP_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Admin var mı kontrol et
    const { data: existingAdmin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingAdmin) {
      return NextResponse.json({ error: "Admin already exists" }, { status: 409 });
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 12);

    // Admin kullanıcısı oluştur
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
