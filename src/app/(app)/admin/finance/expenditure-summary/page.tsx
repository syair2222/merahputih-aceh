
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, Loader2, BarChartHorizontalBig, Construction } from 'lucide-react';
import type { UserProfile } from '@/types';

const allowedRoles: Array<UserProfile['role']> = ['admin_utama', 'sekertaris', 'bendahara', 'dinas'];

export default function ExpenditureSummaryPage() {
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
          <BarChartHorizontalBig className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Dasbor Ringkasan Pengeluaran</h1>
        </div>
        <Button onClick={() => router.push('/admin/reports')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Laporan Keuangan
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent flex items-center">
            <Construction className="mr-3 h-6 w-6 text-yellow-500" />
            Fitur Dalam Pengembangan
          </CardTitle>
          <CardDescription>
            Dasbor ini akan menampilkan ringkasan dan analisis pengeluaran operasional koperasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Segera hadir, tampilan interaktif untuk memantau:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5 pl-5">
            <li>Total pengeluaran berdasarkan periode (bulanan, tahunan, kustom).</li>
            <li>Rincian pengeluaran per kategori akun beban.</li>
            <li>Visualisasi data pengeluaran (misalnya, diagram pai atau batang).</li>
            <li>Perbandingan pengeluaran antar periode.</li>
          </ul>
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Info className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-700 font-semibold">Tahap Selanjutnya</AlertTitle>
            <AlertDescription className="text-blue-600">
              Pengembangan akan meliputi penarikan data transaksi pengeluaran dari Firestore, agregasi data, dan pembuatan komponen visualisasi.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
