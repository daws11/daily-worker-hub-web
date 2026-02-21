# Laporan Riset Strategis: Transformasi Model Bisnis Daily Worker Hub di Indonesia

## Ringkasan Eksekutif

Laporan ini menyajikan analisis komprehensif mengenai evolusi pasar tenaga kerja digital di Indonesia, dengan fokus spesifik pada transisi dari model "Marketplace Tradisional" (pencarian dan penawaran) menuju model "On-Demand Dispatch" (pencocokan instan). Dipicu oleh penetrasi teknologi seluler dan kebutuhan industri akan fleksibilitas tenaga kerja pasca-UU Cipta Kerja, model _Daily Worker Hub_ yang mengadopsi mekanisme logistik ala Gojek atau Uber menawarkan efisiensi yang belum pernah terjadi sebelumnya dalam manajemen tenaga kerja kerah biru (_blue-collar_).

Analisis ini membedah arsitektur algoritmik yang diperlukan untuk mendukung sistem pengiriman tenaga kerja instan, mengevaluasi efektivitas algoritma _Greedy_, _Hungarian_, dan _Min-Cost Max-Flow_ dalam konteks kendala operasional nyata. Laporan ini juga menyoroti kerangka hukum Indonesia, khususnya Peraturan Pemerintah (PP) No. 35 Tahun 2021, yang menciptakan batasan ketat "aturan 21 hari" bagi pekerja harian lepas, serta implikasinya terhadap desain sistem. Melalui sintesis strategi kompetitor seperti Staffinc, MyRobin, dan tolok ukur global seperti Instawork, dokumen ini memetakan strategi operasional, teknis, dan legal untuk membangun platform _Workforce-as-a-Service_ yang skalabel dan patuh hukum.

## 1\. Transformasi Model Bisnis: Dari _Discovery_ Menuju _Dispatch_

### 1.1 Evolusi Pasar Tenaga Kerja Digital di Indonesia

Secara historis, pasar tenaga kerja digital di Indonesia beroperasi pada "Model Penemuan" (_Discovery Model_). Platform seperti JobStreet atau portal _freelance_ tradisional berfungsi sebagai direktori pasif. Beban pencocokan sepenuhnya berada di tangan pengguna: pemberi kerja harus memposting lowongan, menyaring ratusan CV, dan melakukan wawancara manual, sementara pekerja harus mencari lowongan, mengirim proposal, dan menunggu respons.1 Model ini, meskipun efektif untuk peran korporat jangka panjang di mana "kecocokan budaya" bersifat subjektif, menciptakan friksi yang sangat besar untuk peran kerah biru, harian, atau berbasis jam di mana kecepatan dan keandalan kehadiran adalah variabel utama.

Paradigma baru yang sedang berkembang adalah "Model Dispatch" atau _On-Demand Staffing_. Dalam model ini, platform mengambil peran sebagai "dispatcer" terpusat. Pemberi kerja tidak lagi memilih pekerja secara manual; mereka meminta _kapabilitas_ (contoh: "Butuh 5 tenaga _packer_ gudang, pengalaman 1 tahun, besok jam 8 pagi"). Algoritma platform kemudian secara instan mengidentifikasi, memverifikasi, dan menugaskan pekerja spesifik untuk slot tersebut tanpa proses tawar-menawar.1 Ini mengubah proposisi nilai dari "akses ke database profil" menjadi "jaminan pemenuhan tenaga kerja" (_fulfillment guarantee_).

### 1.2 Analisis Komparatif: _Instant Matching_ vs. Marketplace Tradisional

Perbedaan antara kedua model ini bukan sekadar operasional, melainkan fundamental terhadap unit ekonomi dan pengalaman pengguna. Tabel di bawah ini merangkum perbedaan struktural utama yang ditemukan dalam riset pasar tenaga kerja digital.

**Tabel 1: Perbandingan Struktural Model Marketplace Tenaga Kerja**

| Fitur Utama | Marketplace Tradisional (Job Board/Bidding) | On-Demand Dispatch (Instant Matching) |
| --- | --- | --- |
| Mekanisme Pencocokan | Asinkron: Pengguna mencari, melamar, dan bernegosiasi. Latensi tinggi (hari/minggu). | Sinkron/Instan: Algoritma memasangkan permintaan dan penawaran segera berdasarkan kriteria yang telah ditetapkan. |
| Metrik Utama | Likuiditas (Volume): Jumlah listing aktif dan resume dalam database. | Fill Rate & Time-to-Fill: Persentase shift yang terisi dalam jendela waktu yang diminta (misal: <4 jam). |
| Tanggung Jawab Vetting | User-Centric: Pemberi kerja memverifikasi keterampilan dan mewawancarai kandidat sendiri. | Platform-Centric: Platform melakukan pra-vetting, tes keterampilan, dan menjamin standar kualitas pekerja. |
| Model Penetapan Harga | Biaya Iklan/Langganan: Bayar untuk memposting atau membuka kontak. | Take Rate/Komisi Dinamis: Markup persentase di atas upah per jam/harian pekerja. |
| Fungibilitas Pekerja | Rendah: Setiap pekerja dianggap unik dengan nuansa subjektif. | Tinggi: Pekerja distandarisasi menjadi "SKU" (misal: Tier 1 Packer) untuk memfasilitasi pertukaran algoritmik. |
| Efek Jaringan | Cross-Side: Lebih banyak pekerjaan menarik lebih banyak pelamar, namun biaya pencarian meningkat seiring skala. | Data-Driven: Lebih banyak data meningkatkan akurasi pencocokan, mengurangi waktu tunggu, dan meningkatkan keandalan. |

#### Keunggulan Model Dispatch (_Instant Matching_)

Model dispatch menawarkan efisiensi superior untuk peran bervolume tinggi dan kompleksitas rendah. Dengan menghilangkan lapisan negosiasi dan wawancara, platform seperti Instawork dan Wonolo di pasar global, serta Staffinc di Indonesia, mampu mencapai _fill rate_ di atas 90% dalam waktu kurang dari 24 jam, dibandingkan dengan proses berhari-hari pada model tradisional.2 Bagi pelaku bisnis, ini mengubah tenaga kerja dari biaya tetap atau biaya variabel yang lambat menjadi aset yang benar-benar likuid (_liquid asset_) yang dapat ditingkatkan atau diturunkan secara _real-time_ untuk mencocokkan lonjakan permintaan (misalnya, saat _campaign_ tanggal kembar e-commerce). Bagi pekerja, model ini mendemokratisasi akses kerja dengan menghilangkan kebutuhan akan keterampilan menulis resume; akses ditentukan oleh skor keandalan (_reliability score_) dan keterampilan yang terverifikasi, bukan kemampuan menjual diri.5

#### Kelemahan dan Risiko Inheren

Namun, model dispatch menghadapi tantangan unik. "Komoditisasi" tenaga kerja menuntut proses pra-seleksi yang sangat ketat; jika platform menugaskan pekerja yang tidak kompeten, platformlah yang disalahkan, bukan pekerjanya.7 Berbeda dengan _job board_ yang umumnya tidak bertanggung jawab atas kualitas kecocokan, platform dispatch mempertaruhkan reputasinya pada setiap penugasan. Selain itu, model ini kurang efektif untuk peran yang membutuhkan _soft skills_ atau kecocokan budaya yang sulit dikuantifikasi oleh algoritma. Risiko hukum juga meningkat secara signifikan: dengan mengendalikan penugasan dan pembayaran, platform dispatch berisiko diklasifikasikan sebagai pemberi kerja (_employer_) daripada sekadar perantara, sebuah distinksi krusial dalam hukum ketenagakerjaan Indonesia yang akan dibahas lebih lanjut pada bagian Legalitas.8

