
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Image from "next/image";

export default function CooperativeInfoPage() {
  const cooperativeInfo = {
    name: "Koperasi Merah Putih Sejahtera",
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
    // Placeholder for AD/ART content
    adArtContent: `
      BAB I: NAMA, TEMPAT KEDUDUKAN, DAN JANGKA WAKTU
      Pasal 1: Nama dan Tempat Kedudukan
      (1) Koperasi ini bernama Koperasi Merah Putih Sejahtera, berkedudukan di Gampong Uteunkot, Kecamatan Muara Dua, Kota Lhokseumawe, Provinsi Aceh, Indonesia.
      ... (Isi AD/ART lengkap akan ditampilkan di sini) ...

      BAB II: LANDASAN, ASAS, DAN PRINSIP
      Pasal 2: Landasan dan Asas
      (1) Koperasi berlandaskan Pancasila dan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945.
      (2) Koperasi berdasarkan atas asas kekeluargaan.
      ...

      BAB III: TUJUAN DAN KEGIATAN USAHA
      Pasal 4: Tujuan
      (1) Meningkatkan kesejahteraan Anggota pada khususnya dan masyarakat pada umumnya.
      ...
    `,
  };

  return (
    <div className="space-y-8">
      <header className="text-center py-8 bg-secondary rounded-lg shadow-md">
        <Image src="https://placehold.co/120x120.png" alt="Logo Koperasi Detail" width={120} height={120} className="mx-auto mb-4 rounded-full" data-ai-hint="cooperative logo" />
        <h1 className="text-4xl font-headline font-bold text-primary">{cooperativeInfo.name}</h1>
        <p className="text-lg text-muted-foreground">Informasi Detail Koperasi</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-accent">Pendahuluan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/90">{cooperativeInfo.introduction}</p>
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-accent">Anggaran Dasar / Anggaran Rumah Tangga (AD/ART)</CardTitle>
          <CardDescription>Dokumen resmi yang mengatur operasional koperasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert p-4 border rounded-md bg-muted/20 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap break-words">
              {cooperativeInfo.adArtContent}
            </pre>
            <p className="mt-4 text-center">
              <a href="/dokumen/AD_ART_Koperasi_Merah_Putih_Sejahtera.pdf" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Unduh Dokumen AD/ART Lengkap (PDF)
              </a>
              <span className="text-xs block text-muted-foreground">(Contoh link, file PDF perlu disediakan)</span>
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
