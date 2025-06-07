
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, Loader2, FilePlus } from 'lucide-react';
import type { UserProfile } from '@/types';
import TransactionForm from '@/components/finance/transaction-form'; // Import the new form

export default function AdminNewTransactionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const allowedRoles: Array<UserProfile['role']> = ['admin_utama', 'sekertaris', 'bendahara'];

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      router.push('/admin/dashboard');
    }
  }, [user, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat halaman...</p>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini. Hanya Admin Utama, Sekertaris, atau Bendahara yang diizinkan.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">Kembali ke Dasbor Admin</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FilePlus className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Catat Transaksi Keuangan Baru</h1>
        </div>
        <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Admin
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Formulir Entri Jurnal</CardTitle>
          <CardDescription>Masukkan detail transaksi keuangan. Pastikan total debit dan kredit seimbang.</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionForm />
        </CardContent>
      </Card>
    </div>
  );
}