## 2\. Arsitektur Algoritmik: Riset Pencocokan Sumber Daya Manusia

Keunggulan kompetitif utama dari sebuah _Daily Worker Hub_ terletak pada mesin pencocokannya (_matching engine_). Berbeda dengan _ride-hailing_ di mana kendala utamanya hanyalah lokasi dan jenis kendaraan, penempatan staf melibatkan kendala multidimensi termasuk set keterampilan (_skill sets_), sertifikasi, riwayat kinerja, preferensi pekerja, batasan jam kerja legal, dan manajemen kelelahan.

### 2.1 Formulasi Masalah: Pencocokan Bipartit dengan Kendala

Secara matematis, masalah alokasi pekerja harian dimodelkan sebagai **Masalah Pencocokan Bipartit Dinamis** (_Dynamic Bipartite Matching Problem_). Kita memiliki himpunan pekerja $W = \\{w\_1, w\_2,..., w\_m\\}$ dan himpunan shift/pekerjaan $J = \\{j\_1, j\_2,..., j\_n\\}$. Tujuannya adalah memilih subset sisi $E \\subseteq W \\times J$ sedemikian rupa sehingga fungsi objektif (misalnya, total utilitas, tingkat pemenuhan, atau keadilan) dimaksimalkan, dengan tunduk pada berbagai kendala.10

Graf ini disebut "bipartit" karena pencocokan hanya terjadi antara dua himpunan yang berbeda (pekerja dan pekerjaan), bukan di dalam himpunan yang sama. Namun, tidak seperti pencocokan statis, lingkungan ini bersifat **online** (pekerjaan dan pekerja datang secara berurutan dari waktu ke waktu) dan **stokastik** (pekerja mungkin membatalkan, permintaan tidak pasti).12

### 2.2 Algoritma 1: Pendekatan _Greedy_ (Baseline Transportasi)

Mekanisme:

Algoritma Greedy membuat pilihan lokal yang optimal pada setiap langkah. Dalam konteks dispatch, ketika sebuah pekerjaan $j$ masuk ke sistem, algoritma segera menugaskannya ke pekerja $w$ "terbaik" yang tersedia berdasarkan fungsi skor (misalnya, jarak, peringkat).

*   _Nearest Neighbor:_ Menugaskan pekerja terdekat untuk meminimalkan waktu perjalanan.
*   _First-Fit:_ Menugaskan pekerja terkualifikasi pertama yang menerima siaran (_broadcast_) pekerjaan.

Aplikasi dalam Daily Staffing:

Iterasi awal aplikasi gig sering menggunakan mekanisme greedy "siapa cepat dia dapat" di mana notifikasi dikirimkan ke semua pekerja yang memenuhi syarat, dan yang pertama mengklaim akan mendapatkan pekerjaan tersebut.14 Uber pada awalnya juga menggunakan pendekatan serupa: temukan pengemudi terdekat.

**Analisis Kritis:**

*   **Efisiensi:** Kompleksitas $O(1)$ atau $O(\\log N)$ per kedatangan. Sangat cepat dan skalabel.
*   **Kelemahan ("The Myopic Flaw"):** Algoritma _Greedy_ menderita pengambilan keputusan yang "rabun dekat". Menugaskan pekerja terbaik untuk pekerjaan biasa-biasa saja sekarang mungkin mencegah mereka mengambil pekerjaan kritis bernilai tinggi lima menit kemudian. Ini mengarah pada hasil global yang suboptimal. Dalam konteks staf, _First-Come-First-Served_ (FCFS) sering kali menguntungkan pekerja yang terus-menerus memantau ponsel mereka daripada pekerja yang paling andal atau terampil, yang berpotensi menurunkan kualitas layanan.15 Selain itu, pendekatan ini mengabaikan "biaya kesempatan" dari sisi pekerja yang mungkin lebih cocok untuk pekerjaan lain yang belum muncul.

### 2.3 Algoritma 2: Algoritma Hungarian (Optimasi Global)

Mekanisme:

Algoritma Hungarian (atau algoritma Munkres) memecahkan Masalah Penugasan (Assignment Problem) dalam waktu polinomial ($O(n^3)$). Algoritma ini menggunakan matriks biaya yang merepresentasikan "biaya" (atau utilitas negatif) dari menugaskan setiap pekerja ke setiap pekerjaan, dan menemukan pencocokan sempurna yang meminimalkan total biaya.17

Aplikasi dalam Daily Staffing:

Algoritma ini ideal jika platform melakukan Batch Matching. Misalnya, mengumpulkan semua pesanan untuk "besok pagi" dan menjalankan proses pencocokan pada pukul 18.00.

*   _Skenario:_ Jika Pekerja A dekat dengan Pekerjaan 1 dan Pekerjaan 2, tetapi Pekerja B hanya dekat dengan Pekerjaan 2, algoritma Hungarian cukup cerdas untuk menugaskan Pekerja A ke Pekerjaan 1 dan Pekerja B ke Pekerjaan 2. Hal ini memaksimalkan total tingkat pemenuhan (_fill rate_). Sebaliknya, algoritma _Greedy_ mungkin memberikan Pekerjaan 2 ke Pekerja A (karena dia yang terbaik/terdekat), meninggalkan Pekerjaan 1 tak terisi karena B terlalu jauh.19

**Analisis Kritis:**

*   **Efisiensi:** $O(n^3)$ sangat mahal secara komputasi untuk $N$ yang besar. Jika ada 10.000 pekerja dan 1.000 pekerjaan, matriksnya menjadi sangat besar.
*   **Relevansi:** Sangat relevan untuk perencanaan H-1 atau _shift_ terjadwal, tetapi terlalu lambat untuk _dispatch_ _real-time_ di mana latensi detik sangat penting. Uber menggunakan variasi dari ini dengan melakukan _batching_ permintaan dalam jendela waktu kecil (misalnya, setiap beberapa detik atau menit) untuk menjalankan mini-optimasi daripada penugasan _greedy_ murni.20

### 2.4 Algoritma 3: _Min-Cost Max-Flow_ (Aliran Jaringan)

Mekanisme:

Pendekatan ini memodelkan masalah pencocokan sebagai jaringan aliran (flow network).

*   Sebuah simpul "sumber" ($S$) terhubung ke semua pekerja.
*   Pekerja terhubung ke _shift_ yang mereka kualifikasi.
*   Shift terhubung ke sebuah simpul "tujuan" ($T$).  
    Kapasitas pada sisi (edges) memastikan setiap pekerja hanya mengambil satu shift (atau hingga batas legal mereka) dan setiap shift mendapatkan jumlah pekerja yang dibutuhkan. Setiap sisi memiliki "biaya" yang terkait dengan preferensi atau jarak.22

Aplikasi Strategis untuk Daily Worker Hub:

Metode ini sangat kuat untuk menangani kendala kapasitas—fitur kritis untuk Hub Pekerja Harian. Tidak seperti taksi (1 pengemudi, 1 penumpang), sebuah gudang mungkin membutuhkan 50 pekerja. Algoritma aliran jaringan dapat secara efisien menangani hubungan "satu-ke-banyak" (one-to-many) atau "banyak-ke-banyak" (many-to-many) dan dapat menegakkan kendala seperti "maksimum 40 jam per minggu" atau "minimal 3 supervisor terampil per shift" dengan menyesuaikan kapasitas sisi graf.11

### 2.5 Perbatasan Lanjutan: _Multi-Objective Optimization_ & _Reinforcement Learning_

