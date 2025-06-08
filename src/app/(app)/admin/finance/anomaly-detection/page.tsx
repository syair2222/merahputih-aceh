
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, Loader2, AlertCircle, Construction, SearchCheck } from 'lucide-react';
import type { UserProfile } from '@/types';

const allowedRoles: Array<UserProfile['role']> = ['admin_utama', 'sekertaris', 'bendahara'];

export default function AnomalyDetectionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (user && allowedRoles.includes(user.role as UserProfile['role'])) {
        // User is authorized
      } else if (user) {
        router.push('/admin/dashboard'); // Redirect if not authorized
      } else {
        router.push('/login'); // Redirect if not logged in
      }
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat halaman...</p>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role as UserProfile['role'])) {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">Kembali ke Dasbor Admin</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SearchCheck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Deteksi Anomali Keuangan</h1>
        </div>
        <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Admin
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent flex items-center">
            <AlertCircle className="mr-3 h-7 w-7 text-orange-500" /> Fitur Dalam Tahap Pengembangan
          </CardTitle>
          <CardDescription>
            Sistem pengecekan anomali keuangan otomatis adalah fitur kompleks yang sedang dalam tahap perencanaan dan pengembangan lebih lanjut.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Sistem deteksi anomali yang sepenuhnya otomatis dan proaktif melibatkan beberapa aspek teknis yang canggih, termasuk:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5 pl-5">
            <li>Logika backend untuk pemindaian data transaksi dan saldo secara berkala di database.</li>
            <li>Definisi aturan anomali yang dapat dikonfigurasi oleh pengguna (misalnya, ambang batas untuk jumlah transaksi tidak wajar, kriteria transaksi ganda, atau parameter untuk saldo negatif yang mencurigakan).</li>
            <li>Antarmuka pengguna (UI) yang intuitif untuk menampilkan notifikasi atau laporan anomali yang terdeteksi kepada admin, serta untuk mengelola dan menindaklanjuti temuan tersebut.</li>
            <li>Query database yang dioptimalkan untuk efisiensi dalam mencari pola transaksi ganda atau mengidentifikasi saldo yang tidak wajar.</li>
          </ul>
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Construction className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-700 font-semibold">Pendekatan Pengembangan Bertahap</AlertTitle>
            <AlertDescription className="text-blue-600">
              Sebagai langkah awal yang lebih terukur, kita dapat mengembangkan sebuah <strong>flow Genkit analitik</strong>.
              Flow ini, jika diberikan sekumpulan data transaksi tertentu, dapat membantu mengidentifikasi potensi anomali berdasarkan heuristik umum (seperti jumlah yang sangat besar untuk jenis akun tertentu, potensi duplikasi, atau deskripsi transaksi yang mencurigakan).
              <br /><br />
              Fitur ini akan berfungsi sebagai alat bantu analisis on-demand, bukan sebagai pemindai otomatis database secara real-time atau terjadwal. Ini memungkinkan kita untuk mendapatkan wawasan awal dan memvalidasi kriteria anomali sebelum membangun sistem otomatis yang lebih komprehensif.
              <br /><br />
              Jika Anda tertarik, kita bisa mulai merancang dan mengimplementasikan flow Genkit analitik tersebut sebagai fondasi.
            </AlertDescription>
          </Alert>
          <div className="text-center pt-4">
            <Construction className="h-24 w-24 text-muted opacity-20 mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Antarmuka untuk konfigurasi dan hasil deteksi akan tersedia di sini di masa mendatang.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
