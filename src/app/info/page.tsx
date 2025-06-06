
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Image from "next/image";
import { cooperativeInfo } from "@/lib/site-data";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CooperativeInfoPage() {
  // cooperativeInfo is now imported from @/lib/site-data

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
            <p className="mt-4 text-center">
              <Button asChild variant="link" disabled>
                <Link href="/dokumen/AD_ART_Koperasi_Merah_Putih_Sejahtera.pdf" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Unduh Dokumen AD/ART Lengkap (PDF)
                </Link>
              </Button>
              <span className="text-xs block text-muted-foreground">(Contoh link, file PDF perlu disediakan jika ingin diaktifkan)</span>
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