Pencocokan "terbaik" jarang hanya tentang jarak atau keterampilan tunggal. Ini melibatkan tujuan yang saling bertentangan yang harus diselesaikan secara simultan.

**Tujuan yang Bertentangan:**

1.  **Maksimalkan Fill Rate:** Pastikan setiap pekerjaan mendapatkan pekerja.
2.  **Maksimalkan Kualitas:** Kirim pekerja dengan rating tertinggi ke klien VIP.
3.  **Minimalkan Jarak Tempuh:** Kurangi kelelahan pekerja dan keterlambatan.
4.  **Maksimalkan Keadilan (_Fairness_):** Distribusikan pekerjaan sehingga pekerja baru mendapat kesempatan untuk membangun rating (masalah _cold start_) dan mencegah sekelompok kecil elit memonopoli semua pendapatan.12

**Solusi Algoritmik:**

*   **Multi-Objective Evolutionary Algorithms (MOEA):** Algoritma seperti NSGA-II atau NSGA-III digunakan untuk menemukan himpunan solusi "Pareto optimal", di mana peningkatan satu metrik tidak secara tidak proporsional merugikan metrik lainnya.26 Misalnya, algoritma mungkin sedikit meningkatkan rata-rata jarak tempuh untuk memastikan bahwa 20% _shift_ diberikan kepada pekerja baru, sehingga menjaga kolam pasokan tetap sehat dan berkembang.
*   **Reinforcement Learning (RL):** Platform semakin bergerak menuju RL, di mana sistem "belajar" dari imbalan jangka panjang. Alih-alih hanya mengoptimalkan pencocokan segera, agen RL mungkin memprediksi bahwa menugaskan Pekerja X ke pekerjaan yang jauh hari ini mungkin menyebabkan mereka _churn_ (keluar dari platform), dan dengan demikian "menyimpan" mereka untuk pekerjaan yang lebih dekat besok. Optimasi "nilai jangka panjang" ini adalah ujung tombak teknologi dispatch.28

## 3\. Arsitektur Operasional: Mesin "Human-in-the-Loop"

Sementara algoritma mendorong efisiensi, operasi mendorong keandalan. Model operasional _Daily Worker Hub_ di Indonesia harus menavigasi kesenjangan infrastruktur dan nuansa budaya lokal.

### 3.1 Vetting dan Onboarding: Mesin Kepercayaan

Dalam platform tanpa izin seperti Uber, hambatan masuk rendah. Namun, untuk _hub staffing_ di mana pekerja memasuki gudang pribadi, dapur restoran, atau tempat acara, kepercayaan adalah non-negosiabel.

*   **Pra-Penyaringan Digital:** Penggunaan OCR (_Optical Character Recognition_) untuk memindai e-KTP dan SKCK (Surat Keterangan Catatan Kepolisian) adalah standar. Startup seperti Staffinc dan MyRobin mengintegrasikan pemeriksaan ini langsung ke dalam alur _onboarding_ aplikasi.6 Namun, mengingat sistem data Indonesia yang terfragmentasi, validasi sering kali masih memerlukan lapisan tinjauan manusia atau integrasi dengan API Dukcapil melalui vendor pihak ketiga.
*   **Verifikasi Keterampilan via "Briefing Online":** Berbeda dengan SIM yang bertindak sebagai proksi universal untuk keterampilan mengemudi, keterampilan tenaga kerja manual terfragmentasi. Platform menggunakan "Mikro-kredensial" melalui kuis dalam aplikasi atau sesi **briefing online** wajib sebelum pekerja dapat mengambil jenis pekerjaan tertentu. Snippet riset menunjukkan bahwa MyRobin menggunakan sesi briefing online via Google Meet untuk memastikan pekerja memahami SOP dan etika kerja sebelum terjun ke lapangan.31
*   **Filter "Shift Pertama":** Banyak platform menggunakan _shift_ pertama sebagai masa percobaan. Pekerja mungkin dibatasi pada _shift_ "Entry Level" sampai mereka menerima peringkat positif, membuka kunci _tier_ "Skilled" atau "VIP". Akses bertingkat ini memgamifikasi keandalan dan melindungi klien bernilai tinggi.33

### 3.2 Manajemen Kinerja dan Gamifikasi

Retensi dalam ekonomi gig kerah biru sangat sulit karena biaya peralihan yang rendah. Platform menggunakan gamifikasi untuk mengunci loyalitas.

*   **Sistem Status Bertingkat (Tiered Status):** Mirip dengan Uber Pro atau GrabRewards, platform pekerja menerapkan tingkatan (misal: Bronze, Silver, Gold, Platinum). Tingkatan yang lebih tinggi membuka manfaat ekonomi nyata: **akses lebih awal ke shift** (memungkinkan mereka memilih jam terbaik sebelum orang lain), opsi pembayaran instan (InstaPay), dan bonus tarif per jam.34 Riset pada Instawork menunjukkan bahwa status "Platinum" membutuhkan penyelesaian minimal 15 shift per bulan dan rating 4.9, memberikan akses prioritas yang signifikan.36
*   **Skor Keandalan (_Reliability Score_):** Aset paling berharga seorang pekerja adalah skor keandalannya. _No-show_ (tidak hadir tanpa kabar) adalah "dosa besar" dalam staffing _on-demand_. Algoritma sangat menghukum pembatalan mendadak atau ketidakhadiran, sering kali menangguhkan akun atau menurunkan tingkatan segera. Sebaliknya, "Reliability Streaks" dihargai dengan bonus.4
*   **Insentif Keuangan Instan:** Di Indonesia, di mana kendala arus kas sangat akut bagi penerima upah harian, fitur seperti "Earned Wage Access" (mendapatkan bayaran segera setelah _shift_) adalah alat retensi yang ampuh. Ini memerlukan integrasi mendalam dengan rel _fintech_ untuk memproses pembayaran harian daripada bulanan.6

### 3.3 Alur Pengguna "Instant Matching"

Keberhasilan operasional bergantung pada UX yang tanpa gesekan.

1.  **Posting Pekerjaan:** Klien memposting kebutuhan ("Butuh Waiter, Hotel Mulia, Nanti Malam jam 18.00"). Sistem mem-parsing ini menjadi data terstruktur (Lokasi, Peran, Seragam, Bayaran).
2.  **Notifikasi (_The Push_):** Algoritma mengidentifikasi kolam kandidat. Menggunakan sistem notifikasi "Air Terjun" (_Waterfall_): pertama, 'Favorite Roster' klien diberitahu. Jika tidak terisi setelah 10 menit, meluas ke pekerja 'Platinum' terdekat. Kemudian 'Gold', dan akhirnya, kolam umum.33 Ini menyeimbangkan preferensi klien dengan kecepatan pengisian.
3.  **Konfirmasi:** Pekerja menerima melalui satu ketukan. Prinsip "siapa cepat dia dapat" berlaku dalam tingkatan tersebut.
4.  **Verifikasi Pra-Shift:** 2 jam sebelum _shift_, aplikasi meminta pekerja untuk "Konfirmasi Kehadiran". Kegagalan untuk mengonfirmasi memicu _dispatch_ cadangan secara otomatis untuk mencegah kekosongan.39
5.  **Eksekusi:** _Geofencing_ memverifikasi kedatangan. Pekerja melakukan _clock-in_ via GPS/Selfie di lokasi.
6.  **Penyelesaian & Rating:** Supervisor menilai pekerja; Pekerja menilai supervisor. Pembayaran dipicu.

### 3.4 Standarisasi Atribut: Seragam dan SOP

Tantangan utama dalam _dispatch_ harian adalah memastikan pekerja datang dengan perlengkapan yang tepat.

