
'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, Loader2, Award, Users, Wallet, FileText } from 'lucide-react';
import type { UserProfile, UserDocument } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, increment, serverTimestamp, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

const allowedRoles: Array<UserProfile['role']> = ['admin_utama'];

interface ProcessingSummary {
  workersProcessed: number;
  totalPointsDistributed: number;
  monthYear: string;
  transactionId?: string;
  errors: string[];
}

export default function WorkerSalaryProcessingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSummary, setProcessingSummary] = useState<ProcessingSummary | null>(null);

  const handleProcessSalaries = async () => {
    if (!user) {
      toast({ title: "Error", description: "Admin tidak terautentikasi.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    setProcessingSummary(null);
    const currentMonthYear = format(new Date(), "MMMM yyyy", { locale: localeID });
    const summary: ProcessingSummary = {
      workersProcessed: 0,
      totalPointsDistributed: 0,
      monthYear: currentMonthYear,
      errors: [],
    };

    const batch = writeBatch(db);

    try {
      // 1. Fetch all workers
      const usersRef = collection(db, 'users');
      const workersQuery = query(usersRef, where('isWorker', '==', true), where('monthlyPointSalary', '>', 0));
      const workersSnapshot = await getDocs(workersQuery);

      if (workersSnapshot.empty) {
        toast({ title: "Tidak Ada Pekerja", description: "Tidak ditemukan data pekerja dengan gaji poin yang ditetapkan.", variant: "default" });
        setIsProcessing(false);
        setProcessingSummary({ ...summary, errors: ["Tidak ada pekerja yang memenuhi syarat untuk diproses."] });
        return;
      }

      let accumulatedTotalPoints = 0;

      // 2. Iterate and update points for each worker
      for (const workerDoc of workersSnapshot.docs) {
        const workerData = workerDoc.data() as UserDocument;
        const salaryPoints = workerData.monthlyPointSalary || 0;

        if (salaryPoints > 0) {
          const memberDocRef = doc(db, 'members', workerData.uid);
          // Check if member document exists before trying to update it
          const memberDocSnap = await getDoc(memberDocRef);
          if (memberDocSnap.exists()) {
            batch.update(memberDocRef, { currentPointsBalance: increment(salaryPoints) });
            accumulatedTotalPoints += salaryPoints;
            summary.workersProcessed++;
          } else {
            const errorMessage = `Dokumen member untuk pekerja ${workerData.displayName || workerData.email} (UID: ${workerData.uid}) tidak ditemukan. Gaji poin tidak dapat ditambahkan.`;
            console.warn(errorMessage);
            summary.errors.push(errorMessage);
          }
        }
      }
      
      summary.totalPointsDistributed = accumulatedTotalPoints;

      if (summary.workersProcessed === 0 && accumulatedTotalPoints === 0) {
         toast({ title: "Tidak Ada Gaji Diproses", description: "Tidak ada pekerja yang memenuhi syarat atau dokumen member mereka tidak ditemukan.", variant: "default" });
         setIsProcessing(false);
         setProcessingSummary(summary); // Show errors if any
         return;
      }


      // 3. Record the financial transaction for total salary expense
      if (accumulatedTotalPoints > 0) {
        const transactionDescription = `Pembayaran Gaji Poin Pekerja - ${currentMonthYear}`;
        const transactionHeaderData = {
          transactionDate: serverTimestamp(),
          description: transactionDescription,
          referenceNumber: `GAJIPOIN-${format(new Date(), "yyyyMMddHHmmss")}`,
          status: 'POSTED' as const,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          postedAt: serverTimestamp(),
          postedBy: user.uid,
          totalDebit: accumulatedTotalPoints,
          totalCredit: accumulatedTotalPoints,
        };
        const transactionRef = doc(collection(db, 'transactions'));
        batch.set(transactionRef, transactionHeaderData);
        summary.transactionId = transactionRef.id;

        // Debit: Beban Gaji Poin Pekerja (CoA: 6010)
        const debitDetailData = {
          transactionId: transactionRef.id,
          accountId: '6010', // Placeholder, admin must ensure this account exists
          debitAmount: accumulatedTotalPoints,
          creditAmount: 0,
          notes: 'Beban gaji poin pekerja bulan ' + currentMonthYear,
        };
        const debitDetailRef = doc(collection(db, `transactions/${transactionRef.id}/details`));
        batch.set(debitDetailRef, debitDetailData);

        // Kredit: Utang Poin Gaji Pekerja (CoA: 2020)
        const creditDetailData = {
          transactionId: transactionRef.id,
          accountId: '2020', // Placeholder, admin must ensure this account exists
          debitAmount: 0,
          creditAmount: accumulatedTotalPoints,
          notes: 'Utang poin gaji pekerja bulan ' + currentMonthYear,
        };
        const creditDetailRef = doc(collection(db, `transactions/${transactionRef.id}/details`));
        batch.set(creditDetailRef, creditDetailData);
      }

      // 4. Commit batch
      await batch.commit();

      toast({
        title: "Proses Gaji Poin Selesai",
        description: `${summary.workersProcessed} pekerja diproses, total ${summary.totalPointsDistributed.toLocaleString()} poin didistribusikan. ID Transaksi: ${summary.transactionId || 'N/A'}`,
        duration: 7000,
      });
      setProcessingSummary(summary);

    } catch (error: any) {
      console.error("Error processing worker salaries:", error);
      toast({ title: "Gagal Memproses Gaji", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
      summary.errors.push(error.message || "Kesalahan tidak diketahui selama pemrosesan.");
      setProcessingSummary(summary);
    } finally {
      setIsProcessing(false);
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
          <AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini. Hanya Admin Utama yang diizinkan.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">Kembali ke Dasbor Admin</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Award className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Proses Gaji Poin Pekerja</h1>
        </div>
        <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Admin
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Pemicu Manual Gaji Poin Bulanan</CardTitle>
          <CardDescription>
            Klik tombol di bawah untuk memproses penambahan poin gaji ke semua pekerja koperasi yang terdaftar 
            sesuai dengan nominal gaji poin bulanan yang telah ditetapkan di profil mereka.
            Pastikan akun CoA untuk 'Beban Gaji Poin Pekerja' (cth: 6010) dan 'Utang Poin Gaji Pekerja' (cth: 2020) sudah ada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleProcessSalaries}
            disabled={isProcessing}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Award className="mr-2 h-5 w-5" />}
            Proses Gaji Poin Bulan Ini ({format(new Date(), "MMMM yyyy", { locale: localeID })})
          </Button>
          {isProcessing && <p className="mt-2 text-sm text-muted-foreground">Sedang memproses, mohon tunggu...</p>}
        </CardContent>
      </Card>

      {processingSummary && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-accent">Ringkasan Proses Gaji Poin</CardTitle>
            <CardDescription>Periode: {processingSummary.monthYear}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Jumlah Pekerja Diproses: <strong>{processingSummary.workersProcessed}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-green-600" />
              <span>Total Poin Didistribusikan: <strong>{processingSummary.totalPointsDistributed.toLocaleString()} poin</strong></span>
            </div>
            {processingSummary.transactionId && (
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>ID Transaksi Jurnal: <strong>{processingSummary.transactionId}</strong></span>
              </div>
            )}
            {processingSummary.errors.length > 0 && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Peringatan Selama Proses</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-xs">
                    {processingSummary.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {processingSummary.workersProcessed > 0 && processingSummary.errors.length === 0 && (
                <Alert variant="default" className="bg-green-50 border-green-300 text-green-700">
                    <Award className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Proses Berhasil</AlertTitle>
                    <AlertDescription>Semua gaji poin pekerja yang memenuhi syarat telah berhasil diproses dan dicatat.</AlertDescription>
                </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setProcessingSummary(null)}>Tutup Ringkasan</Button>
          </CardFooter>
        </Card>
      )}

       <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle className="font-semibold">Perhatian Penting!</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1">
            <li>Proses ini hanya dapat dijalankan sekali per periode yang relevan (misalnya, sekali di awal bulan). Menjalankan berulang kali akan menambah poin gaji berulang kali.</li>
            <li>Pastikan data gaji poin bulanan untuk setiap pekerja sudah benar di halaman Manajemen Pengguna sebelum menjalankan proses ini.</li>
            <li>Pastikan akun CoA <code className="font-mono text-xs bg-muted px-1 rounded">6010 - Beban Gaji Poin Pekerja</code> dan <code className="font-mono text-xs bg-muted px-1 rounded">2020 - Utang Poin Gaji Pekerja</code> (atau yang setara) telah ada di sistem Bagan Akun Anda.</li>
            <li>Jika ada pekerja yang dokumen membernya tidak ditemukan (seperti yang dilaporkan di ringkasan jika ada error), saldo poin mereka tidak akan diperbarui. Harap periksa data keanggotaan mereka.</li>
          </ul>
        </AlertDescription>
      </Alert>

    </div>
  );
}

