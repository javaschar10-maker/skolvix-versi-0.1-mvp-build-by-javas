// belajar.js - Ruang Belajar Mandiri Skolvix Lite
// TANPA AI. Pilihan kelas/pelajaran/bab murni data statis (JS object),
// PDF materi ditampilkan via <iframe> dari file lokal.

// ─── DATA KONTEN ───
const DAFTAR_KELAS = [
  { id: "kelas7", label: "Kelas 7" },
  { id: "kelas8", label: "Kelas 8" },
  { id: "kelas9", label: "Kelas 9" },
  { id: "kelas10", label: "Kelas 10" },
  { id: "kelas11", label: "Kelas 11" },
  { id: "kelas12", label: "Kelas 12" }
];

const DAFTAR_PELAJARAN = [
  { id: "matematika", label: "Matematika" },
  { id: "bindo", label: "B. Indonesia" },
  { id: "ipa", label: "IPA" },
  { id: "ips", label: "IPS" },
  { id: "binggris", label: "B. Inggris" }
];

const DAFTAR_BAB = {
  "kelas7|matematika": [
    {
      id: "bab1",
      label: "Bab 1",
      judul: "Bilangan Bulat",
      tersedia: true,
      file: "Matematika kelas 7 bab1 bilangan bulat-BS-KLS-VII.pdf",
      sumber: "Buku Matematika untuk SMP/MTs Kelas VII, Kurikulum Merdeka (SIBI - buku.kemdikbud.go.id)"
    },
    { id: "bab2", label: "Bab 2", judul: "Bilangan Rasional", tersedia: false },
    { id: "bab3", label: "Bab 3", judul: "Himpunan", tersedia: false },
    { id: "bab4", label: "Bab 4", judul: "Aljabar", tersedia: false }
  ]
};

// ─── STATE ───
let selectedKelas = "kelas7";
let selectedPelajaran = "matematika";
let selectedBab = "bab1";

// ─── INIT ───
window.addEventListener("load", () => {
  renderKelasOptions();
  renderPelajaranOptions();
  renderBabOptions();
  renderMateri();
});

function renderKelasOptions() {
  const container = document.getElementById("kelasOptions");
  container.innerHTML = "";

  DAFTAR_KELAS.forEach(kelas => {
    const hasBab = Object.keys(DAFTAR_BAB).some(key => key.startsWith(kelas.id + "|"));
    const chip = document.createElement("div");
    chip.className = "selector-chip" + (kelas.id === selectedKelas ? " active" : "") + (!hasBab ? " disabled" : "");
    chip.textContent = kelas.label + (!hasBab ? " (Segera Hadir)" : "");

    if (hasBab) {
      chip.addEventListener("click", () => {
        selectedKelas = kelas.id;
        renderKelasOptions();
        renderPelajaranOptions();
        renderBabOptions();
        renderMateri();
      });
    }
    container.appendChild(chip);
  });
}

function renderPelajaranOptions() {
  const container = document.getElementById("pelajaranOptions");
  container.innerHTML = "";

  DAFTAR_PELAJARAN.forEach(pelajaran => {
    const key = selectedKelas + "|" + pelajaran.id;
    const hasBab = DAFTAR_BAB[key] && DAFTAR_BAB[key].length > 0;
    const chip = document.createElement("div");
    chip.className = "selector-chip" + (pelajaran.id === selectedPelajaran ? " active" : "") + (!hasBab ? " disabled" : "");
    chip.textContent = pelajaran.label + (!hasBab ? " (Segera Hadir)" : "");

    if (hasBab) {
      chip.addEventListener("click", () => {
        selectedPelajaran = pelajaran.id;
        const firstBab = DAFTAR_BAB[key][0];
        if (firstBab) selectedBab = firstBab.id;
        renderPelajaranOptions();
        renderBabOptions();
        renderMateri();
      });
    }
    container.appendChild(chip);
  });
}

function renderBabOptions() {
  const container = document.getElementById("babOptions");
  container.innerHTML = "";

  const key = selectedKelas + "|" + selectedPelajaran;
  const babList = DAFTAR_BAB[key] || [];

  if (babList.length === 0) {
    container.innerHTML = `<p class="subtitle" style="margin:0;">Belum ada bab untuk kombinasi ini.</p>`;
    return;
  }

  babList.forEach(bab => {
    const chip = document.createElement("div");
    chip.className = "selector-chip" + (bab.id === selectedBab ? " active" : "") + (!bab.tersedia ? " disabled" : "");
    chip.textContent = `${bab.label}: ${bab.judul}` + (!bab.tersedia ? " (Segera Hadir)" : "");

    if (bab.tersedia) {
      chip.addEventListener("click", () => {
        selectedBab = bab.id;
        renderBabOptions();
        renderMateri();
      });
    }
    container.appendChild(chip);
  });
}

function renderMateri() {
  const key = selectedKelas + "|" + selectedPelajaran;
  const babList = DAFTAR_BAB[key] || [];
  const bab = babList.find(b => b.id === selectedBab);

  const titleEl = document.getElementById("materiTitle");
  const subtitleEl = document.getElementById("materiSubtitle");
  const contentEl = document.getElementById("materiContent");

  if (!bab || !bab.tersedia) {
    titleEl.textContent = "📘 Materi Belum Tersedia";
    subtitleEl.textContent = "Materi untuk kombinasi ini sedang disiapkan.";
    contentEl.innerHTML = `<div class="belum-tersedia">🚧 Materi untuk pilihan ini belum tersedia di versi MVP.<br>Saat ini baru tersedia: <strong>Kelas 7 - Matematika - Bab 1: Bilangan Bulat</strong>.</div>`;
    return;
  }

  const kelasLabel = DAFTAR_KELAS.find(k => k.id === selectedKelas).label;
  const pelajaranLabel = DAFTAR_PELAJARAN.find(p => p.id === selectedPelajaran).label;

  titleEl.textContent = `📘 ${pelajaranLabel} ${kelasLabel} — ${bab.label}: ${bab.judul}`;
  subtitleEl.textContent = `Sumber: ${bab.sumber}`;

  contentEl.innerHTML = `
    <div class="pdf-frame-wrapper">
      <iframe src="${bab.file}" title="Materi ${bab.judul}"></iframe>
    </div>
    <p class="pdf-fallback">
      PDF tidak tampil di perangkatmu?
      <a href="${bab.file}" target="_blank">Buka materi di tab baru</a>
    </p>
  `;
}