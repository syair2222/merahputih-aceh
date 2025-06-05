
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, Loader2, LineChart } from 'lucide-react';

export default function MemberFacilityReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== 'member') {
      router.push('/');
    }
    if (!loading && user && user.role === 'member' && user.status !== 'approved') {
      // router.push('/member/dashboard?statusError=not_approved_for_facility_reports');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat halaman...</p>
      </div>
    );
  }

  if (!user || user.role !== 'member') {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda harus menjadi anggota untuk mengakses halaman ini.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-4">Kembali ke Beranda</Button>
      </div>
    );
  }

  if (user.status !== 'approved') {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Fitur Terbatas</AlertTitle>
          <AlertDescription>Status keanggotaan Anda belum disetujui. Anda belum dapat membuat laporan usaha.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Anggota
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <LineChart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Laporan Perkembangan Usaha</h1>
        </div>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Anggota
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Segera Hadir</CardTitle>
          <CardDescription>Fitur untuk melaporkan perkembangan usaha yang difasilitasi koperasi sedang dalam tahap pengembangan.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Di sini Anda akan dapat mengirimkan laporan kemajuan usaha, kendala, dan pencapaian terkait fasilitas yang Anda terima. Terima kasih atas kesabaran Anda.</p>
          <div className="mt-6 flex justify-center">
            <LineChart className="h-32 w-32 text-muted opacity-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
