
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, ShieldAlert, Loader2, BarChartHorizontalBig, CalendarIcon, Filter, FilePieChart } from 'lucide-react';
import type { UserProfile } from '@/types';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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
}

export default function ExpenditureSummaryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [summaryData, setSummaryData] = useState<ExpenditureSummaryData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [displayPeriod, setDisplayPeriod] = useState<string>(
    `Periode: ${format(startOfMonth(new Date()), "PPP", { locale: localeID })} - ${format(endOfMonth(new Date()), "PPP", { locale: localeID })}`
  );

  // TODO: Implement actual data fetching logic
  const fetchExpenditureSummary = useCallback(async (currentStartDate?: Date, currentEndDate?: Date) => {
    if (!currentStartDate || !currentEndDate) {
        toast({title: "Periode Tidak Lengkap", description: "Mohon pilih tanggal mulai dan selesai.", variant:"destructive"});
        return;
    }
    setDataLoading(true);
    setDisplayPeriod(`Periode: ${format(currentStartDate, "PPP", { locale: localeID })} - ${format(currentEndDate, "PPP", { locale: localeID })}`);
    
    // --- MOCK DATA ---
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
    const mockTotal = Math.floor(Math.random() * 10000000) + 5000000;
    const mockCategories: ExpenditureByCategory[] = [
      { categoryId: '6100', categoryName: 'Beban Gaji & Upah', totalAmount: mockTotal * 0.4, percentage: 40 },
      { categoryId: '6200', categoryName: 'Beban Sewa', totalAmount: mockTotal * 0.15, percentage: 15 },
      { categoryId: '6300', categoryName: 'Beban Operasional Kantor', totalAmount: mockTotal * 0.2, percentage: 20 },
      { categoryId: '6400', categoryName: 'Beban Pemasaran', totalAmount: mockTotal * 0.1, percentage: 10 },
      { categoryId: '6900', categoryName: 'Beban Lain-lain', totalAmount: mockTotal * 0.15, percentage: 15 },
    ];
    // Recalculate percentages if needed for mock data consistency
    let currentTotal = 0;
    mockCategories.forEach(cat => currentTotal += cat.totalAmount);
    mockCategories.forEach(cat => cat.percentage = parseFloat(((cat.totalAmount / currentTotal) * 100).toFixed(2)) );
    
    setSummaryData({
      totalExpenditure: currentTotal,
      expendituresByCategory: mockCategories,
    });
    // --- END MOCK DATA ---

    setDataLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!authLoading && user && allowedRoles.includes(user.role as UserProfile['role'])) {
      fetchExpenditureSummary(startDate, endDate); // Fetch on initial load
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]); // fetchExpenditureSummary is memoized, startDate/endDate changes trigger handleApplyFilter

  const handleApplyFilter = () => {
    if (!startDate || !endDate) {
      toast({ title: "Periode Tidak Lengkap", description: "Mohon pilih tanggal mulai dan tanggal selesai.", variant: "destructive" });
      return;
    }
    if (startDate > endDate) {
        toast({ title: "Periode Tidak Valid", description: "Tanggal mulai tidak boleh setelah tanggal selesai.", variant: "destructive" });
        return;
    }
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

      {dataLoading && (
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
              <CardDescription>{displayPeriod}</CardDescription>
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
              <CardDescription>{displayPeriod}</CardDescription>
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
                        <TableCell className="text-right font-mono">{item.totalAmount.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-right font-mono">{item.percentage?.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                   <TableFooter>
                    <TableRow className="font-bold text-md bg-muted/50">
                        <TableCell>TOTAL KESELURUHAN</TableCell>
                        <TableCell className="text-right font-mono">{summaryData.totalExpenditure.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-right font-mono">100.00%</TableCell>
                    </TableRow>
                  </TableFooter>
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
      
      {!dataLoading && !summaryData && (
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