*   **Kebijakan Seragam:** Berbeda dengan karyawan tetap yang mendapat seragam, pekerja harian sering diminta membawa sendiri. Platform harus menegakkan aturan "Seragam Standar" (misal: Kemeja Putih, Celana Hitam, Sepatu Pantofel untuk _waiter_). Riset menunjukkan bahwa SOP yang ketat mengenai penampilan (_grooming_) dan kebersihan adalah bagian integral dari _briefing_ sebelum kerja.40
*   **Penalti Ketidaksesuaian:** Pekerja yang datang salah kostum dapat ditolak oleh klien, yang dihitung sebagai _No-Show_ dalam algoritma, memicu penurunan skor keandalan.

## 4\. Analisis Kompetitor: Lanskap Persaingan di Indonesia

Pasar staf digital Indonesia sangat dinamis, ditandai dengan campuran antara vertikal khusus dan platform horizontal luas.

### 4.1 Pemain Kunci dan Model Operasional

*   **Staffinc (dahulu Sampingan):** Pemimpin pasar dalam manajemen tenaga kerja kerah biru. Model mereka adalah hibrida antara _Managed Service Provider_ (MSP) dan platform teknologi. Mereka tidak hanya mencocokkan; mereka menangani seluruh tumpukan HRIS (penggajian, kehadiran, pajak). Kekuatan mereka terletak pada database besar (1 juta+ pekerja) dan integrasi mendalam dengan perusahaan besar untuk peran bervolume tinggi (logistik, penjualan).38
*   **MyRobin:** Beroperasi sebagai pasar "Workforce-as-a-Service". Mereka sangat fokus pada pra-penyaringan dan membangun "komunitas" pekerja. Model bisnis mereka menekankan ekosistem yang "lengket", menawarkan produk inklusi keuangan (pinjaman, asuransi) kepada pekerja, sehingga meningkatkan retensi dan keandalan.6 MyRobin juga menekankan pada _briefing online_ dan _screening_ ketat untuk memastikan kualitas.32
*   **Workmate:** Membedakan diri melalui "Sistem Rating Pekerja" yang canggih dan manajemen _end-to-end_. Mereka memposisikan diri bukan hanya sebagai aplikasi pencocokan tetapi sebagai sistem operasi tenaga kerja lengkap untuk perusahaan, mengotomatiskan penjadwalan _shift_ dan pelacakan kehadiran.1
*   **Lumina & KitaLulus:** Platform ini lebih condong ke model "Discovery/Job Board" tetapi dioptimalkan untuk pengguna _mobile-first_ dan kerah biru. Mereka fokus pada pembangunan komunitas dan pencegahan penipuan dalam daftar pekerjaan, namun biasanya tidak memiliki kapabilitas "dispatch instan" dan manajemen operasional sedalam Staffinc atau Workmate.45

### 4.2 Matriks Diferensiasi Strategis

Untuk mendisrupsi lanskap ini dengan _Daily Worker Hub_ baru, strategi harus beralih dari _listing_ ke _managing_.

*   **Kesenjangan Saat Ini:** Sebagian besar pesaing pada dasarnya adalah agensi _outsourcing_ yang didigitalkan. Ada ruang untuk **"Uber for Staffing"** murni yang berfokus pada _gigs_ durasi pendek yang hiper-lokal (misalnya, "Saya butuh pencuci piring untuk 4 jam _sekarang_") yang terlalu kaku untuk ditangani oleh kontrak _outsourcing_ tradisional.
*   **Peluang:** Sektor UMKM (kafe, pengecer kecil) kurang terlayani. Pemain besar seperti Staffinc fokus pada kontrak perusahaan besar. Aplikasi pencocokan instan yang memungkinkan pemilik kedai kopi memesan barista untuk menggantikan yang sakit dalam 30 menit akan membuka pasar yang besar dan terfragmentasi.

## 5\. Kerangka Hukum dan Regulasi: Menavigasi Kompleksitas Ketenagakerjaan Indonesia

Mengoperasikan platform pekerja harian di Indonesia memerlukan navigasi yang cermat dalam jaring peraturan ketenagakerjaan, terutama pasca-pemberlakuan UU Cipta Kerja.

### 5.1 Status "Pekerja Harian Lepas" (PKHL)

Konstruksi hukum inti untuk model bisnis ini adalah _Perjanjian Kerja Harian Lepas_ (PKHL), yang merupakan bagian dari Perjanjian Kerja Waktu Tertentu (PKWT).

*   **Aturan 21 Hari:** Berdasarkan PP No. 35 Tahun 2021 (Pasal 10), perjanjian kerja harian hanya sah jika pekerja bekerja **kurang dari 21 hari dalam satu bulan**.
*   **Risiko Permanensi:** Jika seorang pekerja bekerja 21 hari atau lebih selama **tiga bulan berturut-turut**, status hukum mereka secara otomatis berubah menjadi Karyawan Tetap (PKWTT) demi hukum.47
*   **Implikasi Algoritmik:** Algoritma pencocokan **wajib** memiliki kendala keras (_hard constraint_) untuk mencegah pekerja ditugaskan ke klien yang sama lebih dari 20 hari dalam sebulan. Kegagalan menegakkan ini memaparkan klien pada kewajiban besar (pesangon, tunjangan tetap), yang akan menghancurkan proposisi nilai platform. Sistem harus memblokir pekerja yang mendekati ambang batas ini untuk klien tertentu.

### 5.2 Jaminan Sosial (BPJS)

Meskipun berstatus pekerja harian, individu ini berhak atas jaminan sosial. Platform harus menavigasi siapa yang membayar premi BPJS (Kesehatan dan Ketenagakerjaan).

*   **Kemitraan vs. Hubungan Kerja:** Jika platform mengklasifikasikan pekerja sebagai "Mitra", mirip dengan pengemudi Gojek, kewajiban BPJS sering kali bergeser ke pekerja (BPU - _Bukan Penerima Upah_). Namun, jika platform melakukan kontrol berlebihan (seragam, jadwal ketat), pemerintah dapat mengklasifikasikan ulang mereka sebagai karyawan, memicu kewajiban BPJS sisi pemberi kerja.48
*   **Praktik Terbaik:** Platform yang sukses sering memfasilitasi pendaftaran BPJS BPU dan memotong premi secara otomatis dari pendapatan untuk memastikan kepatuhan tanpa mengambil kewajiban "pemberi kerja" penuh. Namun, isu pencairan JHT (Jaminan Hari Tua) bagi pekerja dengan status tidak tetap masih menjadi tantangan administratif di lapangan.50

### 5.3 Validitas Kontrak Digital dan UU ITE

Di bawah UU ITE (UU No. 11/2008 & UU No. 19/2016), kontrak kerja digital adalah sah dan dapat diterima di pengadilan.

*   **Click-Wrap Agreements:** Penawaran _shift_ yang diterima dengan mengklik "Saya Setuju" merupakan kontrak elektronik yang mengikat.
*   **Tanda Tangan Digital:** Untuk perjanjian induk (_Master Agreement_), platform memanfaatkan tanda tangan digital tersertifikasi (seperti PrivyID, Vida) untuk memastikan non-repudiasi. Sistem harus secara otomatis menghasilkan PKHL digital (Surat Perintah Kerja) yang diberi stempel waktu untuk setiap _shift_ guna membuat jejak audit yang dapat diverifikasi.51 Keabsahan ini krusial untuk melindungi platform dan klien dari sengketa hubungan industrial.

### 5.4 Sanksi dan Kepatuhan

