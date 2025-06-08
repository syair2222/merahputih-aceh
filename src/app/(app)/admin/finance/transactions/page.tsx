
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldAlert, Loader2, ListChecks, FilePlus, Eye, CheckCircle, CircleAlert, FileText as FileTextIcon } from 'lucide-react'; // Renamed FileText to FileTextIcon
import type { UserProfile, Transaction } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

// Helper function to format status
const formatTransactionStatus = (status?: Transaction['status']) => {
  if (!status) return { text: 'Tidak Diketahui', variant: 'outline' as const, Icon: CircleAlert };
  switch (status) {
    case 'DRAFT': return { text: 'Draft', variant: 'secondary' as const, Icon: FileTextIcon };
    case 'POSTED': return { text: 'Posted', variant: 'default' as const, Icon: CheckCircle };
    case 'VOID': return { text: 'Void', variant: 'destructive' as const, Icon: CircleAlert };
    default: return { text: status, variant: 'outline' as const, Icon: CircleAlert };
  }
};

// Define allowedRoles outside the component to prevent re-creation on renders
const allowedRoles: Array<UserProfile['role']> = ['admin_utama', 'sekertaris', 'bendahara'];

export default function AdminTransactionsListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'transactions'), orderBy('transactionDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const transactionsData = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Transaction, 'id'>),
        transactionDate: (docSnap.data().transactionDate as Timestamp)?.toDate ? (docSnap.data().transactionDate as Timestamp).toDate() : new Date(docSnap.data().transactionDate),
        createdAt: (docSnap.data().createdAt as Timestamp)?.toDate ? (docSnap.data().createdAt as Timestamp).toDate() : new Date(docSnap.data().createdAt),
      })) as Transaction[];
      setTransactions(transactionsData);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError('Gagal memuat data transaksi.');
      toast({ title: "Error", description: "Gagal memuat data transaksi.", variant: "destructive" });
    } finally {
      setPageLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading) {
      if (user && allowedRoles.includes(user.role as UserProfile['role'])) {
        fetchTransactions();
      } else if (user) {
        router.push('/admin/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, authLoading, router, fetchTransactions, allowedRoles]);

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat data transaksi...</p>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role as UserProfile['role'])) {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini. Hanya Admin Keuangan yang diizinkan.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">Kembali ke Dasbor Admin</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ListChecks className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Daftar Transaksi Keuangan (Jurnal Umum)</h1>
        </div>
        <div className="space-x-2">
          <Button onClick={() => router.push('/admin/finance/transactions/new')}>
            <FilePlus className="mr-2 h-4 w-4" /> Catat Transaksi Baru
          </Button>
          <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Riwayat Transaksi</CardTitle>
          <CardDescription>Berikut adalah semua transaksi keuangan yang telah dicatat.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!error && transactions.length === 0 && (
            <Alert>
              <ListChecks className="h-4 w-4" />
              <AlertTitle>Belum Ada Transaksi</AlertTitle>
              <AlertDescription>Belum ada transaksi keuangan yang dicatat. Mulai dengan mencatat transaksi baru.</AlertDescription>
            </Alert>
          )}
          {!error && transactions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="hidden md:table-cell">No. Ref</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Total Debit</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Total Kredit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const statusInfo = formatTransactionStatus(tx.status);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {tx.transactionDate instanceof Date ? format(tx.transactionDate, "dd MMM yyyy", { locale: localeID }) : 'N/A'}
                      </TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell className="hidden md:table-cell">{tx.referenceNumber || '-'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right font-mono">
                        {(tx.totalDebit ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                       <TableCell className="hidden sm:table-cell text-right font-mono">
                        {(tx.totalCredit ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className={statusInfo.variant === 'default' ? 'bg-green-500 text-white' : ''}>
                          <statusInfo.Icon className="mr-1.5 h-3 w-3" />
                          {statusInfo.text}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          asChild
                        >
                          <Link href={`/admin/finance/transactions/${tx.id}`}>
                            <Eye className="mr-1 h-3 w-3" /> Detail
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

