import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Hand, X, ImageOff } from 'lucide-react';
import './Dictionary.css';

const categories = ['Semua', 'Alfabet', 'Angka', 'Kata', 'Frasa'];

const signs = [
    // Alfabet
    ...Array.from({ length: 26 }, (_, i) => ({
        id: `alpha-${i}`,
        char: String.fromCharCode(65 + i),
        category: 'Alfabet',
        emoji: '🤟',
    })),
    // Angka
    ...Array.from({ length: 10 }, (_, i) => ({
        id: `num-${i}`,
        char: `${i}`,
        category: 'Angka',
        emoji: '✋',
    })),
    // Kata
    ...['Halo', 'Tolong', 'Maaf', 'Ya', 'Iya', 'Tidak', 'Makan', 'Minum', 'Rumah', 'Sekolah', 'Nama', 'Siapa', 'Perkenalkan', 'Saya', 'Sama-sama', 'Mau', 'Suka'].map((w, i) => ({
        id: `word-${i}`,
        char: w,
        category: 'Kata',
        emoji: '👋',
    })),
    // Frasa
    ...['Terima Kasih', 'Salam Kenal', 'Tidak Mau', 'Tidak Suka', 'Apa kabar?', 'Selamat pagi', 'Selamat malam', 'Sampai jumpa', 'Senang bertemu'].map((w, i) => ({
        id: `phrase-${i}`,
        char: w,
        category: 'Frasa',
        emoji: '🙌',
    })),
];

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i = 0) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.03, duration: 0.4 },
    }),
};

// Helper to get image path for a sign
const getSignImagePath = (sign) => {
    if (sign.category === 'Alfabet') {
        const availableAlphabetImages = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k'];
        const lowerChar = sign.char.toLowerCase();
        if (availableAlphabetImages.includes(lowerChar)) {
            return `/assets/bisindo_alphabet_${lowerChar}.png`;
        }
    }
    return null;
};

// Helper to get descriptive title
const getSignTitle = (sign) => {
    if (sign.category === 'Alfabet') {
        return `Alphabet ${sign.char}`;
    }
    if (sign.category === 'Angka') {
        return `Angka ${sign.char}`;
    }
    return sign.char;
};

// Helper to get detailed educational descriptions
const getSignDescription = (sign) => {
    if (sign.category === 'Alfabet') {
        const char = sign.char.toUpperCase();
        switch (char) {
            case 'A':
                return 'Peragakan huruf A dengan mengepalkan tangan kanan Anda dan posisikan ibu jari tegak lurus merapat di sisi luar telunjuk.';
            case 'B':
                return 'Peragakan huruf B dengan merapatkan keempat jari tangan kanan lurus ke atas dan melipat ibu jari di depan telapak tangan.';
            case 'C':
                return 'Peragakan huruf C dengan melengkungkan keempat jari dan ibu jari tangan kanan membentuk huruf C secara visual.';
            case 'D':
                return 'Peragakan huruf D dengan menunjuk ke atas menggunakan jari telunjuk kanan, sementara jari-jari lainnya membentuk lingkaran bersama ibu jari.';
            case 'E':
                return 'Peragakan huruf E dengan menekuk semua ujung jari ke arah telapak tangan, membentuk kepalan kecil yang santai dengan ibu jari melintang di bawah.';
            case 'F':
                return 'Peragakan huruf F dengan mempertemukan ujung telunjuk dan ibu jari membentuk lingkaran, sementara ketiga jari lainnya tegak lurus ke atas.';
            case 'G':
                return 'Peragakan huruf G dengan memosisikan ibu jari dan telunjuk sejajar ke depan secara horizontal, seperti mengukur ketebalan sesuatu.';
            case 'H':
                return 'Peragakan huruf H dengan meluruskan jari telunjuk dan jari tengah secara sejajar ke arah depan/samping, dengan jari lainnya mengepal.';
            case 'I':
                return 'Peragakan huruf I dengan mengacungkan jari kelingking tangan kanan tegak ke atas, sementara jari-jari lainnya mengepal.';
            case 'K':
                return 'Peragakan huruf K dengan mengacungkan jari telunjuk dan jari tengah membentuk huruf V, dengan ibu jari diletakkan tegak di antara keduanya.';
            default:
                return `Gerakan isyarat untuk Huruf ${char} dalam Bahasa Isyarat Indonesia (BISINDO). Gunakan modul pembelajaran dan latihan kamera untuk melatih ketepatan gerak tangan Anda.`;
        }
    }
    if (sign.category === 'Angka') {
        return `Gerakan isyarat untuk Angka ${sign.char} dalam Bahasa Isyarat Indonesia (BISINDO). Peragakan dengan jumlah jari yang sesuai dengan nilai angkanya secara jelas menghadap ke depan kamera.`;
    }
    if (sign.category === 'Kata') {
        return `Gerakan isyarat untuk kata dasar "${sign.char}" dalam Bahasa Isyarat Indonesia (BISINDO). Kata ini melibatkan gerakan tangan dinamis yang mewakili maknanya dalam komunikasi sehari-hari.`;
    }
    if (sign.category === 'Frasa') {
        return `Gerakan isyarat untuk frasa umum "${sign.char}" dalam Bahasa Isyarat Indonesia (BISINDO). Frasa ini merupakan gabungan dari beberapa gestur isyarat yang dilakukan secara berkesinambungan.`;
    }
    return `Gerakan isyarat untuk "${sign.char}" dalam Bahasa Isyarat Indonesia (BISINDO).`;
};

