
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldAlert, Loader2, AlertCircle, Construction, SearchCheck, FileJson, Play, BarChartHorizontalBig } from 'lucide-react';
import type { UserProfile, TransactionInput } from '@/types';
import { analyzeFinancialTransactions, AnalyzeTransactionsInput, AnalyzeTransactionsOutput, PotentialAnomaly } from '@/ai/flows/analyze-financial-transactions';
import { useToast } from '@/hooks/use-toast';

const allowedRoles: Array<UserProfile['role']> = ['admin_utama', 'sekertaris', 'bendahara'];

const exampleJsonInput = JSON.stringify([
  {
    "id": "TX001",
    "date": "2023-10-01",
    "description": "Pembelian ATK rutin",
    "amount": 250000,
    "accountId": "6105",
    "accountName": "Biaya Alat Tulis Kantor"
  },
  {
    "id": "TX002",
    "date": "2023-10-01",
    "description": "Pembayaran Gaji Karyawan",
    "amount": 25000000,
    "accountId": "6100",
    "accountName": "Biaya Gaji"
  },
  {
    "id": "TX003",
    "date": "2023-10-02",
    "description": "Pembayaran tanpa faktur untuk konsumsi rapat",
    "amount": 750000,
    "accountId": "6110",
    "accountName": "Biaya Konsumsi"
  },
  {
    "id": "TX004",
    "date": "2023-10-03",
    "description": "Biaya perjalanan dinas ke luar kota",
    "amount": 12000000,
    "accountId": "6120",
    "accountName": "Biaya Perjalanan Dinas"
  },
  {
    "id": "TX004-dup",
    "date": "2023-10-03",
    "description": "Biaya perjalanan dinas ke luar kota",
    "amount": 12000000,
    "accountId": "6120",
    "accountName": "Biaya Perjalanan Dinas"
  }
], null, 2);


