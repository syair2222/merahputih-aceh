
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldAlert, Loader2, BookText, PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { UserProfile, ChartOfAccountItem } from '@/types'; // Import ChartOfAccountItem
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// Helper function to format account types for display (optional, can be expanded)
const formatAccountType = (type: ChartOfAccountItem['accountType']) => {
  switch (type) {
    case 'ASET': return 'Aset';
    case 'LIABILITAS': return 'Liabilitas';
    case 'EKUITAS': return 'Ekuitas';
    case 'PENDAPATAN': return 'Pendapatan';
    case 'BEBAN': return 'Beban';
    default: return type;
  }
};

export default function AdminCoAPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<ChartOfAccountItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowedRoles: Array<UserProfile['role']> = ['admin_utama', 'sekertaris', 'bendahara'];

  const fetchAccounts = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'chartOfAccounts'), orderBy('accountId', 'asc'));
      const querySnapshot = await getDocs(q);
      const accountsData = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ChartOfAccountItem, 'id'>),
      })) as ChartOfAccountItem[];
      setAccounts(accountsData);
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError('Gagal memuat data bagan akun.');
      toast({ title: "Error", description: "Gagal memuat data bagan akun.", variant: "destructive" });
    } finally {
      setPageLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading) {
      if (user && allowedRoles.includes(user.role)) {
        fetchAccounts();
      } else if (user) {
        router.push('/admin/dashboard');
      } else {
        // This case should be handled by AppLayout or middleware if user is not logged in
        router.push('/login');
      }
    }
  }, [user, authLoading, router, fetchAccounts, allowedRoles]);


  if (authLoading || (pageLoading && !accounts.length && !error)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat data bagan akun...</p>
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
          <BookText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Manajemen Bagan Akun (CoA)</h1>
        </div>
        <div className="space-x-2">
          <Button onClick={() => toast({ title: "Segera Hadir", description: "Fitur tambah akun baru akan segera tersedia." })}>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Akun Baru
          </Button>
          <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Admin
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Daftar Akun</CardTitle>
          <CardDescription>Kelola semua akun yang digunakan dalam pencatatan keuangan koperasi.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {pageLoading && !error && (
             <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Memuat akun...</p>
            </div>
          )}
          {!pageLoading && !error && accounts.length === 0 && (
            <Alert>
              <BookText className="h-4 w-4" />
              <AlertTitle>Belum Ada Akun</AlertTitle>
              <AlertDescription>Belum ada akun yang terdaftar. Anda bisa mulai dengan menambahkan akun baru.</AlertDescription>
            </Alert>
          )}
          {!pageLoading && !error && accounts.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Akun</TableHead>
                  <TableHead>Nama Akun</TableHead>
                  <TableHead className="hidden md:table-cell">Tipe Akun</TableHead>
                  <TableHead className="hidden sm:table-cell">Saldo Normal</TableHead>
                  {/* <TableHead className="text-right hidden lg:table-cell">Saldo</TableHead> */}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id || account.accountId}>
                    <TableCell className="font-mono">{account.accountId}</TableCell>
                    <TableCell className="font-medium">{account.accountName}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatAccountType(account.accountType)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{account.normalBalance}</TableCell>
                    {/* <TableCell className="text-right hidden lg:table-cell">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(account.balance || 0)}
                    </TableCell> */}
                    <TableCell>
                      <Badge variant={account.isActive ? 'default' : 'secondary'} className={account.isActive ? 'bg-green-500 text-white' : ''}>
                        {account.isActive ? 'Aktif' : 'Tidak Aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toast({ title: "Segera Hadir", description: "Fitur edit akun akan segera tersedia."})}
                      >
                        <Edit className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => toast({ title: "Segera Hadir", description: "Fitur hapus akun akan segera tersedia."})}
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    