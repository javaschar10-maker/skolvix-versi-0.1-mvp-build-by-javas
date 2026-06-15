// supabase-config.js
// 1. Daftar gratis di https://supabase.com
// 2. Buat project baru
// 3. Buka Project Settings > API
// 4. Copy "Project URL" dan "anon public key" ke bawah ini

const SUPABASE_URL = "https://yqbkkxibgsfaueaaezey.supabase.co"; // GANTI dengan URL project kamu
const SUPABASE_ANON_KEY = "sb_publishable_gjIUFgFeK8V5LanmGCwb4A_fNxIilfN"; // GANTI dengan anon key kamu

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);