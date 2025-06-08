
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, ShieldAlert, Loader2, BarChartHorizontalBig, CalendarIcon, Filter, FilePieChart, Info } from 'lucide-react';
import type { UserProfile, ChartOfAccountItem, Transaction, TransactionDetail } from '@/types';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';

const allowedRoles: Array<UserProfile['role']> = ['admin_utama', 'sekertaris', 'bendahara', 'dinas'];

interface ExpenditureByCategory {
  categoryName: string; // e.g., Account Name from CoA
  categoryId: string; // e.g., Account ID from CoA
  totalAmount: number;
  percentage?: number; // Percentage of total expenditure
}

interface ExpenditureSummaryData {
  totalExpenditure: number;
  expendituresByCategory: ExpenditureByCategory[];
  period: string;
}

export default function ExpenditureSummaryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [summaryData, setSummaryData] = useState<ExpenditureSummaryData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);


  const fetchExpenditureSummary = useCallback(async (currentStartDate?: Date, currentEndDate?: Date) => {
    if (!user) {
        toast({title: "Pengguna Tidak Ditemukan", description: "Silakan login ulang.", variant:"destructive"});
        return;
    }
    if (!currentStartDate || !currentEndDate) {
        toast({title: "Periode Tidak Lengkap", description: "Mohon pilih tanggal mulai dan selesai.", variant:"destructive"});
        return;
    }
    setDataLoading(true);
    setSummaryData(null); // Clear previous data

    const displayPeriodStr = `Periode: ${format(currentStartDate, "PPP", { locale: localeID })} - ${format(currentEndDate, "PPP", { locale: localeID })}`;

    try {
      // 1. Fetch Expense Accounts from CoA
      const coaQuery = query(collection(db, 'chartOfAccounts'), where('accountType', '==', 'BEBAN'));
      const coaSnapshot = await getDocs(coaQuery);
      const expenseAccountsMap = new Map<string, ChartOfAccountItem>();
      coaSnapshot.forEach(doc => {
        const acc = doc.data() as ChartOfAccountItem;
        expenseAccountsMap.set(acc.accountId, { id: doc.id, ...acc });
      });

      if (expenseAccountsMap.size === 0) {
        toast({ title: "Tidak Ada Akun Beban", description: "Tidak ada akun dengan tipe 'BEBAN' di Bagan Akun Anda.", variant: "destructive" });
        setSummaryData({ totalExpenditure: 0, expendituresByCategory: [], period: displayPeriodStr });
        setDataLoading(false);
        return;
      }

      // 2. Fetch Transactions for the period
      const transactionsRef = collection(db, 'transactions');
      const transactionsQuery = query(
        transactionsRef,
        where('status', '==', 'POSTED'),
        where('transactionDate', '>=', Timestamp.fromDate(startOfDay(currentStartDate))),
        where('transactionDate', '<=', Timestamp.fromDate(endOfDay(currentEndDate))),
        orderBy('transactionDate', 'asc')
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);

      const expenditures: Record<string, { categoryName: string, totalAmount: number }> = {};
      let overallTotalExpenditure = 0;

      for (const txDoc of transactionsSnapshot.docs) {
        const detailsCollectionRef = collection(db, `transactions/${txDoc.id}/details`);
        const detailsSnapshot = await getDocs(detailsCollectionRef);

        detailsSnapshot.forEach(detailDoc => {
          const detail = detailDoc.data() as TransactionDetail;
          const accountInfo = expenseAccountsMap.get(detail.accountId);

          if (accountInfo) { // If this detail's account is an expense account
            const debit = detail.debitAmount || 0;
            const credit = detail.creditAmount || 0;
            // For expense accounts (Normal Balance Debit): Debit increases expense, Credit decreases expense (e.g., refund)
            const netExpenseForDetail = debit - credit;

            if (!expenditures[detail.accountId]) {
              expenditures[detail.accountId] = { categoryName: accountInfo.accountName, totalAmount: 0 };
            }
            expenditures[detail.accountId].totalAmount += netExpenseForDetail;
            overallTotalExpenditure += netExpenseForDetail;
          }
        });
      }

      const expendituresByCategory: ExpenditureByCategory[] = Object.entries(expenditures)
        .map(([accountId, data]) => ({
          categoryId: accountId,
          categoryName: data.categoryName,
          totalAmount: data.totalAmount,
          percentage: overallTotalExpenditure > 0 ? (data.totalAmount / overallTotalExpenditure) * 100 : 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount); // Sort by amount descending

      setSummaryData({
        totalExpenditure: overallTotalExpenditure,
        expendituresByCategory,
        period: displayPeriodStr,
      });

    } catch (error) {
      console.error("Error fetching expenditure summary:", error);
      toast({ title: "Gagal Memuat Ringkasan", description: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
      setSummaryData(null);
    } finally {
      setDataLoading(false);
      setInitialLoadComplete(true);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user && allowedRoles.includes(user.role as UserProfile['role']) && !initialLoadComplete) {
      if (startDate && endDate) {
        fetchExpenditureSummary(startDate, endDate);
      }
    }
  }, [user, authLoading, initialLoadComplete, startDate, endDate, fetchExpenditureSummary]);

  const handleApplyFilter = () => {
    if (!startDate || !endDate) {
      toast({ title: "Periode Tidak Lengkap", description: "Mohon pilih tanggal mulai dan tanggal selesai.", variant: "destructive" });
      return;
    }
    if (startDate > endDate) {
        toast({ title: "Periode Tidak Valid", description: "Tanggal mulai tidak boleh setelah tanggal selesai.", variant: "destructive" });
        return;
    }
    setInitialLoadComplete(false); // Reset to trigger fetch
    fetchExpenditureSummary(startDate, endDate);
  };


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
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Akses Ditolak</AlertTitle><AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini.</AlertDescription></Alert>
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
          <CardTitle className="text-lg font-headline">Filter Periode</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "PPP", {locale: localeID}) : <span>Pilih Tanggal Mulai</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
          </Popover>
          <span className="text-muted-foreground hidden sm:inline">-</span>
           <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "PPP", {locale: localeID}) : <span>Pilih Tanggal Selesai</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
          </Popover>
          <Button onClick={handleApplyFilter} className="w-full sm:w-auto" disabled={dataLoading}>
            {dataLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />} Terapkan Filter
          </Button>
        </CardContent>
      </Card>

      {dataLoading && !summaryData && (
        <Card className="shadow-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="mt-2 text-muted-foreground">Memuat data ringkasan pengeluaran...</p>
          </CardContent>
        </Card>
      )}

      {!dataLoading && summaryData && (
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-headline text-accent">Total Pengeluaran</CardTitle>
              <CardDescription>{summaryData.period}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">
                Rp {summaryData.totalExpenditure.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-headline text-accent">Rincian Pengeluaran per Kategori</CardTitle>
              <CardDescription>{summaryData.period}</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryData.expendituresByCategory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori (Akun Beban)</TableHead>
                      <TableHead className="text-right">Jumlah (Rp)</TableHead>
                      <TableHead className="text-right w-[100px]">Persentase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryData.expendituresByCategory.map((item) => (
                      <TableRow key={item.categoryId}>
                        <TableCell>{item.categoryName} ({item.categoryId})</TableCell>
                        <TableCell className="text-right font-mono">{item.totalAmount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono">{item.percentage?.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                   <ShadTableFooter>
                    <TableRow className="font-bold text-md bg-muted/50">
                        <TableCell>TOTAL KESELURUHAN</TableCell>
                        <TableCell className="text-right font-mono">{summaryData.totalExpenditure.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono">{summaryData.expendituresByCategory.length > 0 ? '100.00%' : '0.00%'}</TableCell>
                    </TableRow>
                  </ShadTableFooter>
                </Table>
              ) : (
                <Alert>
                  <BarChartHorizontalBig className="h-4 w-4" />
                  <AlertTitle>Data Kosong</AlertTitle>
                  <AlertDescription>Tidak ada data pengeluaran untuk periode yang dipilih.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {!dataLoading && !summaryData && initialLoadComplete && (
         <Card className="shadow-lg">
            <CardHeader><CardTitle className="text-xl font-headline text-accent">Data Tidak Tersedia</CardTitle></CardHeader>
            <CardContent>
                <Alert variant="default">
                    <BarChartHorizontalBig className="h-4 w-4"/>
                    <AlertTitle>Tidak Ada Data</AlertTitle>
                    <AlertDescription>Tidak ada data pengeluaran untuk ditampilkan berdasarkan filter yang dipilih. Silakan coba periode lain atau pastikan transaksi sudah dicatat.</AlertDescription>
                </Alert>
            </CardContent>
         </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent flex items-center">
            <FilePieChart className="mr-3 h-6 w-6 text-primary" />
            Visualisasi Data Pengeluaran (Segera Hadir)
          </CardTitle>
          <CardDescription>
            Grafik dan diagram untuk analisis visual pengeluaran akan ditambahkan di sini.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center bg-muted/30 rounded-md">
            <p className="text-muted-foreground">Area untuk chart pengeluaran...</p>
        </CardContent>
      </Card>
    </div>
  );
}

    
