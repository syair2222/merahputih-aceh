
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Info as InfoIcon, Printer } from "lucide-react"; // Added Printer
import Image from "next/image";
import { cooperativeInfo } from "@/lib/site-data";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CooperativeInfoPage() {
  // cooperativeInfo is now imported from @/lib/site-data

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      <header className="text-center py-8 bg-secondary rounded-lg shadow-md">
        <Image src="/images/logo_koperasi_utama.png" alt="Logo Koperasi Detail" width={120} height={120} className="mx-auto mb-4 rounded-full" data-ai-hint="cooperative logo" />
        <h1 className="text-4xl font-headline font-bold text-primary">{cooperativeInfo.name}</h1>
        <p className="text-lg text-muted-foreground">Informasi Detail Koperasi</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-accent">Pendahuluan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/90 whitespace-pre-wrap">{cooperativeInfo.introduction}</p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-accent">Maksud dan Tujuan Pendirian</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-foreground/90">
          <div>
            <h3 className="text-xl font-semibold mb-2">Maksud Pendirian</h3>
            <ul className="list-disc list-inside space-y-1 pl-4">
              {cooperativeInfo.purpose.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Tujuan Pendirian</h3>
            <ul className="list-disc list-inside space-y-1 pl-4">
              {cooperativeInfo.objectives.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-accent">Nilai dan Prinsip</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          {cooperativeInfo.values.map((value, index) => (
            <div key={index} className="p-4 border rounded-md bg-background shadow">
              <h3 className="text-xl font-semibold flex items-center mb-1"><CheckCircle className="text-primary mr-2 h-5 w-5" />{value.name}</h3>
              <p className="text-sm text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-lg" id="app-description">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-accent flex items-center">
            <InfoIcon className="mr-3 h-7 w-7" /> Deskripsi Aplikasi Koperasi Digital
          </CardTitle>
          <CardDescription>Inovasi Digital untuk Kesejahteraan Bersama.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-foreground/90">
          <p>
            Aplikasi Koperasi Merah Putih Sejahtera adalah platform digital terintegrasi yang dirancang untuk merevolusi cara koperasi beroperasi dan melayani anggotanya. Dengan memanfaatkan teknologi modern, aplikasi ini bertujuan untuk meningkatkan transparansi, efisiensi, aksesibilitas, dan partisipasi aktif seluruh pemangku kepentingan, mulai dari anggota, calon anggota, pengurus koperasi, hingga mitra strategis seperti perbankan dan instansi pemerintah terkait.
          </p>

          <section>
            <h3 className="text-xl font-semibold mb-2 text-primary/90">Alur Kerja Umum dan Fungsi Aplikasi:</h3>
            <p className="mb-2">Aplikasi ini berfungsi sebagai pusat informasi dan layanan digital Koperasi Merah Putih Sejahtera. Alur kerja utamanya meliputi:</p>
            <ol className="list-decimal list-inside space-y-2 pl-4">
              <li><strong>Pendaftaran Anggota (Digital & Transparan):</strong> Calon anggota dapat mendaftar secara online melalui formulir digital yang komprehensif, mengunggah dokumen persyaratan, dan memantau status pendaftaran mereka.</li>
              <li><strong>Manajemen Keanggotaan (Efisien & Terpusat):</strong> Pengurus koperasi dapat memverifikasi pendaftaran, mengelola data anggota, memberikan rating, dan mencatat riwayat aktivitas anggota secara terpusat.</li>
              <li><strong>Pengajuan Fasilitas (Mudah & Terarah):</strong> Anggota dapat mengajukan berbagai produk dan layanan koperasi (pinjaman, pembelian, pelatihan, dll.) secara online. Aplikasi memungkinkan anggota untuk mengarahkan pengajuan mereka ke entitas spesifik (internal koperasi, bank mitra, atau dinas terkait), meningkatkan relevansi dan kecepatan proses.</li>
              <li>
                <strong>Proses Verifikasi & Persetujuan (Kolaboratif):</strong>
                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                  <li><strong>Admin Koperasi:</strong> Melakukan review awal, verifikasi, dan dapat memberikan persetujuan atau meminta perbaikan data.</li>
                  <li><strong>Rekomendasi Anggota:</strong> Anggota dapat meminta dan memberikan rekomendasi untuk pengajuan fasilitas, membangun sistem kepercayaan komunitas.</li>
                  <li><strong>Admin Eksternal (Bank/Dinas):</strong> Jika pengajuan ditujukan kepada mereka, admin bank atau dinas terkait dapat melihat detail pengajuan yang relevan, dokumen pendukung, dan membuat keputusan langsung di platform.</li>
                </ul>
              </li>
              <li>
                <strong>Laporan & Informasi (Aksesibel):</strong>
                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                  <li>Anggota dapat melihat riwayat pengajuan, laporan usaha, dan pengumuman koperasi.</li>
                  <li>Admin (internal dan eksternal) dapat mengakses laporan, statistik, dan data anggota/pengajuan yang relevan dengan peran mereka.</li>
                </ul>
              </li>
              <li><strong>Komunikasi & Notifikasi (Terintegrasi):</strong> Aplikasi menyediakan sarana untuk pengumuman dari koperasi, dan di masa depan, notifikasi penting terkait status pengajuan atau pesan langsung.</li>
              <li><strong>Asisten AI (Informatif):</strong> Pengguna dapat bertanya kepada asisten AI mengenai informasi umum koperasi.</li>
            </ol>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2 text-primary/90">Manfaat Aplikasi bagi Setiap Pemangku Kepentingan:</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-lg font-medium mb-1">Manfaat untuk Anggota Koperasi:</h4>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li><strong>Akses Mudah & Cepat:</strong> Mengajukan fasilitas, melihat informasi, dan berinteraksi dengan koperasi kapan saja dan di mana saja.</li>
                  <li><strong>Transparansi Proses:</strong> Dapat memantau status pengajuan fasilitas dan rekomendasi secara real-time.</li>
                  <li><strong>Peningkatan Partisipasi:</strong> Dapat memberikan rekomendasi untuk sesama anggota, meningkatkan rasa memiliki dan gotong royong.</li>
                  <li><strong>Informasi Terkini:</strong> Menerima pengumuman dan informasi penting dari koperasi secara langsung.</li>
                  <li><strong>Pengembangan Usaha:</strong> Mendapatkan akses ke berbagai fasilitas yang mendukung pengembangan usaha dan kebutuhan anggota.</li>
                  <li><strong>Pencetakan Dokumen:</strong> Kemampuan mencetak detail pengajuan dan laporan untuk arsip pribadi.</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-medium mb-1">Manfaat untuk Calon Anggota & Pengguna Umum:</h4>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li><strong>Pendaftaran Mudah:</strong> Proses pendaftaran yang sepenuhnya digital dan dipandu.</li>
                  <li><strong>Informasi Lengkap:</strong> Akses mudah ke informasi detail koperasi, AD/ART, maksud, tujuan, dan nilai-nilai.</li>
                  <li><strong>Asisten AI:</strong> Mendapatkan jawaban cepat atas pertanyaan umum seputar koperasi.</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-medium mb-1">Manfaat untuk Pengurus & Admin Koperasi Internal:</h4>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li><strong>Efisiensi Operasional:</strong> Manajemen data anggota, pengajuan, dan pengumuman yang lebih terstruktur dan efisien.</li>
                  <li><strong>Pengambilan Keputusan Lebih Baik:</strong> Akses ke data terpusat dan laporan untuk analisis dan pengambilan keputusan strategis.</li>
                  <li><strong>Pengawasan Terintegrasi:</strong> Dapat melihat semua aktivitas pengajuan, termasuk yang ditujukan ke pihak eksternal.</li>
                  <li><strong>Jangkauan Luas:</strong> Memudahkan komunikasi dan penyebaran informasi kepada seluruh anggota.</li>
                  <li><strong>Pencetakan Dokumen:</strong> Kemampuan mencetak profil anggota dan detail pengajuan untuk keperluan administrasi dan rapat.</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-medium mb-1">Manfaat untuk Bank Mitra:</h4>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li><strong>Akses Selektif ke Prospek:</strong> Menerima informasi pengajuan fasilitas dari anggota koperasi yang secara spesifik memilih bank sebagai tujuan pengajuan.</li>
                  <li><strong>Efisiensi Proses Awal:</strong> Mengurangi waktu dan sumber daya untuk skrining awal karena data dan dokumen pendukung sudah tersedia secara digital.</li>
                  <li><strong>Informasi Pendukung:</strong> Dapat melihat detail pengajuan dan profil pemohon untuk analisis kelayakan yang lebih baik.</li>
                  <li><strong>Potensi Kerjasama Strategis:</strong> Membuka peluang kerjasama yang lebih erat dengan koperasi.</li>
                  <li><strong>Pencetakan Dokumen:</strong> Admin bank dapat mencetak detail pengajuan yang relevan.</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-medium mb-1">Manfaat untuk Dinas & Instansi Pemerintah Terkait:</h4>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li><strong>Monitoring & Pembinaan:</strong> Mendapatkan gambaran umum perkembangan koperasi dan aktivitas ekonomi anggotanya.</li>
                  <li><strong>Penyaluran Program Tepat Sasaran:</strong> Aplikasi dapat menjadi saluran untuk mengidentifikasi anggota yang relevan untuk program pemerintah.</li>
                  <li><strong>Akses Data Terstruktur:</strong> Memudahkan perolehan data untuk laporan dan analisis kebijakan.</li>
                  <li><strong>Transparansi & Akuntabilitas:</strong> Mendukung transparansi dalam penyaluran bantuan.</li>
                  <li><strong>Pencetakan Dokumen:</strong> Admin dinas dapat mencetak detail pengajuan yang relevan.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2 text-primary/90">Harapan Ke Depan:</h3>
            <p className="mb-2">Aplikasi Koperasi Merah Putih Sejahtera diharapkan dapat terus berkembang menjadi ekosistem digital yang lebih komprehensif. Beberapa pengembangan potensial di masa depan meliputi:</p>
            <ol className="list-decimal list-inside space-y-1 pl-4">
              <li>Integrasi E-Wallet & Pembayaran Digital.</li>
              <li>Fitur Marketplace Produk Anggota.</li>
              <li>Modul Pelaporan Keuangan Otomatis.</li>
              <li>Sistem Notifikasi Proaktif.</li>
              <li>Analitik Data Lebih Mendalam.</li>
              <li>Fitur E-Voting.</li>
              <li>Pengembangan Asisten AI yang lebih lanjut.</li>
              <li>Kolaborasi Antar Koperasi.</li>
            </ol>
            <p className="mt-3">
              Dengan komitmen berkelanjutan terhadap inovasi dan pelayanan, Aplikasi Koperasi Merah Putih Sejahtera bertekad untuk menjadi motor penggerak utama dalam mewujudkan kesejahteraan anggota dan masyarakat luas, sejalan dengan semangat gotong royong dan pemberdayaan ekonomi kerakyatan.
            </p>
          </section>
        </CardContent>
      </Card>

      <Card className="shadow-lg" id="ad-art">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-accent">Anggaran Dasar / Anggaran Rumah Tangga (AD/ART)</CardTitle>
          <CardDescription>Dokumen resmi yang mengatur operasional koperasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert p-4 border rounded-md bg-muted/20 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap break-words">
              {cooperativeInfo.adArtContent}
            </pre>
          </div>
          <div className="mt-4 text-center">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" /> Cetak Halaman Info Koperasi
            </Button>
            <p className="text-xs block text-muted-foreground mt-1">
              (Ini akan mencetak seluruh halaman Info Koperasi, termasuk AD/ART)
            </p>
          </div>
        </CardContent>
      </Card>
       <div className="text-center mt-8">
        <Button asChild variant="outline" size="lg">
          <Link href="/">Kembali ke Beranda</Link>
        </Button>
      </div>
    </div>
  );
}
