
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, Loader2, UserCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // AppLayout already handles redirect if !user
  // useEffect(() => {
  //   if (!loading && !user) {
  //     router.push('/login'); 
  //   }
  // }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat profil...</p>
      </div>
    );
  }

  if (!user) {
     // Fallback, though AppLayout should catch this
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda harus login untuk melihat halaman ini.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/login')} className="mt-4">Login</Button>
      </div>
    );
  }
  
  const backToDashboardPath = () => {
    if (user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas') {
      return '/admin/dashboard';
    } else if (user.role === 'member') {
      return '/member/dashboard';
    }
    return '/'; // Fallback for prospective_member or unknown
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <UserCircle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Profil Saya</h1>
        </div>
        <Button onClick={() => router.push(backToDashboardPath())} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Informasi Profil</CardTitle>
          <CardDescription>Detail akun dan informasi pribadi Anda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Nama Lengkap</h3>
            <p className="text-md">{user.displayName || 'Belum diatur'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
            <p className="text-md">{user.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Peran</h3>
            <p className="text-md">{user.role ? user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Tidak diketahui'}</p>
          </div>
          <p className="text-muted-foreground mt-4">Fitur untuk mengubah detail profil akan segera hadir.</p>
          <div className="mt-6 flex justify-center">
            <UserCircle className="h-32 w-32 text-muted opacity-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