Ketidakpatuhan terhadap aturan pengupahan atau pembayaran THR bagi pekerja yang memenuhi syarat (masa kerja 1 bulan terus menerus) dapat berujung pada sanksi administratif dan denda.

*   **Denda Keterlambatan Upah:** Berdasarkan PP Pengupahan, keterlambatan pembayaran gaji dikenakan denda 5% per hari keterlambatan mulai hari ke-4.53 Sistem _Instant Pay_ atau pembayaran tepat waktu sangat krusial untuk menghindari risiko ini.
*   **Kompensasi PKWT:** Meskipun pekerja harian lepas memiliki aturan khusus, transisi status ke PKWT dapat memicu kewajiban pembayaran uang kompensasi pada akhir kontrak sesuai PP 35/2021.54

## 6\. Analisis Mendalam Algoritma Pencocokan

### 6.1 Tantangan Matematis Logistik Manusia

Transisi dari model "Penemuan" ke "Dispatch" secara fundamental mengubah masalah matematis dari **Pencarian** (_Information Retrieval_) menjadi **Optimasi** (_Operations Research_). Dalam model pencarian, kompleksitas komputasi rendah—memfilter baris database berdasarkan kata kunci. Dalam model dispatch, sistem harus memecahkan **Masalah Alokasi Sumber Daya** secara _real-time_.

Masalah ini dapat dijelaskan secara formal sebagai berikut:

Misalkan $T$ adalah himpunan interval waktu.

Misalkan $W$ adalah himpunan pekerja, di mana setiap pekerja $w$ memiliki atribut $A\_w$ (keterampilan, rating, lokasi) dan kalender ketersediaan $C\_w \\subset T$.

Misalkan $J$ adalah himpunan pekerjaan, di mana setiap pekerjaan $j$ memiliki persyaratan $R\_j$ (keterampilan yang dibutuhkan, lokasi) dan interval waktu $I\_j \\subset T$.

Tujuannya adalah menemukan pencocokan $M = \\{(w, j)\\}$ yang memaksimalkan fungsi utilitas global $U(M)$, dengan tunduk pada:

1.  **Kendala Kualifikasi:** $R\_j \\subseteq A\_w$ untuk semua $(w, j) \\in M$.
2.  **Kendala Waktu:** $I\_j \\subseteq C\_w$ (Pekerja bebas/tersedia).
3.  **Kendala Non-Overlapping:** Jika $(w, j\_1) \\in M$ dan $(w, j\_2) \\in M$, maka $I\_{j1} \\cap I\_{j2} = \\emptyset$ (Pekerja tidak bisa berada di dua tempat sekaligus).
4.  **Kendala Legal (Spesifik Indonesia):** $\\sum\_{j \\in M\_w} \\text{Durasi}(j) < \\text{Batas}\_{legal}$ (misalnya, <21 hari/bulan per klien untuk menghindari PKWTT).

### 6.2 Algoritma _Greedy_: Kecepatan vs. Optimalitas

Konsep:

Algoritma Greedy beroperasi pada prinsip kepuasan segera. Ketika permintaan pekerjaan masuk ke sistem, algoritma memindai kumpulan pekerja yang tersedia dan menugaskan kandidat "terbaik" yang tersedia pada saat itu juga.

*   Nearest Neighbor (Berbasis Lokasi):  
      
    $$\\text{Skor}(w, j) = \\frac{1}{\\text{Jarak}(w, j)}$$  
      
    Ini meminimalkan waktu perjalanan bagi pekerja, yang sangat penting untuk pekerjaan gig berupah rendah di mana biaya perjalanan dapat memakan pendapatan.
*   First-Fit (Berbasis Waktu):  
    Sistem menyiarkan pekerjaan ke semua pekerja yang memenuhi syarat. Yang pertama menerima akan dicocokkan. Ini adalah model yang digunakan oleh Uber (awalnya) dan banyak aplikasi gig.

**Keuntungan:**

*   **Responsivitas:** Umpan balik segera untuk klien. "Kami menemukan pekerja!" terjadi dalam hitungan detik.
*   **Kesederhanaan:** Mudah diimplementasikan dan diskalakan. Tidak ada perhitungan matriks yang kompleks.
*   **Agensi Pekerja:** Dalam model "siaran", pekerja merasa memegang kendali karena mereka secara aktif "mengklaim" _shift_.

Kelemahan ("Cacat Rabun Jauh"):

Pertimbangkan skenario dengan dua pekerjaan dan dua pekerja:

*   Pekerjaan A (Butuh keterampilan dasar, 1km dari Pekerja X).
*   Pekerjaan B (Butuh keterampilan ahli, 1km dari Pekerja X, 10km dari Pekerja Y).
*   Pekerja X (Keterampilan ahli).
*   Pekerja Y (Keterampilan dasar).

Algoritma _Greedy_ mungkin menugaskan Pekerjaan A ke Pekerja X karena mereka dekat. Ketika Pekerjaan B datang, hanya Pekerja Y yang tersisa. Pekerja Y tidak memiliki keterampilan untuk Pekerjaan B (atau terlalu jauh), meninggalkan Pekerjaan B tidak terisi. Optimasi global akan menugaskan Pekerjaan A ke Pekerja Y (jarak suboptimal, tapi layak) dan Pekerjaan B ke Pekerja X (pencocokan optimal), mengisi keduanya.

### 6.3 Algoritma Hungarian: Memecahkan Masalah Penugasan

Konsep:

Algoritma Hungarian adalah algoritma optimasi kombinatorial yang memecahkan masalah penugasan dalam waktu polinomial, khususnya $O(n^3)$. Ini bekerja pada matriks biaya.

Konstruksi Matriks Biaya:

Kita mendefinisikan biaya $C\_{wj}$ untuk menugaskan pekerja $w$ ke pekerjaan $j$. Biaya ini bisa berupa metrik komposit:

$$C\_{wj} = \\alpha \\cdot \\text{Jarak}(w, j) + \\beta \\cdot (5 - \\text{Rating}\_w) + \\gamma \\cdot \\text{BiayaTenagaKerja}\_w$$

(Di mana $\\alpha, \\beta, \\gamma$ adalah bobot). Algoritma memanipulasi matriks ini (reduksi baris/kolom) untuk menemukan kombinasi penugasan yang meminimalkan jumlah $C\_{wj}$ untuk semua pencocokan.

Trade-off Strategis:

Meskipun elegan secara matematis, kompleksitas $O(n^3)$ adalah hambatan. Untuk 10.000 pekerja dan 10.000 pekerjaan, komputasi melibatkan operasi pada matriks skala $10^8$. Ini tidak layak untuk dispatch real-time detik-per-detik.

*   **Kasus Penggunaan Terbaik:** "**Batching**". Alih-alih mencocokkan secara instan, platform mengakumulasi semua pesanan yang diterima antara pukul 08.00 dan 08.15. Kemudian menjalankan Algoritma Hungarian pada _batch_ ini. Penundaan 15 menit ini memungkinkan pencocokan "global" yang jauh lebih baik daripada pendekatan _greedy_. Uber menggunakan logika ini untuk sistem pencocokan _batch_ dan "Uber Pool" untuk mengurangi waktu tunggu agregat.20

### 6.4 Algoritma _Network Flow_ (_Min-Cost Max-Flow_)

Konsep:

Pendekatan ini memodelkan tenaga kerja sebagai jaringan aliran.

*   **Simpul Sumber ($S$):** Mewakili pasokan tenaga kerja.
*   **Simpul Pekerja ($W$):** Sisi dari $S$ ke $W$ memiliki kapasitas = 1 (setiap pekerja adalah satu unit).
*   **Simpul Pekerjaan ($J$):** Sisi dari $W$ ke $J$ ada jika pekerja memenuhi syarat. "Biaya" sisi adalah kebalikan dari skor preferensi.
*   **Simpul Tujuan ($T$):** Sisi dari $J$ ke $T$ memiliki kapasitas = 1 (atau $N$ jika pekerjaan membutuhkan $N$ orang).

