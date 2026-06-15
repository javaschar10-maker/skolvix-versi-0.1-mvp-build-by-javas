// app.js - Dashboard logic untuk Skolvix Lite
// SEMUA tanpa AI. Hanya logika JS + Supabase sebagai database.

const BADGE_DEFINITIONS = [
  { id: "starter", nama: "Langkah Pertama", emoji: "🌱", syarat: "Selesaikan 1 kuis" },
  { id: "perfect", nama: "Skor Sempurna", emoji: "💯", syarat: "Dapat skor 100" },
  { id: "streak3", nama: "Konsisten 3 Hari", emoji: "🔥", syarat: "Streak 3 hari berturut-turut" },
  { id: "koin100", nama: "Kolektor Koin", emoji: "🪙", syarat: "Kumpulkan 100 Koin IQ" }
];

// 6 Persona Guru AI. key harus sama dengan key di feedback-personas.js
// hargaKoin = 0 berarti gratis/langsung tersedia
const PERSONA_DEFINITIONS = [
  { key: "kakAlex", nama: "Kak Alex", emoji: "🧠", hargaKoin: 0 },
  { key: "kakTara", nama: "Kak Tara", emoji: "🎉", hargaKoin: 0 },
  { key: "ibuDian", nama: "Ibu Dian", emoji: "🌸", hargaKoin: 0 },
  { key: "kakRey", nama: "Kak Rey", emoji: "😒", hargaKoin: 0 },
  { key: "kakSaga", nama: "Kak Saga", emoji: "🌌", hargaKoin: 0 },
  { key: "kakVictor", nama: "Kak Victor ", emoji: "👑", hargaKoin: 0 }
];

let currentUser = null;

document.getElementById("loginBtn").addEventListener("click", handleLogin);
document.getElementById("startQuizBtn").addEventListener("click", () => {
  window.location.href = "quiz.html";
});

// Cek apakah ada user tersimpan di localStorage (biar tidak perlu login ulang)
window.addEventListener("load", () => {
  const savedUsername = localStorage.getItem("skolvix_username");
  if (savedUsername) {
    document.getElementById("usernameInput").value = savedUsername;
    handleLogin();
  }
});

async function handleLogin() {
  const username = document.getElementById("usernameInput").value.trim().toLowerCase();
  if (!username) {
    alert("Isi nama dulu ya!");
    return;
  }

  // Cek apakah user sudah ada di Supabase
  let { data: existingUser, error } = await supabaseClient
    .from("user_progress")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error(error);
    alert("Gagal terhubung ke server. Cek koneksi atau konfigurasi Supabase.");
    return;
  }

  if (!existingUser) {
    // Buat user baru
    const { data: newUser, error: insertError } = await supabaseClient
      .from("user_progress")
      .insert([{ username, koin_iq: 0, energi: 5, streak: 0, last_login: new Date().toISOString().slice(0,10) }])
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      alert("Gagal membuat akun baru.");
      return;
    }
    existingUser = newUser;
  } else {
    // Update streak & reset energi jika perlu
    existingUser = await checkDailyReset(existingUser);
  }

  currentUser = existingUser;
  localStorage.setItem("skolvix_username", username);
  showDashboard();
}

// Cek reset energi harian + update streak
async function checkDailyReset(user) {
  const today = new Date().toISOString().slice(0, 10);
  const lastLogin = user.last_login;

  if (lastLogin === today) {
    // Sudah login hari ini, tidak ada perubahan
    return user;
  }

  let newStreak = user.streak;
  let newEnergi = user.energi;

  // Hitung selisih hari
  const lastDate = new Date(lastLogin);
  const todayDate = new Date(today);
  const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    newStreak += 1; // login berturut-turut
  } else if (diffDays > 1) {
    newStreak = 1; // streak putus, mulai lagi
  }

  // Reset energi setiap hari baru
  newEnergi = 5;

  const { data: updated, error } = await supabaseClient
    .from("user_progress")
    .update({ streak: newStreak, energi: newEnergi, last_login: today })
    .eq("username", user.username)
    .select()
    .single();

  if (error) {
    console.error(error);
    return user;
  }

  // Cek badge streak3
  if (newStreak >= 3) {
    await unlockBadge(user.username, "streak3");
  }

  return updated;
}

function showDashboard() {
  document.getElementById("loginCard").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");

  document.getElementById("namaUserDisplay").textContent = currentUser.username;
  document.getElementById("koinDisplay").textContent = currentUser.koin_iq;
  document.getElementById("energiDisplay").textContent = currentUser.energi;
  document.getElementById("streakDisplay").textContent = currentUser.streak;

  // Tampilkan/sembunyikan tombol kuis berdasarkan energi
  if (currentUser.energi <= 0) {
    document.getElementById("startQuizBtn").classList.add("hidden");
    document.getElementById("noEnergyMsg").classList.remove("hidden");
  }

  renderBadges();
  renderPersonaSelector();
  loadLeaderboard();
}

function renderPersonaSelector() {
  const container = document.getElementById("personaSelectGrid");
  if (!container) return;

  container.innerHTML = "";

  const koin = currentUser.koin_iq || 0;
  const personaTerpilih = localStorage.getItem("skolvix_persona") || "kakAlex";

  PERSONA_DEFINITIONS.forEach(persona => {
    const terkunci = koin < persona.hargaKoin;
    const aktif = persona.key === personaTerpilih;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "persona-select-card" + (aktif ? " active" : "") + (terkunci ? " locked" : "");
    card.disabled = terkunci;

    card.innerHTML = `
      <div class="persona-select-emoji">${persona.emoji}</div>
      <div class="persona-select-name">${persona.nama}</div>
      <div class="persona-select-lock">${terkunci ? `🔒 ${persona.hargaKoin} Koin IQ` : (aktif ? "✓ Terpilih" : "Gratis saat ini")}</div>
    `;

    if (!terkunci) {
      card.addEventListener("click", () => {
        localStorage.setItem("skolvix_persona", persona.key);
        renderPersonaSelector();
      });
    }

    container.appendChild(card);
  });
}

 


function renderBadges() {
  const container = document.getElementById("badgeList");
  container.innerHTML = "";

  const ownedBadges = currentUser.badges || [];

  BADGE_DEFINITIONS.forEach(badge => {
    const owned = ownedBadges.includes(badge.id);
    const div = document.createElement("div");
    div.className = "badge-item" + (owned ? "" : " locked");
    div.title = badge.syarat;
    div.textContent = `${badge.emoji} ${badge.nama}`;
    container.appendChild(div);
  });
}

async function unlockBadge(username, badgeId) {
  const { data: user } = await supabaseClient
    .from("user_progress")
    .select("badges")
    .eq("username", username)
    .single();

  const badges = user.badges || [];
  if (badges.includes(badgeId)) return; // sudah punya

  badges.push(badgeId);

  await supabaseClient
    .from("user_progress")
    .update({ badges })
    .eq("username", username);
}

async function loadLeaderboard() {
  const { data, error } = await supabaseClient
    .from("user_progress")
    .select("username, koin_iq")
    .order("koin_iq", { ascending: false })
    .limit(5);

  const container = document.getElementById("leaderboardList");

  if (error || !data) {
    container.textContent = "Gagal memuat leaderboard.";
    return;
  }

  container.innerHTML = data.map((u, i) =>
    `<div>${i + 1}. ${u.username} — 🪙 ${u.koin_iq}</div>`
  ).join("");
}