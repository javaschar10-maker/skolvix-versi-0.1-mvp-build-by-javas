// quiz.js - Logika kuis untuk Skolvix Lite
// Scoring 100% JS murni (pilihan ganda), TANPA AI sama sekali.

let soalData = null;
let currentIndex = 0;
let userAnswers = []; // simpan index jawaban user per soal
let username = localStorage.getItem("skolvix_username");

// Persona aktif (untuk feedback statis). Diambil dari pilihan user di halaman pilih guru.
// Default ke kakAlex kalau belum pernah pilih.
const PERSONA_AKTIF = localStorage.getItem("skolvix_persona") || "kakAlex";

// Berapa soal yang diambil acak dari bank soal setiap kuis dimulai
const JUMLAH_SOAL_PER_KUIS = 10;

// Kocok urutan array (Fisher-Yates shuffle) - JS murni, tanpa AI
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

window.addEventListener("load", async () => {
  if (!username) {
    window.location.href = "app.html";
    return;
  }

  // Load seluruh bank soal dari file JSON statis
  const res = await fetch("data/soal-matematika-bab1.json");
  const fullData = await res.json();

  // Acak urutan seluruh bank soal, lalu ambil sejumlah JUMLAH_SOAL_PER_KUIS
  const soalAcak = shuffleArray(fullData.soal).slice(0, JUMLAH_SOAL_PER_KUIS);

  // soalData yang dipakai sepanjang sesi kuis ini hanya berisi soal terpilih
  soalData = { ...fullData, soal: soalAcak };

  userAnswers = new Array(soalData.soal.length).fill(null);

  document.getElementById("totalSoal").textContent = soalData.soal.length;
  renderSoal();
});

function renderSoal() {
  const soal = soalData.soal[currentIndex];

  document.getElementById("soalKe").textContent = currentIndex + 1;
  document.getElementById("pertanyaan").textContent = soal.pertanyaan;

  // Acak urutan opsi jawaban, tapi tetap ingat mana yang benar
  // (dibuat sekali per soal, disimpan di soal._opsiAcak supaya tidak berubah-ubah saat re-render)
  if (!soal._opsiAcak) {
    const opsiAsli = soal.opsi.map((text, idx) => ({ text, isBenar: idx === soal.jawaban }));
    soal._opsiAcak = shuffleArray(opsiAsli);
  }

  const opsiContainer = document.getElementById("opsiContainer");
  opsiContainer.innerHTML = "";

  soal._opsiAcak.forEach((opsi, idx) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = opsi.text;
    btn.addEventListener("click", () => pilihJawaban(idx, opsi.isBenar));
    opsiContainer.appendChild(btn);
  });
}

function pilihJawaban(idx, isBenar) {
  userAnswers[currentIndex] = isBenar; // simpan true/false langsung

  // Highlight pilihan yang dipilih sebentar, lalu lanjut ke soal berikutnya
  const options = document.querySelectorAll(".option");
  options.forEach((opt, i) => {
    opt.disabled = true;
    if (i === idx) opt.classList.add("selected");
  });

  setTimeout(() => {
    if (currentIndex < soalData.soal.length - 1) {
      currentIndex++;
      renderSoal();
    } else {
      finishQuiz();
    }
  }, 300);
}

async function finishQuiz() {
  // ===== SCORING MURNI JS, TANPA AI =====
  let benar = 0;
  userAnswers.forEach((isBenar) => {
    if (isBenar === true) benar++;
  });

  const totalSoal = soalData.soal.length;
  const skorPersen = Math.round((benar / totalSoal) * 100);

  // Rumus Koin IQ: 10 koin per jawaban benar (sesuai aturan blueprint asli)
  let koinDidapat = benar * 10;

  // Cek bonus skor sempurna untuk badge
  const dapatBadgePerfect = skorPersen === 100;

  // ===== Update database via Supabase =====
  const { data: user, error } = await supabaseClient
    .from("user_progress")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !user) {
    console.error(error);
    alert("Gagal mengambil data user.");
    return;
  }

  const energiBaru = Math.max(0, user.energi - 1);
  const koinBaru = user.koin_iq + koinDidapat;

  await supabaseClient
    .from("user_progress")
    .update({ koin_iq: koinBaru, energi: energiBaru })
    .eq("username", username);

  // Simpan hasil kuis
  await supabaseClient
    .from("quiz_results")
    .insert([{
      username,
      bab: soalData.bab,
      skor_persen: skorPersen,
      koin_didapat: koinDidapat
    }]);

  // Cek & unlock badges
  await checkAndUnlockBadges(user, benar, koinBaru, dapatBadgePerfect);

  // ===== Tampilkan hasil =====
  document.getElementById("quizCard").classList.add("hidden");
  document.getElementById("resultCard").classList.remove("hidden");

  document.getElementById("resultScore").innerHTML = `${skorPersen}<span>/100</span>`;
  document.getElementById("koinGain").textContent = `+${koinDidapat} Koin IQ`;
  document.getElementById("koinDisplay").textContent = koinBaru;

  // Feedback statis berdasarkan persona (tanpa AI), berdasarkan jumlah jawaban benar (0-10)
  const feedbackText = getFeedback(PERSONA_AKTIF, benar, user.username);
  document.getElementById("feedbackBox").textContent = feedbackText;

  document.getElementById("backToHomeBtn").addEventListener("click", () => {
    window.location.href = "app.html";
  });
}

async function checkAndUnlockBadges(user, benar, koinBaru, dapatPerfect) {
  const badges = user.badges || [];
  let updated = false;

  if (!badges.includes("starter")) {
    badges.push("starter");
    updated = true;
  }

  if (dapatPerfect && !badges.includes("perfect")) {
    badges.push("perfect");
    updated = true;
  }

  if (koinBaru >= 100 && !badges.includes("koin100")) {
    badges.push("koin100");
    updated = true;
  }

  if (updated) {
    await supabaseClient
      .from("user_progress")
      .update({ badges })
      .eq("username", username);
  }
}