Algoritma mendorong "aliran" dari $S$ ke $T$ mencoba memaksimalkan aliran (mengisi semua pekerjaan) sambil meminimalkan biaya (pencocokan terbaik).

Keuntungan Strategis untuk "Daily Worker Hub":

Tidak seperti algoritma Hungarian yang mengasumsikan pencocokan 1:1 (1 pekerja untuk 1 pekerjaan), Network Flow menangani logika 1:Banyak atau Banyak:1 secara alami.

*   _Skenario:_ Sebuah gudang membutuhkan 50 _packer_. Algoritma Hungarian berjuang dengan persyaratan "kelompok" ini. _Network Flow_ cukup menetapkan kapasitas Simpul Pekerjaan Gudang menjadi 50. Algoritma kemudian secara otomatis menuangkan 50 pekerja terbaik ke dalam simpul itu.
*   _Penanganan Kendala:_ Kendala seperti "Pekerja A dapat bekerja maksimal 3 _shift_ minggu ini" dapat dimodelkan dengan menambahkan simpul perantara "Kapasitas Mingguan" dalam graf.11

### 6.5 Optimasi Multi-Objektif dan Keadilan

Optimasi murni untuk "Kepuasan Klien" (memberikan pekerja terbaik kepada setiap klien) mengarah pada **"Efek Superstar"**. 10% pekerja teratas mendapatkan semua pekerjaan, sementara pekerja baru tidak mendapatkan apa-apa. Ini menyebabkan pekerja baru keluar (_churn_), menyusutkan kolam pasokan, yang akhirnya merugikan platform.

Algoritma Sadar Keadilan (Fairness-Aware Algorithms):

Untuk mengatasi ini, kita memperkenalkan Kendala Keadilan atau fungsi Multi-Objektif.

*   **Objektif 1:** Maksimalkan Utilitas Klien (Keterampilan/Rating).
*   **Objektif 2:** Maksimalkan Ekuitas Pekerja (Sebarkan pekerjaan ke pekerja baru/volume rendah).

Eksplorasi Epsilon-Greedy:

Dipinjam dari Reinforcement Learning (dan masalah bandit), sistem bertindak secara "Greedy" (memilih pekerja terbaik) 90% dari waktu, tetapi bertindak secara "Acak" (memilih pekerja terkualifikasi secara acak) 10% dari waktu. "Eksplorasi" ini memungkinkan pekerja baru untuk membuktikan diri dan mendapatkan rating, memecahkan siklus cold-start.

Keadilan Berbasis Kuota:

Algoritma dapat menegakkan kendala: "Pastikan 20% dispatch diberikan kepada pekerja dengan <5 shift selesai." Ini memaksa pemrograman linier untuk menemukan solusi yang memenuhi persyaratan keragaman ini.12

## 7\. Rekomendasi Strategis

Berdasarkan analisis di atas, berikut adalah rekomendasi strategis untuk membangun dan mengoperasikan _Daily Worker Hub_ yang sukses di Indonesia:

1.  **Adopsi Pendekatan Algoritma Hibrida:** Gunakan pendekatan **Batching + Hungarian/Min-Cost Max-Flow** untuk _shift_ yang diposting >24 jam sebelumnya untuk memaksimalkan efisiensi global dan perencanaan kapasitas. Beralih ke pendekatan **Greedy + Geofencing** untuk permintaan "Mendesak/Hari H" guna memaksimalkan kecepatan respons.
2.  **Tanamkan Kepatuhan Hukum ke dalam Kode:** "Aturan 21 Hari" harus menjadi kendala keras (_hard-coded constraint_). Sistem harus secara proaktif memperingatkan klien ketika pekerja mendekati ambang batas tersebut dan secara otomatis menyarankan kandidat alternatif, melindungi klien dari risiko hubungan industrial.
3.  **Gamifikasi Keandalan, Bukan Hanya Volume:** Bangun sistem "Tier" (Bronze/Silver/Gold/Platinum) terutama di sekitar metrik _keandalan_ (tingkat kehadiran, ketepatan waktu) daripada sekadar volume pekerjaan. Dalam pasar tenaga kerja harian, keandalan adalah komoditas yang paling langka. Berikan insentif nyata seperti _Instant Pay_ untuk tier tinggi.
4.  **Targetkan "Long Tail" UMKM:** Sementara klien perusahaan besar membawa volume, mereka menuntut margin rendah dan tempo pembayaran lama. Peluang margin tinggi terletak pada penyediaan "bantuan instan" bagi ribuan UMKM yang saat ini bergantung pada grup WhatsApp yang kacau untuk mencari staf cadangan.
5.  **Fasilitasi Kepatuhan Digital:** Integrasikan tanda tangan digital dan pembuatan kontrak kerja otomatis untuk setiap _shift_. Ini memberikan kepastian hukum bagi kedua belah pihak dan menciptakan jejak audit yang kuat sesuai dengan UU ITE.

## Kesimpulan

Model "Daily Worker Hub" mewakili industrialisasi ekonomi gig. Dengan beralih dari model "Pencarian" ke model "Dispatch Algoritmik", platform dapat membuka efisiensi besar-besaran, mengurangi waktu pengisian dari hari menjadi menit. Namun, kesuksesan di Indonesia bukan hanya tentang kode. Ini memerlukan **Strategi Tri-Partit**: Kecanggihan Algoritmik untuk optimasi sumber daya, Ketelitian Operasional melalui gamifikasi dan verifikasi, serta Rekayasa Hukum untuk memastikan kepatuhan terhadap regulasi ketenagakerjaan yang kompleks. Pemenang di ruang ini bukanlah yang memiliki UI terbaik, melainkan yang dapat secara matematis dan legal menjamin **Keandalan pada Skala Besar**.

_Akhir Laporan_

#### Works cited