export default function AnomalyDetectionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [transactionJson, setTransactionJson] = useState<string>(exampleJsonInput);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeTransactionsOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (user && allowedRoles.includes(user.role as UserProfile['role'])) {
        // User is authorized
      } else if (user) {
        router.push('/admin/dashboard'); // Redirect if not authorized
      } else {
        router.push('/login'); // Redirect if not logged in
      }
    }
  }, [user, authLoading, router]);

  const handleAnalyzeTransactions = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    let transactions: TransactionInput[];

    try {
      transactions = JSON.parse(transactionJson);
      if (!Array.isArray(transactions)) {
        throw new Error("Input JSON harus berupa array transaksi.");
      }
      // Basic validation for key fields (can be more robust)
      if (transactions.length > 0) {
        const firstTx = transactions[0];
        if (!firstTx.id || !firstTx.date || !firstTx.description || typeof firstTx.amount !== 'number') {
            throw new Error("Setiap transaksi minimal harus memiliki 'id', 'date', 'description', dan 'amount' (number).");
        }
      }

    } catch (e: any) {
      setAnalysisError(`Error parsing JSON: ${e.message}`);
      toast({ title: "Input Tidak Valid", description: `Format JSON transaksi tidak benar. ${e.message}`, variant: "destructive" });
      setIsAnalyzing(false);
      return;
    }

    try {
      // Default config can be added here if needed or taken from a future UI
      const input: AnalyzeTransactionsInput = { transactions }; 
      const result = await analyzeFinancialTransactions(input);
      setAnalysisResult(result);
      toast({ title: "Analisis Selesai", description: `Menganalisis ${result.analyzedCount} transaksi.` });
    } catch (e: any) {
      setAnalysisError(`Error during analysis: ${e.message}`);
      toast({ title: "Analisis Gagal", description: `Terjadi kesalahan: ${e.message}`, variant: "destructive" });
      console.error("Analysis error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getAnomalySeverityBadge = (severity: PotentialAnomaly['severity']) => {
    switch (severity) {
        case "High": return <Badge variant="destructive" className="bg-red-500">Tinggi</Badge>;
        case "Medium": return <Badge variant="default" className="bg-orange-500">Sedang</Badge>;
        case "Low": return <Badge variant="secondary" className="bg-yellow-500">Rendah</Badge>;
        default: return <Badge variant="outline">{severity}</Badge>;
    }
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SearchCheck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Deteksi Anomali Keuangan</h1>
        </div>
        <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Admin
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent flex items-center">
            <FileJson className="mr-3 h-6 w-6" /> Analisis Transaksi Manual
          </CardTitle>
          <CardDescription>
            Masukkan data transaksi dalam format JSON untuk dianalisis oleh sistem.
            Setiap objek transaksi minimal harus memiliki field: <code>id</code> (string), <code>date</code> (string YYYY-MM-DD), <code>description</code> (string), <code>amount</code> (number).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="transactionJsonInput">Data Transaksi (JSON Array)</Label>
            <Textarea
              id="transactionJsonInput"
              value={transactionJson}
              onChange={(e) => setTransactionJson(e.target.value)}
              placeholder={exampleJsonInput}
              rows={10}
              className="font-mono text-xs"
              disabled={isAnalyzing}
            />
          </div>
          <Button onClick={handleAnalyzeTransactions} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Jalankan Analisis
          </Button>
        </CardContent>
      </Card>

      {isAnalyzing && (
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="text-xl font-headline text-accent flex items-center"><Loader2 className="mr-3 h-6 w-6 animate-spin" />Menganalisis...</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Harap tunggu, sistem sedang memproses data transaksi Anda.</p></CardContent>
        </Card>
      )}

      {analysisResult && !isAnalyzing && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-accent flex items-center">
              <BarChartHorizontalBig className="mr-3 h-6 w-6" /> Hasil Analisis
            </CardTitle>
            <CardDescription>{analysisResult.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            {analysisResult.anomaliesFound.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Tidak Ada Anomali Ditemukan</AlertTitle>
                <AlertDescription>Tidak ada potensi anomali yang terdeteksi dari data yang diberikan berdasarkan aturan saat ini.</AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Transaksi</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Jenis Anomali</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Saran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisResult.anomaliesFound.map((anomaly, index) => (
                    <TableRow key={`${anomaly.transaction.id}-${index}`} className="bg-red-50/30 hover:bg-red-100/50 dark:bg-red-900/10 dark:hover:bg-red-800/20">
                      <TableCell className="font-mono text-xs">{anomaly.transaction.id}</TableCell>
                      <TableCell>{anomaly.transaction.date}</TableCell>
                      <TableCell className="max-w-xs truncate">{anomaly.transaction.description}</TableCell>
                      <TableCell className="text-right font-mono">{anomaly.transaction.amount.toLocaleString('id-ID')}</TableCell>
                      <TableCell><Badge variant="outline" className="border-orange-500 text-orange-600">{anomaly.anomalyType}</Badge></TableCell>
                      <TableCell className="text-xs max-w-md">{anomaly.reason}</TableCell>
                      <TableCell>{getAnomalySeverityBadge(anomaly.severity)}</TableCell>
                      <TableCell className="text-xs max-w-sm">{anomaly.suggestion || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {analysisError && !isAnalyzing && (
         <Card className="shadow-lg">
          <CardHeader><CardTitle className="text-xl font-headline text-destructive flex items-center"><AlertCircle className="mr-3 h-6 w-6" />Error Analisis</CardTitle></CardHeader>
          <CardContent>
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Terjadi Kesalahan</AlertTitle>
                <AlertDescription>{analysisError}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
      
      <Card className="shadow-lg mt-10">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent flex items-center">
            <AlertCircle className="mr-3 h-7 w-7 text-orange-500" /> Fitur Dalam Tahap Pengembangan Lanjutan
          </CardTitle>
          <CardDescription>
            Sistem pengecekan anomali keuangan otomatis penuh adalah fitur kompleks yang sedang dalam tahap perencanaan dan pengembangan lebih lanjut.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Analisis manual di atas adalah langkah awal. Sistem deteksi anomali yang sepenuhnya otomatis dan proaktif akan melibatkan:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1.5 pl-5">
            <li>Integrasi langsung dengan database transaksi koperasi untuk pemindaian otomatis.</li>
            <li>Antarmuka untuk mengelola aturan dan ambang batas anomali secara dinamis.</li>
            <li>Sistem notifikasi untuk admin jika terdeteksi anomali.</li>
            <li>Dashboard khusus untuk meninjau dan menindaklanjuti anomali.</li>
            <li>Peningkatan kemampuan AI untuk deteksi pola yang lebih kompleks.</li>
          </ul>
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Construction className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-700 font-semibold">Pengembangan Selanjutnya</AlertTitle>
            <AlertDescription className="text-blue-600">
              Langkah selanjutnya dapat mencakup pembuatan UI untuk mengambil data transaksi dari Firestore berdasarkan rentang tanggal, atau mengizinkan unggah file CSV. Ini akan mengurangi kebutuhan input manual dan memperluas kegunaan alat ini.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

    </div>
  );
}
