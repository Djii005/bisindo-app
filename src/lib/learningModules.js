const alphabetTargets = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
const numberTargets = Array.from({ length: 21 }, (_, index) => String(index));

export const learningModules = [
  {
    id: 'alfabet',
    title: 'Alfabet',
    desc: 'Pelajari 26 huruf alfabet dalam BISINDO dengan deteksi AI real-time.',
    iconKey: 'type',
    lessons: alphabetTargets.length,
    progress: 0,
    xp: 260,
    difficulty: 'Pemula',
    color: 'blue',
    locked: false,
    classifierBasePath: '/ml-model',
    status: 'ready',
    subtitle: 'A-Z dalam satu alur belajar yang bergerak otomatis saat huruf sudah benar.',
    targets: alphabetTargets,
    targetLabel: 'Huruf',
  },
  {
    id: 'angka',
    title: 'Angka',
    desc: 'Belajar angka 0-20 dengan workspace yang sama, siap memakai dataset khusus angka.',
    iconKey: 'hash',
    lessons: numberTargets.length,
    progress: 0,
    xp: 210,
    difficulty: 'Pemula',
    color: 'emerald',
    locked: false,
    classifierBasePath: null,
    status: 'guide',
    subtitle: 'Halaman modul sudah aktif. Landmark guide bisa dipakai sekarang, bundle AI angka tinggal ditambahkan.',
    targets: numberTargets,
    targetLabel: 'Angka',
  },
  {
    id: 'kata-dasar',
    title: 'Kata Dasar',
    desc: 'Kata-kata yang paling sering digunakan sehari-hari.',
    iconKey: 'message-square',
    lessons: 12,
    progress: 0,
    xp: 240,
    difficulty: 'Menengah',
    color: 'amber',
    locked: false,
    // The words model is a BiLSTM sequence model (input [60, 167]) and is not
    // compatible with the static hand classifier pipeline used by this
    // workspace. Landmark guide mode until a sequence workspace is wired in.
    classifierBasePath: null,
    status: 'guide',
    subtitle: 'Belajar kosakata penting sehari-hari seperti makan, minum, saya, dan kata tanya.',
    targets: ["Nama", "Saya", "Maaf", "Tolong", "Iya", "Tidak", "Mau", "Tidak Mau", "Suka", "Tidak Suka", "Makan", "Minum"],
    targetLabel: 'Kata',
  },
  {
    id: 'salam',
    title: 'Salam & Sapaan',
    desc: 'Cara menyapa dan memberi salam dalam BISINDO.',
    iconKey: 'hand',
    lessons: 5,
    progress: 0,
    xp: 150,
    difficulty: 'Menengah',
    color: 'violet',
    locked: false,
    // Same constraint as kata-dasar: words BiLSTM ≠ static classifier input.
    classifierBasePath: null,
    status: 'guide',
    subtitle: 'Fokus pada ekspresi pembuka, sapaan halo, perkenalkan diri, dan ucapan terima kasih.',
    targets: ["Halo", "Perkenalkan", "Terima Kasih", "Sama-sama", "Salam Kenal"],
    targetLabel: 'Sapaan',
  },
  {
    id: 'frasa',
    title: 'Frasa Umum',
    desc: 'Kalimat dan frasa untuk percakapan sehari-hari.',
    iconKey: 'heart',
    lessons: 20,
    progress: 0,
    xp: 400,
    difficulty: 'Lanjutan',
    color: 'rose',
    locked: true,
    classifierBasePath: null,
    status: 'locked',
    subtitle: 'Dirancang untuk percakapan yang lebih natural.',
    targets: [],
    targetLabel: 'Frasa',
  },
];

export function getLearningModule(moduleId) {
  return learningModules.find((module) => module.id === moduleId) ?? null;
}

export function getModuleProgressSummary() {
  return learningModules.map((module) => ({
    color: module.color,
    name: module.title,
    progress: module.progress,
    total: module.lessons,
  }));
}