1.  Gujarat Kidney IPO Day 1: Subscription Begins Today, ₹251-Crore ..., accessed January 2, 2026, [https://formacioncp.es/?zhHant/product/surugaya/17738290?campaign\_uid=f64d716db5e979ed2f947dbaf4296895b951ae7f](https://formacioncp.es/?zhHant/product/surugaya/17738290?campaign_uid=f64d716db5e979ed2f947dbaf4296895b951ae7f)
2.  The Best On-Demand Staffing Apps 2025 - Instawork, accessed January 2, 2026, [https://www.instawork.com/blog/on-demand-staffing-app](https://www.instawork.com/blog/on-demand-staffing-app)
3.  Workmate helps blue-collar workers find jobs during a time of crisis, accessed January 2, 2026, [https://kr-asia.com/workmate-helps-blue-collar-workers-find-jobs-during-a-time-of-crisis-startup-stories](https://kr-asia.com/workmate-helps-blue-collar-workers-find-jobs-during-a-time-of-crisis-startup-stories)
4.  Instawork: Connect with thousands of workers near you, accessed January 2, 2026, [https://www.instawork.com/](https://www.instawork.com/)
5.  Report: Instawork's Business Breakdown & Founding Story, accessed January 2, 2026, [https://research.contrary.com/company/instawork](https://research.contrary.com/company/instawork)
6.  MyRobin: Provide Blue-collar Workers in Indonesia with Fair Access ..., accessed January 2, 2026, [https://www.alibabacloud.com/blog/myrobin-provide-blue-collar-workers-in-indonesia-with-fair-access-to-jobs\_598487](https://www.alibabacloud.com/blog/myrobin-provide-blue-collar-workers-in-indonesia-with-fair-access-to-jobs_598487)
7.  Instawork vs. Gigpro: Comparing On-Demand Job Platforms, accessed January 2, 2026, [https://www.shiftnow.com/blog/instawork-vs-gigpro](https://www.shiftnow.com/blog/instawork-vs-gigpro)
8.  The Hidden Legal Traps of Outsourcing in Indonesia: Compliance ..., accessed January 2, 2026, [https://kusumalawfirm.com/article/the-hidden-legal-traps-of-outsourcing-in-indonesia-compliance-challenges-and-companies-tips/](https://kusumalawfirm.com/article/the-hidden-legal-traps-of-outsourcing-in-indonesia-compliance-challenges-and-companies-tips/)
9.  10 Key Insights of Outsourcing and Contract Worker Regulations ..., accessed January 2, 2026, [https://www.wearesynergypro.com/news/10-key-insights-to-master-the-outsourcing-and-contract-worker-regulations-indonesia](https://www.wearesynergypro.com/news/10-key-insights-to-master-the-outsourcing-and-contract-worker-regulations-indonesia)
10.  Improved Online Contention Resolution for Matchings and ..., accessed January 2, 2026, [https://pubsonline.informs.org/doi/10.1287/moor.2023.1388](https://pubsonline.informs.org/doi/10.1287/moor.2023.1388)
11.  5.1 Bipartite Matching - cs.wisc.edu, accessed January 2, 2026, [https://pages.cs.wisc.edu/~shuchi/courses/787-F09/scribe-notes/lec5.pdf](https://pages.cs.wisc.edu/~shuchi/courses/787-F09/scribe-notes/lec5.pdf)
12.  Rawlsian Fairness in Online Bipartite Matching - AAAI Publications, accessed January 2, 2026, [https://ojs.aaai.org/index.php/AAAI/article/view/25698/25470](https://ojs.aaai.org/index.php/AAAI/article/view/25698/25470)
13.  Lecture notes on online bipartite matching algorithms., accessed January 2, 2026, [https://www.cs.cornell.edu/courses/cs6820/2012fa/handouts/online-matching.pdf](https://www.cs.cornell.edu/courses/cs6820/2012fa/handouts/online-matching.pdf)
14.  Why do I receive notifications about available shifts but still end up ..., accessed January 2, 2026, [https://help.instawork.com/en/articles/13216540-why-do-i-receive-notifications-about-available-shifts-but-still-end-up-on-the-waiting-list-in-instawork](https://help.instawork.com/en/articles/13216540-why-do-i-receive-notifications-about-available-shifts-but-still-end-up-on-the-waiting-list-in-instawork)
15.  greedy matching in bipartite random graphs - Nick Arnosti, accessed January 2, 2026, [https://nickarnosti.com/ResearchPapers/Arnosti\_GreedyMatching.pdf](https://nickarnosti.com/ResearchPapers/Arnosti_GreedyMatching.pdf)
16.  Randomized Online Algorithms for Minimum Metric Bipartite Matching, accessed January 2, 2026, [https://www.ccs.neu.edu/home/ljp/online-match-SODA.pdf](https://www.ccs.neu.edu/home/ljp/online-match-SODA.pdf)
17.  How Uber Prepares Its Ride-Matching App for High Demand, accessed January 2, 2026, [https://www.frugaltesting.com/blog/how-uber-prepares-its-ride-matching-app-for-high-demand](https://www.frugaltesting.com/blog/how-uber-prepares-its-ride-matching-app-for-high-demand)
18.  Optimizing Bipartite Matching in Real-World Applications by ..., accessed January 2, 2026, [https://vldb.org/pvldb/vol14/p1150-abeywickrama.pdf](https://vldb.org/pvldb/vol14/p1150-abeywickrama.pdf)
19.  Bipartite matching (Python) - Data Science with Harsha, accessed January 2, 2026, [https://www.harshaash.com/Python/Bipartite%20matching/](https://www.harshaash.com/Python/Bipartite%20matching/)
20.  Uber Marketplace Matching, accessed January 2, 2026, [https://www.uber.com/us/en/marketplace/matching/](https://www.uber.com/us/en/marketplace/matching/)
21.  How Uber Uses Predictive Analytics for Ride Matching - Brainforge.ai, accessed January 2, 2026, [https://www.brainforge.ai/blog/how-uber-uses-predictive-analytics-for-ride-matching](https://www.brainforge.ai/blog/how-uber-uses-predictive-analytics-for-ride-matching)
22.  Minimum Cost Flows | OR-Tools - Google for Developers, accessed January 2, 2026, [https://developers.google.com/optimization/flow/mincostflow](https://developers.google.com/optimization/flow/mincostflow)
23.  Minimum-cost flow - Algorithms for Competitive Programming, accessed January 2, 2026, [https://cp-algorithms.com/graph/min\_cost\_flow.html](https://cp-algorithms.com/graph/min_cost_flow.html)
24.  Network Flow Models for Intraday Personnel Scheduling Problems, accessed January 2, 2026, [https://people.cs.nott.ac.uk/pszrq/files/AOR12networkflow.pdf](https://people.cs.nott.ac.uk/pszrq/files/AOR12networkflow.pdf)
25.  Hiring with Algorithmic Fairness Constraints: Theory and Empirics, accessed January 2, 2026, [https://parasurama.github.io/jmp/hiring\_with\_fairness\_constraints.pdf](https://parasurama.github.io/jmp/hiring_with_fairness_constraints.pdf)
26.  (PDF) A Multi-Objective Optimization for Locating Maintenance ..., accessed January 2, 2026, [https://www.researchgate.net/publication/380522347\_A\_Multi-Objective\_Optimization\_for\_Locating\_Maintenance\_Stations\_and\_Operator\_Dispatching\_of\_Corrective\_Maintenance](https://www.researchgate.net/publication/380522347_A_Multi-Objective_Optimization_for_Locating_Maintenance_Stations_and_Operator_Dispatching_of_Corrective_Maintenance)
27.  (PDF) Multiobjective optimization allocation of multi‐skilled workers ..., accessed January 2, 2026, [https://www.researchgate.net/publication/374028665\_Multiobjective\_optimization\_allocation\_of\_multi-skilled\_workers\_considering\_the\_skill\_heterogeneity\_and\_time-varying\_effects\_in\_unit\_brake\_production\_lines](https://www.researchgate.net/publication/374028665_Multiobjective_optimization_allocation_of_multi-skilled_workers_considering_the_skill_heterogeneity_and_time-varying_effects_in_unit_brake_production_lines)
28.  Deep Policies for Online Bipartite Matching - OpenReview, accessed January 2, 2026, [https://openreview.net/pdf?id=mbwm7NdkpO](https://openreview.net/pdf?id=mbwm7NdkpO)
29.  A Fairness-Aware Order Dispatch System for Instant Delivery Service, accessed January 2, 2026, [https://www.researchgate.net/publication/365455940\_Toward\_Multi-sided\_Fairness\_A\_Fairness-Aware\_Order\_Dispatch\_System\_for\_Instant\_Delivery\_Service](https://www.researchgate.net/publication/365455940_Toward_Multi-sided_Fairness_A_Fairness-Aware_Order_Dispatch_System_for_Instant_Delivery_Service)
30.  MyRobin.ID, workforce-as-a-service marketplace, announces close ..., accessed January 2, 2026, [https://www.accion.org/news/myrobin-id-workforce-as-a-service-marketplace-announces-close-of-pre-series-a-led-by-accion-venture-lab-sosv/](https://www.accion.org/news/myrobin-id-workforce-as-a-service-marketplace-announces-close-of-pre-series-a-led-by-accion-venture-lab-sosv/)
31.  Panduan Interview User Online MyRobin | PDF - Scribd, accessed January 2, 2026, [https://id.scribd.com/document/891531585/Panduan-Interview-User-Online-MyRobin](https://id.scribd.com/document/891531585/Panduan-Interview-User-Online-MyRobin)
32.  Materi Briefing Myrobin-Kredivo | PDF - Scribd, accessed January 2, 2026, [https://id.scribd.com/document/887728363/MATERI-BRIEFING-MYROBIN-KREDIVO](https://id.scribd.com/document/887728363/MATERI-BRIEFING-MYROBIN-KREDIVO)
33.  Selecting Pros for your shift - Instawork Help Center, accessed January 2, 2026, [https://help.instawork.com/en/articles/2062210-selecting-pros-for-your-shift](https://help.instawork.com/en/articles/2062210-selecting-pros-for-your-shift)
34.  Top Pro Program - Instawork Help Center, accessed January 2, 2026, [https://help.instawork.com/en/articles/6964320-top-pro-program](https://help.instawork.com/en/articles/6964320-top-pro-program)
35.  Driver Rewards with Uber Pro, accessed January 2, 2026, [https://www.uber.com/au/en/drive/uber-pro/](https://www.uber.com/au/en/drive/uber-pro/)
36.  Benefits and Requirements of Platinum Top Pro Status on Instawork, accessed January 2, 2026, [https://help.instawork.com/en/articles/13055034-what-are-the-benefits-and-requirements-of-achieving-platinum-top-pro-status-on-instawork](https://help.instawork.com/en/articles/13055034-what-are-the-benefits-and-requirements-of-achieving-platinum-top-pro-status-on-instawork)
37.  Guide to Instawork Achievements, accessed January 2, 2026, [https://help.instawork.com/en/articles/2566584-guide-to-instawork-achievements](https://help.instawork.com/en/articles/2566584-guide-to-instawork-achievements)
38.  Top Outsourcing & Workforce Solutions in Indonesia - Staffinc.co, accessed January 2, 2026, [https://staffinc.co/en](https://staffinc.co/en)
39.  Shift Work Marketplace - HyperTrack, accessed January 2, 2026, [https://hypertrack.com/shift-work-marketplace](https://hypertrack.com/shift-work-marketplace)
40.  Standart Penampilan Waiter dan Waiteress - Restofocus, accessed January 2, 2026, [https://www.restofocus.com/2014/04/standart-penampilan-waiter-dan-waiteress.html](https://www.restofocus.com/2014/04/standart-penampilan-waiter-dan-waiteress.html)
41.  Standar Seragam & Grooming PSY | PDF | Bisnis - Scribd, accessed January 2, 2026, [https://id.scribd.com/document/431643225/SOP-002-Standarisasi-Grooming-Waiter-Kasir-Produksil](https://id.scribd.com/document/431643225/SOP-002-Standarisasi-Grooming-Waiter-Kasir-Produksil)
42.  Staffinc | Golden Gate Ventures | Venture Capital in Southeast Asia, accessed January 2, 2026, [https://www.goldengate.vc/portfolio/staffinc](https://www.goldengate.vc/portfolio/staffinc)
43.  MyRobin - Seedstars, accessed January 2, 2026, [https://www.seedstars.com/community/entrepreneurs/programs/seedstars-international-growth-program-8/myrobin/](https://www.seedstars.com/community/entrepreneurs/programs/seedstars-international-growth-program-8/myrobin/)
44.  Workmate secures $5.2M Series A funding to organize Southeast ..., accessed January 2, 2026, [https://www.beaconvc.fund/in-the-news/workmate-secures-5-2m-series-a-funding-to-organize-southeast-asias-informal-labor-economy](https://www.beaconvc.fund/in-the-news/workmate-secures-5-2m-series-a-funding-to-organize-southeast-asias-informal-labor-economy)
45.  Info Lowongan Kerja Loker Terdekat & Terbaru 2024 Lumina - Scribd, accessed January 2, 2026, [https://id.scribd.com/document/900757309/Info-Lowongan-Kerja-Loker-Terdekat-Terbaru-2024-Lumina](https://id.scribd.com/document/900757309/Info-Lowongan-Kerja-Loker-Terdekat-Terbaru-2024-Lumina)
46.  Cara Mudah Mencari Pekerjaan di Aplikasi Kitalulus - Lemon8-app, accessed January 2, 2026, [https://www.lemon8-app.com/@haniachintya08/7360921479023821328?region=id](https://www.lemon8-app.com/@haniachintya08/7360921479023821328?region=id)
47.  Hak Pekerja Harian Lepas (Freelancer) pasca Berlakunya UU Cipta ..., accessed January 2, 2026, [https://bplawyers.co.id/2023/11/17/hak-pekerja-harian-lepas-freelancer-pasca-berlakunya-uu-cipta-kerja/](https://bplawyers.co.id/2023/11/17/hak-pekerja-harian-lepas-freelancer-pasca-berlakunya-uu-cipta-kerja/)
48.  Mengenal Pegawai Harian Lepas: Definisi, Ciri-Ciri, dan Regulasi, accessed January 2, 2026, [https://www.talenta.co/blog/pegawai-harian-lepas/](https://www.talenta.co/blog/pegawai-harian-lepas/)
49.  BPJS Ketenagakerjaan untuk Pekerja Lepas - Glints, accessed January 2, 2026, [https://glints.com/id/lowongan/serba-serbi-bpjs-ketenagakerjaan-untuk-pekerja-lepas/](https://glints.com/id/lowongan/serba-serbi-bpjs-ketenagakerjaan-untuk-pekerja-lepas/)
50.  JHT PPPK Paruh Waktu Pemko Medan Tak Bisa Dicairkan, Nama Sekda Wiriya Ikut Disorot, accessed January 2, 2026, [https://medan.tribunnews.com/medan-terkini/1775777/jht-pppk-paruh-waktu-pemko-medan-tak-bisa-dicairkan-nama-sekda-wiriya-ikut-disorot](https://medan.tribunnews.com/medan-terkini/1775777/jht-pppk-paruh-waktu-pemko-medan-tak-bisa-dicairkan-nama-sekda-wiriya-ikut-disorot)
51.  Tingkat Keabsahan Kontrak Elektronik Berdasarkan Hukum Positif ..., accessed January 2, 2026, [https://j-innovative.org/index.php/Innovative/article/download/14023/9328/23449](https://j-innovative.org/index.php/Innovative/article/download/14023/9328/23449)
52.  Apakah Kontrak Elektronik Sah Secara Hukum? - SIP Law Firm, accessed January 2, 2026, [https://siplawfirm.id/kontrak-elektronik/?lang=id](https://siplawfirm.id/kontrak-elektronik/?lang=id)
53.  Aturan Hukum Perusahaan Telat Bayar Gaji Karyawan - Blog Gadjian, accessed January 2, 2026, [https://www.gadjian.com/blog/2022/11/08/sanksi-perusahaan-telat-bayar-gaji/](https://www.gadjian.com/blog/2022/11/08/sanksi-perusahaan-telat-bayar-gaji/)
54.  Provisions Regarding Fixed-Term Employment Agreement (PKWT ..., accessed January 2, 2026, [https://sakalawfirm.com/provisions-regarding-fixed-term-employment-agreement-pkwt-in-indonesia/](https://sakalawfirm.com/provisions-regarding-fixed-term-employment-agreement-pkwt-in-indonesia/)