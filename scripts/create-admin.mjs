import { createClient } from "@supabase/supabase-js";

const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: key,
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: password,
  ADMIN_NAME: name,
} = process.env;
if (!url || !key || !email || !password || password.length < 10 || !name) {
  throw new Error(
    "Isi SUPABASE_URL/key di .env.local dan ADMIN_EMAIL, ADMIN_PASSWORD (minimal 10 karakter), ADMIN_NAME di environment lokal.",
  );
}
const db = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (error)
  throw new Error("Akun gagal dibuat. Periksa email atau koneksi layanan.");
const { error: profileError } = await db
  .from("profiles")
  .insert({ id: data.user.id, name, role: "admin", active: true });
if (profileError) {
  await db.auth.admin.deleteUser(data.user.id);
  throw new Error(
    "Profil pelatih gagal dibuat. Jalankan migrasi terlebih dahulu.",
  );
}
console.log("Akun pelatih berhasil dibuat. Masuk melalui aplikasi.");
