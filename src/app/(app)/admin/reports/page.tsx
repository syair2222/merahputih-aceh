
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { ArrowLeft, ShieldAlert, Loader2, BarChart3, Printer, AlertCircle, FileSpreadsheet, Scaling, CircleDollarSign } from 'lucide-react';
import type { ChartOfAccountItem, UserProfile } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TrialBalanceEntry {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface IncomeStatementData {
  revenues: Array<{ accountId: string; accountName: string; balance: number }>;
  totalRevenue: number;
  expenses: Array<{ accountId: string; accountName: string; balance: number }>;
  totalExpenses: number;
  netIncome: number;
}

interface BalanceSheetData {
  assets: Array<{ accountId: string; accountName: string; balance: number }>;
  totalAssets: number;
  liabilities: Array<{ accountId: string; accountName: string; balance: number }>;
  totalLiabilities: number;
  equityAccounts: Array<{ accountId: string; accountName: string; balance: number }>;
  totalEquityFromCoA: number;
  netIncomeForBS: number; // Current period's net income
  totalLiabilitiesAndEquity: number;
}


export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allAccounts, setAllAccounts] = useState<ChartOfAccountItem[]>([]);
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceEntry[]>([]);
  const [totalDebitTB, setTotalDebitTB] = useState(0);
  const [totalCreditTB, setTotalCreditTB] = useState(0);

  const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatementData | null>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("trialBalance");


  const allowedRoles: Array<UserProfile['role']> = ['admin_utama', 'sekertaris', 'bendahara', 'dinas', 'bank_partner_admin'];

  const processFinancialData = useCallback((accounts: ChartOfAccountItem[]) => {
    // --- Trial Balance Processing ---
    const processedTBData: TrialBalanceEntry[] = [];
    let currentTotalDebitTB = 0;
    let currentTotalCreditTB = 0;

    accounts.forEach(account => {
      let debitAmount = 0;
      let creditAmount = 0;
      const currentBalance = account.balance || 0;

      if (account.normalBalance === 'DEBIT') {
        if (currentBalance >= 0) debitAmount = currentBalance;
        else creditAmount = Math.abs(currentBalance);
      } else { // Normal Balance is KREDIT
        if (currentBalance >= 0) creditAmount = currentBalance;
        else debitAmount = Math.abs(currentBalance);
      }
      processedTBData.push({ accountId: account.accountId, accountName: account.accountName, debit: debitAmount, credit: creditAmount });
      currentTotalDebitTB += debitAmount;
      currentTotalCreditTB += creditAmount;
    });
    setTrialBalanceData(processedTBData);
    setTotalDebitTB(currentTotalDebitTB);
    setTotalCreditTB(currentTotalCreditTB);

    // --- Income Statement Processing ---
    const revenues = accounts.filter(acc => acc.accountType === 'PENDAPATAN');
    const expenses = accounts.filter(acc => acc.accountType === 'BEBAN');
    
    const totalRevenue = revenues.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const totalExpenses = expenses.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const netIncome = totalRevenue - totalExpenses;
    setIncomeStatementData({ revenues, totalRevenue, expenses, totalExpenses, netIncome });

    // --- Balance Sheet Processing ---
    const assets = accounts.filter(acc => acc.accountType === 'ASET');
    const liabilities = accounts.filter(acc => acc.accountType === 'LIABILITAS');
    const equityAccounts = accounts.filter(acc => acc.accountType === 'EKUITAS');

    const totalAssets = assets.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const totalEquityFromCoA = equityAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    // For a snapshot Balance Sheet, current Net Income is part of the change in Equity for the period.
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquityFromCoA + netIncome;
    setBalanceSheetData({ assets, totalAssets, liabilities, totalLiabilities, equityAccounts, totalEquityFromCoA, netIncomeForBS: netIncome, totalLiabilitiesAndEquity });

    setReportDate(new Date());
  }, []);


  const fetchAllAccounts = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      const accountsQuery = query(collection(db, 'chartOfAccounts'), orderBy('accountId', 'asc'));
      const querySnapshot = await getDocs(accountsQuery);
      const fetchedAccounts = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id, ...docSnap.data()
      } as ChartOfAccountItem));
      setAllAccounts(fetchedAccounts);
      processFinancialData(fetchedAccounts);
    } catch (err) {
      console.error("Error fetching accounts data:", err);
      setError('Gagal memuat data akun.');
      toast({ title: "Error", description: "Gagal memuat data akun untuk laporan.", variant: "destructive" });
    } finally {
      setPageLoading(false);
    }
  }, [toast, processFinancialData]);

  useEffect(() => {
    if (!authLoading) {
      if (user && allowedRoles.includes(user.role as UserProfile['role'])) {
        fetchAllAccounts();
      } else if (user) {
        router.push('/admin/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, authLoading, router, fetchAllAccounts, allowedRoles]);

  const handlePrint = () => {
    // Potentially enhance this to print only the active tab's content
    window.print();
  };

  if (authLoading || (pageLoading && allAccounts.length === 0 && !error)) {
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
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Akses Ditolak</AlertTitle><AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini.</AlertDescription></Alert>
        <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">Kembali ke Dasbor Admin</Button>
      </div>
    );
  }

  const renderTrialBalance = () => (
    <CardContent>
      {trialBalanceData.length === 0 && !pageLoading && (<Alert><BarChart3 className="h-4 w-4" /><AlertTitle>Data Kosong</AlertTitle><AlertDescription>Belum ada data akun.</AlertDescription></Alert>)}
      {trialBalanceData.length > 0 && (
        <>
          <Table>
            <TableHeader><TableRow><TableHead className="w-[120px]">No. Akun</TableHead><TableHead>Nama Akun</TableHead><TableHead className="text-right w-[150px]">Debit (Rp)</TableHead><TableHead className="text-right w-[150px]">Kredit (Rp)</TableHead></TableRow></TableHeader>
            <TableBody>
              {trialBalanceData.map((row) => (
                <TableRow key={row.accountId}>
                  <TableCell className="font-mono">{row.accountId}</TableCell>
                  <TableCell>{row.accountName}</TableCell>
                  <TableCell className="text-right font-mono">{row.debit !== 0 ? row.debit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</TableCell>
                  <TableCell className="text-right font-mono">{row.credit !== 0 ? row.credit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <ShadTableFooter>
              <TableRow className="font-bold text-lg bg-muted/50">
                <TableCell colSpan={2} className="text-right">TOTAL</TableCell>
                <TableCell className="text-right font-mono">{totalDebitTB.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right font-mono">{totalCreditTB.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              </TableRow>
            </ShadTableFooter>
          </Table>
          {Math.abs(totalDebitTB - totalCreditTB) > 0.001 && (
            <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Tidak Seimbang!</AlertTitle><AlertDescription>Total Debit tidak sama dengan Total Kredit.</AlertDescription></Alert>
          )}
        </>
      )}
    </CardContent>
  );

  const renderIncomeStatement = () => {
    if (!incomeStatementData) return <CardContent><Loader2 className="h-6 w-6 animate-spin" /></CardContent>;
    const { revenues, totalRevenue, expenses, totalExpenses, netIncome } = incomeStatementData;
    return (
      <CardContent className="space-y-4">
        <h3 className="text-lg font-semibold text-accent">Pendapatan</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Nama Akun Pendapatan</TableHead><TableHead className="text-right">Jumlah (Rp)</TableHead></TableRow></TableHeader>
          <TableBody>
            {revenues.map(r => (<TableRow key={r.accountId}><TableCell>{r.accountName} ({r.accountId})</TableCell><TableCell className="text-right font-mono">{(r.balance || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell></TableRow>))}
            <TableRow className="font-semibold bg-muted/30"><TableCell>Total Pendapatan</TableCell><TableCell className="text-right font-mono">{totalRevenue.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell></TableRow>
          </TableBody>
        </Table>
        <h3 className="text-lg font-semibold text-accent mt-6">Beban - Beban</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Nama Akun Beban</TableHead><TableHead className="text-right">Jumlah (Rp)</TableHead></TableRow></TableHeader>
          <TableBody>
            {expenses.map(e => (<TableRow key={e.accountId}><TableCell>{e.accountName} ({e.accountId})</TableCell><TableCell className="text-right font-mono">{(e.balance || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell></TableRow>))}
            <TableRow className="font-semibold bg-muted/30"><TableCell>Total Beban</TableCell><TableCell className="text-right font-mono">{totalExpenses.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell></TableRow>
          </TableBody>
        </Table>
        <div className={`mt-6 p-3 rounded-md text-lg font-bold flex justify-between ${netIncome >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <span>{netIncome >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</span>
          <span className="font-mono">{netIncome.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </CardContent>
    );
  };

  const renderBalanceSheet = () => {
    if (!balanceSheetData) return <CardContent><Loader2 className="h-6 w-6 animate-spin" /></CardContent>;
    const { assets, totalAssets, liabilities, totalLiabilities, equityAccounts, totalEquityFromCoA, netIncomeForBS, totalLiabilitiesAndEquity } = balanceSheetData;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.001;
    return (
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-accent border-b pb-1">Aset</h3>
            <Table>
                <TableBody>
                {assets.map(a => (<TableRow key={a.accountId}><TableCell>{a.accountName} ({a.accountId})</TableCell><TableCell className="text-right font-mono">{(a.balance || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell></TableRow>))}
                <TableRow className="font-bold text-md bg-muted/30"><TableCell>Total Aset</TableCell><TableCell className="text-right font-mono">{totalAssets.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell></TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-accent border-b pb-1">Liabilitas</h3>
            <Table>
              <TableBody>
                {liabilities.map(l => (<TableRow key={l.accountId}><TableCell>{l.accountName} ({l.accountId})</TableCell><TableCell className="text-right font-mono">{(l.balance || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell></TableRow>))}
                <TableRow className="font-semibold bg-muted/30"><TableCell>Total Liabilitas</TableCell><TableCell className="text-right font-mono">{totalLiabilities.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell></TableRow>
              </TableBody>
            </Table>
            <h3 className="text-lg font-semibold text-accent border-b pb-1 mt-4">Ekuitas</h3>
            <Table>
              <TableBody>
                {equityAccounts.map(eq => (<TableRow key={eq.accountId}><TableCell>{eq.accountName} ({eq.accountId})</TableCell><TableCell className="text-right font-mono">{(eq.balance || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell></TableRow>))}
                 <TableRow><TableCell>Laba (Rugi) Periode Berjalan</TableCell><TableCell className="text-right font-mono">{netIncomeForBS.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell></TableRow>
                <TableRow className="font-semibold bg-muted/30"><TableCell>Total Ekuitas</TableCell><TableCell className="text-right font-mono">{(totalEquityFromCoA + netIncomeForBS).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell></TableRow>
               </TableBody>
            </Table>
             <div className="mt-4 p-3 rounded-md text-md font-bold flex justify-between bg-muted/40">
                <span>Total Liabilitas dan Ekuitas</span>
                <span className="font-mono">{totalLiabilitiesAndEquity.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        <Alert variant={isBalanced ? "default" : "destructive"} className={`mt-6 ${isBalanced ? 'bg-green-50 border-green-300 text-green-700' : ''}`}>
            <AlertCircle className={`h-4 w-4 ${isBalanced ? 'text-green-600' : ''}`} />
            <AlertTitle className={isBalanced ? 'text-green-800' : ''}>{isBalanced ? "Neraca Seimbang" : "Neraca Tidak Seimbang!"}</AlertTitle>
            <AlertDescription>
                Total Aset: Rp {totalAssets.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>
                Total Liabilitas & Ekuitas: Rp {totalLiabilitiesAndEquity.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </AlertDescription>
        </Alert>
      </CardContent>
    );
  };

  return (
    <div className="space-y-8 printable-area">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Laporan Keuangan</h1>
        </div>
        <div>
          <Button onClick={handlePrint} variant="outline" className="mr-2"><Printer className="mr-2 h-4 w-4" /> Cetak Laporan</Button>
          <Button onClick={() => router.push('/admin/dashboard')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 no-print">
          <TabsTrigger value="trialBalance"><FileSpreadsheet className="mr-2 h-4 w-4"/>Neraca Saldo</TabsTrigger>
          <TabsTrigger value="incomeStatement"><Scaling className="mr-2 h-4 w-4"/>Laba Rugi</TabsTrigger>
          <TabsTrigger value="balanceSheet"><CircleDollarSign className="mr-2 h-4 w-4"/>Neraca</TabsTrigger>
        </TabsList>
        
        <Card className="shadow-lg mt-4">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <CardTitle className="text-xl font-headline text-accent">
                        {activeTab === "trialBalance" && "Neraca Saldo"}
                        {activeTab === "incomeStatement" && "Laporan Laba Rugi"}
                        {activeTab === "balanceSheet" && "Laporan Posisi Keuangan (Neraca)"}
                    </CardTitle>
                    <CardDescription>Per Tanggal: {reportDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</CardDescription>
                </div>
                <Button onClick={fetchAllAccounts} variant="outline" size="sm" className="mt-2 sm:mt-0 no-print">
                    <Loader2 className={`mr-2 h-4 w-4 ${pageLoading ? 'animate-spin' : 'hidden'}`} />
                    Muat Ulang Data
                </Button>
            </div>
          </CardHeader>

            {error && (<CardContent><Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></CardContent>)}
            {pageLoading && !error && (<CardContent><div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-3 text-muted-foreground">Memuat data...</p></div></CardContent>)}
            
            {!pageLoading && !error && (
                <>
                    <TabsContent value="trialBalance">{renderTrialBalance()}</TabsContent>
                    <TabsContent value="incomeStatement">{renderIncomeStatement()}</TabsContent>
                    <TabsContent value="balanceSheet">{renderBalanceSheet()}</TabsContent>
                </>
            )}
        </Card>
      </Tabs>

      <Alert className="no-print mt-8">
        <BarChart3 className="h-4 w-4" />
        <AlertTitle>Informasi Laporan</AlertTitle>
        <AlertDescription>
          Laporan ini menampilkan kondisi keuangan berdasarkan data transaksi dan saldo akun terakhir. 
          Untuk pelaporan periodik yang akurat (misal, bulanan/tahunan), fitur pemilihan periode dan proses tutup buku akan dikembangkan lebih lanjut.
        </AlertDescription>
      </Alert>
    </div>
  );
}
