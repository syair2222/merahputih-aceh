
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, Loader2, Briefcase } from 'lucide-react';

export default function AgencyAdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== 'related_agency_admin') {
      router.push('/'); // Redirect if not an agency admin
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat dasbor admin dinas...</p>
      </div>
    );
  }

  if (!user || user.role !== 'related_agency_admin') {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-4">Kembali ke Beranda</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Briefcase className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Dasbor Admin Dinas Terkait</h1>
        </div>
        {/* <Button onClick={() => router.push('/')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Beranda
        </Button> */}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Selamat Datang, {user.displayName || user.email}</CardTitle>
          <CardDescription>Ini adalah dasbor khusus untuk admin dinas atau instansi terkait.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Fitur untuk melihat data anggota yang relevan dengan program dinas dan statistik koperasi akan segera tersedia di sini.</p>
          <div className="mt-6 flex justify-center">
            <Briefcase className="h-32 w-32 text-muted opacity-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