export default function Dictionary() {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [selectedSign, setSelectedSign] = useState(null);

    const filtered = useMemo(() => {
        return signs.filter((s) => {
            const matchCat = activeCategory === 'Semua' || s.category === activeCategory;
            const matchSearch = s.char.toLowerCase().includes(search.toLowerCase());
            return matchCat && matchSearch;
        });
    }, [search, activeCategory]);

    return (
        <div className="dictionary-page">
            <div className="container">
                <motion.div
                    className="dict-header"
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                >
                    <h1 className="dict-title">
                        Kamus <span className="gradient-text">BISINDO</span>
                    </h1>
                    <p className="dict-subtitle">
                        Referensi lengkap gerakan isyarat yang divalidasi oleh PUSBISINDO
                    </p>
                </motion.div>

                {/* Search & Filter */}
                <motion.div
                    className="dict-toolbar"
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                >
                    <div className="search-wrapper dict-search">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            className="input"
                            placeholder="Cari isyarat..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="tabs">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                className={`tab ${activeCategory === cat ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Results count */}
                <div className="dict-results-count">
                    <Hand size={16} />
                    <span>{filtered.length} isyarat ditemukan</span>
                </div>

                {/* Signs Grid */}
                <div className="signs-grid">
                    {filtered.map((sign, i) => {
                        const imagePath = getSignImagePath(sign);
                        const title = getSignTitle(sign);
                        return (
                            <motion.div
                                key={sign.id}
                                className="card sign-card"
                                initial="hidden"
                                animate="visible"
                                custom={i}
                                variants={fadeUp}
                                onClick={() => setSelectedSign(sign)}
                            >
                                <div className="sign-image-wrapper">
                                    {imagePath ? (
                                        <img 
                                            src={imagePath} 
                                            alt={title} 
                                            className="sign-image" 
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="sign-placeholder">
                                            <ImageOff size={24} className="sign-placeholder-icon" />
                                            <span className="sign-placeholder-emoji">{sign.emoji}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="sign-char">{title}</div>
                                <span className={`badge badge-${sign.category === 'Alfabet' ? 'blue' :
                                        sign.category === 'Angka' ? 'green' :
                                            sign.category === 'Kata' ? 'violet' : 'amber'
                                    }`}>
                                    {sign.category}
                                </span>
                            </motion.div>
                        );
                    })}
                </div>

                {filtered.length === 0 && (
                    <div className="dict-empty">
                        <Search size={48} />
                        <p>Tidak ditemukan isyarat untuk "{search}"</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedSign && (
                    <motion.div 
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedSign(null)}
                    >
                        <motion.div 
                            className="modal-content"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button 
                                className="modal-close" 
                                onClick={() => setSelectedSign(null)}
                                aria-label="Tutup"
                            >
                                <X size={20} />
                            </button>
                            
                            <div className="modal-body">
                                <div className="modal-media-wrapper">
                                    {getSignImagePath(selectedSign) ? (
                                        <img 
                                            src={getSignImagePath(selectedSign)} 
                                            alt={getSignTitle(selectedSign)} 
                                            className="modal-image"
                                        />
                                    ) : (
                                        <div className="modal-placeholder">
                                            <ImageOff size={48} className="modal-placeholder-icon" />
                                            <span className="modal-placeholder-emoji">{selectedSign.emoji}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="modal-info">
                                    <span className={`badge badge-${
                                        selectedSign.category === 'Alfabet' ? 'blue' :
                                        selectedSign.category === 'Angka' ? 'green' :
                                        selectedSign.category === 'Kata' ? 'violet' : 'amber'
                                    }`}>
                                        {selectedSign.category}
                                    </span>
                                    <h2 className="modal-title">{getSignTitle(selectedSign)}</h2>
                                    <p className="modal-description">{getSignDescription(selectedSign)}</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

