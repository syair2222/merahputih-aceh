
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, LogIn, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const cooperativeInfo = {
    name: "Koperasi Merah Putih Sejahtera",
    location: "Gampong Uteunkot, Kecamatan Muara Dua, Kota Lhokseumawe, Provinsi Aceh, Indonesia",
    established: 2025,
    introduction: "Koperasi Merah Putih Sejahtera merupakan inisiatif masyarakat desa yang sejalan dengan pencanangan program Koperasi Merah Putih oleh Presiden Republik Indonesia, Bapak Prabowo Subianto. Program ini bertujuan memberdayakan ekonomi rakyat melalui sistem koperasi yang adil, terbuka, dan berbasis gotong royong.",
    purpose: [
      "Mewadahi partisipasi aktif masyarakat desa dalam membangun ekonomi lokal.",
      "Meningkatkan kesejahteraan anggota melalui kegiatan ekonomi kolektif.",
      "Membentuk ekosistem usaha yang mandiri, berkeadilan, dan berkelanjutan.",
      "Memberi akses mudah bagi warga desa untuk bergabung, tanpa diskriminasi.",
    ],
    objectives: [
      "Menjadi sarana simpan pinjam yang sehat dan terpercaya.",
      "Menyalurkan hasil pertanian, peternakan, atau usaha kecil anggota dengan harga adil.",
      "Menyediakan kebutuhan pokok dan layanan jasa dengan harga bersaing.",
      "Menumbuhkan semangat kewirausahaan dan kolaborasi di masyarakat.",
      "Menjadi alat distribusi dan pemasaran produk-produk lokal desa.",
      "Menampung aspirasi dan kebutuhan ekonomi warga yang belum terakomodasi oleh koperasi sebelumnya.",
    ],
    values: [
      { name: "Keterbukaan", description: "Semua warga desa memiliki hak untuk bergabung." },
      { name: "Kesukarelaan", description: "Keanggotaan bersifat sukarela dan terbuka." },
      { name: "Demokrasi", description: "Setiap anggota memiliki hak suara yang sama." },
      { name: "Partisipatif", description: "Koperasi tumbuh bersama partisipasi aktif anggotanya." },
      { name: "Kemandirian", description: "Koperasi dikelola secara mandiri oleh dan untuk anggotanya." },
    ],
    businessFields: [
      "Usaha Sembako dan Kebutuhan Harian",
      "Penjualan hasil pertanian dan peternakan",
      "Unit Simpan Pinjam",
      "Jasa transportasi dan logistik",
      "UMKM dan kerajinan",
      "Jasa digital, pelatihan, dan teknologi desa",
    ],
    membershipCriteria: [
      "Warga desa yang telah berusia minimal 17 tahun atau sudah menikah.",
      "Bersedia menyetorkan simpanan pokok dan simpanan wajib.",
      "Mengisi formulir secara jujur dan lengkap.",
      "Berkomitmen aktif mendukung kegiatan koperasi.",
    ],
    closingStatement: "Dengan adanya aplikasi ini, kami membuka pendaftaran terbuka bagi seluruh warga desa yang ingin menjadi bagian dari gerakan ekonomi rakyat berbasis koperasi. Koperasi ini bukan milik perseorangan, melainkan milik bersama seluruh anggotanya. Mari kita majukan desa kita dengan semangat gotong royong melalui Koperasi Merah Putih Sejahtera.",
    motto: "“Bersama Kita Kuat, Bersama Koperasi Kita Sejahtera.”"
  };

  const announcements = [
    { id: 1, title: "Rapat Anggota Tahunan 2025", date: "2024-12-01", content: "Akan diadakan Rapat Anggota Tahunan pada tanggal 15 Januari 2025. Kehadiran seluruh anggota diharapkan.", source: "Admin Utama" },
    { id: 2, title: "Program Pelatihan UMKM Baru", date: "2024-11-20", content: "Koperasi akan meluncurkan program pelatihan untuk UMKM di bidang digital marketing. Pendaftaran dibuka hingga 10 Desember 2024.", source: "Dinas Koperasi" },
  ];

  return (
    <div className="space-y-12">
      <section className="text-center py-12 bg-gradient-to-r from-primary to-accent rounded-lg shadow-xl">
        <div className="container mx-auto px-4">
        <Image src="https://placehold.co/150x150.png" alt="Logo Koperasi" width={150} height={150} className="mx-auto mb-6 rounded-full shadow-lg" data-ai-hint="cooperative logo" />
          <h1 className="text-5xl font-headline font-bold text-primary-foreground mb-4">{cooperativeInfo.name}</h1>
          <p className="text-xl text-primary-foreground mb-2">{cooperativeInfo.location}</p>
          <p className="text-lg text-primary-foreground mb-8">Tahun Pendirian: {cooperativeInfo.established}</p>
          <div className="space-x-4">
            <Button size="lg" asChild className="bg-primary-foreground text-primary hover:bg-gray-200 shadow-md">
              <Link href="/register"><UserPlus className="mr-2" /> Daftar Anggota</Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="text-primary-foreground border-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-md">
              <Link href="/login"><LogIn className="mr-2" /> Masuk</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="info-koperasi" className="container mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-primary">Selamat Datang di {cooperativeInfo.name}</CardTitle>
            <CardDescription className="text-lg">{cooperativeInfo.introduction}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-foreground/90">
            <div>
              <h2 className="text-2xl font-headline font-semibold mb-3 text-accent">Maksud Pendirian</h2>
              <ul className="list-disc list-inside space-y-1 pl-4">
                {cooperativeInfo.purpose.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-headline font-semibold mb-3 text-accent">Tujuan Pendirian</h2>
              <ul className="list-disc list-inside space-y-1 pl-4">
                {cooperativeInfo.objectives.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-headline font-semibold mb-3 text-accent">Nilai dan Prinsip</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {cooperativeInfo.values.map((value, index) => (
                  <Card key={index} className="bg-secondary/30">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center"><CheckCircle className="text-primary mr-2" />{value.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{value.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-headline font-semibold mb-3 text-accent">Bidang Usaha Koperasi</h2>
              <ul className="list-disc list-inside space-y-1 pl-4">
                {cooperativeInfo.businessFields.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-headline font-semibold mb-3 text-accent">Siapa yang Bisa Menjadi Anggota?</h2>
              <ul className="list-disc list-inside space-y-1 pl-4">
                {cooperativeInfo.membershipCriteria.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-lg italic">{cooperativeInfo.closingStatement}</p>
              <p className="text-2xl font-headline font-semibold text-center mt-6 text-primary">{cooperativeInfo.motto}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="announcements" className="container mx-auto px-4">
        <h2 className="text-3xl font-headline font-semibold mb-6 text-center text-primary">Pengumuman Terbaru</h2>
        {announcements.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl font-headline text-accent">{announcement.title}</CardTitle>
                  <CardDescription>
                    {new Date(announcement.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })} - Oleh: {announcement.source}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/80">{announcement.content}</p>
                  {/* Placeholder for user interaction */}
                  <div className="mt-4 text-right">
                    <Button variant="link" className="text-primary hover:text-accent">Baca Selengkapnya & Komentar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Belum ada pengumuman.</p>
        )}
      </section>
      
      <section className="container mx-auto px-4 py-8 text-center">
         <h2 className="text-2xl font-headline font-semibold mb-4 text-primary">Lampiran Survei</h2>
         <p className="mb-4 text-foreground/90">Untuk membantu kami lebih baik, silakan unduh dan isi lampiran survei berikut jika Anda berminat membentuk koperasi baru atau mencalonkan diri ke koperasi yang telah terbentuk.</p>
         <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <a href="/survei_koperasi.pdf" download target="_blank" rel="noopener noreferrer">Unduh Formulir Survei (PDF)</a>
         </Button>
         <p className="mt-2 text-sm text-muted-foreground"> (Contoh link, file PDF perlu disediakan)</p>
      </section>

    </div>
  );
}
