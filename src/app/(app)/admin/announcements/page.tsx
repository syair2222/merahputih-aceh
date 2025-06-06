
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, Loader2, Megaphone, Edit, List } from 'lucide-react'; // Added Edit, List

export default function AdminAnnouncementsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas')) {
      router.push('/');
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

  if (!user || !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas')) {
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

  // Placeholder for announcements data
  const announcements = [
    // { id: '1', title: 'Rapat Anggota Tahunan 2025', date: '2024-12-01', status: 'Published' },
    // { id: '2', title: 'Program Pelatihan UMKM', date: '2024-11-15', status: 'Draft' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Megaphone className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Manajemen Pengumuman</h1>
        </div>
        <div className='space-x-2'>
            <Button onClick={() => router.push('/admin/announcements/new')}>
            <Edit className="mr-2 h-4 w-4" /> Buat Pengumuman Baru
            </Button>
            <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Admin
            </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent flex items-center">
            <List className="mr-2 h-5 w-5"/>Daftar Pengumuman
            </CardTitle>
          <CardDescription>Kelola pengumuman yang akan ditampilkan kepada anggota koperasi.</CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-10">
              <Megaphone className="h-24 w-24 text-muted opacity-30 mx-auto" />
              <p className="mt-4 text-lg text-muted-foreground">Belum ada pengumuman.</p>
              <p className="text-sm text-muted-foreground">Anda dapat membuat pengumuman baru menggunakan tombol di atas.</p>
              <p className="mt-2 text-xs text-muted-foreground">Fungsionalitas penuh untuk daftar, edit, dan hapus pengumuman akan segera hadir.</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Fitur untuk menampilkan daftar pengumuman akan segera hadir.</p>
            // Placeholder for table or list of announcements
          )}
        </CardContent>
      </Card>
    </div>
  );
}
