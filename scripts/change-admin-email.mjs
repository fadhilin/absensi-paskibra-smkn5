import { createClient } from "@supabase/supabase-js";

const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: key,
  CURRENT_ADMIN_EMAIL: currentEmail,
  NEW_ADMIN_EMAIL: newEmail,
  NEW_ADMIN_PASSWORD: newPassword,
} = process.env;

if (!url || !key || !currentEmail || (!newEmail && !newPassword)) {
  throw new Error(
    "Isi NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CURRENT_ADMIN_EMAIL, lalu NEW_ADMIN_EMAIL atau NEW_ADMIN_PASSWORD di .env.local.",
  );
}
if (newEmail && currentEmail.toLowerCase() === newEmail.toLowerCase()) {
  throw new Error("Email lama dan email baru harus berbeda.");
}
if (newPassword && newPassword.length < 10) {
  throw new Error("NEW_ADMIN_PASSWORD minimal 10 karakter.");
}

const db = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
if (error) throw new Error("Daftar akun tidak dapat dibaca.");

const matches = data.users.filter(
  (user) => user.email?.toLowerCase() === currentEmail.toLowerCase(),
);
if (matches.length !== 1) {
  throw new Error(
    "Akun dengan email lama tidak ditemukan secara unik. Periksa CURRENT_ADMIN_EMAIL.",
  );
}

const user = matches[0];
const { data: profile, error: profileError } = await db
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .maybeSingle();
if (profileError || profile?.role !== "admin") {
  throw new Error("Email lama bukan akun pelatih di aplikasi ini.");
}

const changes = {
  ...(newEmail ? { email: newEmail, email_confirm: true } : {}),
  ...(newPassword ? { password: newPassword } : {}),
};
const { error: updateError } = await db.auth.admin.updateUserById(
  user.id,
  changes,
);
if (updateError) {
  throw new Error(
    "Data akun tidak dapat diubah. Pastikan email baru belum digunakan akun lain.",
  );
}

console.log("Data akun pelatih berhasil diganti. Masuk kembali dengan data baru.");
