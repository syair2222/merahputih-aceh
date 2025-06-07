
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ShieldAlert, Loader2, BarChart3, Printer, AlertCircle } from 'lucide-react';
import type { ChartOfAccountItem, UserProfile } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface TrialBalanceEntry {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceEntry[]>([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<Date>(new Date());

  const allowedRoles: Array<UserProfile['role']> = ['admin_utama', 'sekertaris', 'bendahara', 'dinas', 'bank_partner_admin'];


  const fetchAndProcessTrialBalance = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      const accountsQuery = query(collection(db, 'chartOfAccounts'), orderBy('accountId', 'asc'));
      const querySnapshot = await getDocs(accountsQuery);
      
      const processedData: TrialBalanceEntry[] = [];
      let currentTotalDebit = 0;
      let currentTotalCredit = 0;

      querySnapshot.forEach(docSnap => {
        const account = { id: docSnap.id, ...docSnap.data() } as ChartOfAccountItem;
        let debitAmount = 0;
        let creditAmount = 0;
        const currentBalance = account.balance || 0;

        if (account.normalBalance === 'DEBIT') {
          if (currentBalance >= 0) {
            debitAmount = currentBalance;
          } else {
            creditAmount = Math.abs(currentBalance); // Abnormal balance
          }
        } else { // Normal Balance is KREDIT
          if (currentBalance >= 0) {
            creditAmount = currentBalance;
          } else {
            debitAmount = Math.abs(currentBalance); // Abnormal balance
          }
        }
        
        // Only add to trial balance if there's a debit or credit amount (or if we want to show all accounts regardless of zero balance)
        // For now, let's include zero balance accounts as well, which is standard for a trial balance.
        processedData.push({
          accountId: account.accountId,
          accountName: account.accountName,
          debit: debitAmount,
          credit: creditAmount,
        });

        currentTotalDebit += debitAmount;
        currentTotalCredit += creditAmount;
      });

      setTrialBalanceData(processedData);
      setTotalDebit(currentTotalDebit);
      setTotalCredit(currentTotalCredit);
      setReportDate(new Date()); // Set report date to current date/time of generation

    } catch (err) {
      console.error("Error fetching trial balance data:", err);
      setError('Gagal memuat data Neraca Saldo.');
      toast({ title: "Error", description: "Gagal memuat data untuk Neraca Saldo.", variant: "destructive" });
    } finally {
      setPageLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading) {
      if (user && allowedRoles.includes(user.role as UserProfile['role'])) {
        fetchAndProcessTrialBalance();
      } else if (user) {
        router.push('/admin/dashboard'); // Redirect if not authorized
      } else {
        router.push('/login'); // Redirect if not logged in
      }
    }
  }, [user, authLoading, router, fetchAndProcessTrialBalance, allowedRoles]);

  const handlePrint = () => {
    window.print();
  };

  if (authLoading || (pageLoading && trialBalanceData.length === 0 && !error)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat data laporan...</p>
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
    <div className="space-y-8 printable-area">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Laporan Keuangan</h1>
        </div>
        <div>
          <Button onClick={handlePrint} variant="outline" className="mr-2">
            <Printer className="mr-2 h-4 w-4" /> Cetak Laporan
          </Button>
          <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Admin
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle className="text-xl font-headline text-accent">Neraca Saldo</CardTitle>
              <CardDescription>Per Tanggal: {reportDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</CardDescription>
            </div>
            <Button onClick={fetchAndProcessTrialBalance} variant="outline" size="sm" className="mt-2 sm:mt-0 no-print">
              <Loader2 className={`mr-2 h-4 w-4 ${pageLoading ? 'animate-spin' : 'hidden'}`} />
              Muat Ulang Data
            </Button>
          </div>
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
            <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-3 text-muted-foreground">Memuat Neraca Saldo...</p></div>
          )}
          {!pageLoading && !error && trialBalanceData.length === 0 && (
            <Alert>
              <BarChart3 className="h-4 w-4" />
              <AlertTitle>Data Kosong</AlertTitle>
              <AlertDescription>Belum ada data akun untuk ditampilkan dalam Neraca Saldo atau semua saldo akun adalah nol.</AlertDescription>
            </Alert>
          )}
          {!pageLoading && !error && trialBalanceData.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">No. Akun</TableHead>
                    <TableHead>Nama Akun</TableHead>
                    <TableHead className="text-right w-[150px]">Debit (Rp)</TableHead>
                    <TableHead className="text-right w-[150px]">Kredit (Rp)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalanceData.map((row) => (
                    <TableRow key={row.accountId}>
                      <TableCell className="font-mono">{row.accountId}</TableCell>
                      <TableCell>{row.accountName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.debit !== 0 ? row.debit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.credit !== 0 ? row.credit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold text-lg">
                    <TableCell colSpan={2} className="text-right">TOTAL</TableCell>
                    <TableCell className="text-right font-mono">
                      {totalDebit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {totalCredit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
              {Math.abs(totalDebit - totalCredit) > 0.001 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Tidak Seimbang!</AlertTitle>
                  <AlertDescription>Total Debit (Rp {totalDebit.toLocaleString('id-ID')}) tidak sama dengan Total Kredit (Rp {totalCredit.toLocaleString('id-ID')}). Mohon periksa kembali entri transaksi Anda.</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Alert className="no-print mt-8">
        <BarChart3 className="h-4 w-4" />
        <AlertTitle>Informasi Laporan</AlertTitle>
        <AlertDescription>
          Neraca Saldo ini menampilkan saldo akhir dari setiap akun pada tanggal laporan dibuat. 
          Fitur untuk memilih periode laporan dan jenis laporan lainnya (Laba Rugi, Neraca, Arus Kas) akan ditambahkan pada pengembangan selanjutnya.
        </AlertDescription>
      </Alert>
    </div>
  );
}
