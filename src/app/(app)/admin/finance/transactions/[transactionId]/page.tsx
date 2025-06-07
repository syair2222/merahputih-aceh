
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldAlert, Loader2, FileText, CalendarDays, User, Tag, Hash, CheckCircle, CircleAlert, Type } from 'lucide-react';
import type { UserProfile, Transaction, TransactionDetail, ChartOfAccountItem } from '@/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

interface EnrichedTransactionDetail extends TransactionDetail {
  accountName?: string;
  accountType?: ChartOfAccountItem['accountType'];
}

interface EnrichedTransaction extends Transaction {
  details: EnrichedTransactionDetail[];
}

const DetailItem: React.FC<{ label: string; value?: string | React.ReactNode; icon?: React.ElementType }> = ({ label, value, icon: Icon }) => (
  <div className="flex flex-col">
    <dt className="text-sm font-medium text-muted-foreground flex items-center">
      {Icon && <Icon className="h-4 w-4 mr-2 text-primary" />}
      {label}
    </dt>
    <dd className="mt-1 text-md text-foreground sm:mt-0">{value || '-'}</dd>
  </div>
);

export default function TransactionDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const transactionId = params.transactionId as string;
  const { toast } = useToast();

  const [transaction, setTransaction] = useState<EnrichedTransaction | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowedRoles: Array<UserProfile['role']> = ['admin_utama', 'sekertaris', 'bendahara'];

  const fetchTransactionDetails = useCallback(async () => {
    if (!transactionId) {
      setError("ID Transaksi tidak valid.");
      setPageLoading(false);
      return;
    }
    setPageLoading(true);
    setError(null);
    try {
      // Fetch transaction header
      const transactionDocRef = doc(db, 'transactions', transactionId);
      const transactionDocSnap = await getDoc(transactionDocRef);

      if (!transactionDocSnap.exists()) {
        setError('Data transaksi tidak ditemukan.');
        setPageLoading(false);
        return;
      }
      const transactionData = { id: transactionDocSnap.id, ...transactionDocSnap.data() } as Transaction;

      // Fetch transaction details (journal entries)
      const detailsCollectionRef = collection(db, `transactions/${transactionId}/details`);
      const detailsSnapshot = await getDocs(detailsCollectionRef);
      const detailsData = detailsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransactionDetail));

      // Fetch account names for details
      const accountIds = [...new Set(detailsData.map(d => d.accountId))];
      const accountsData: Record<string, { name: string, type: ChartOfAccountItem['accountType'] }> = {};
      if (accountIds.length > 0) {
        // Firestore 'in' query limit is 10, chunk if necessary (not shown for brevity here, assuming <10 unique accounts per tx)
         const accountsQuery = query(collection(db, 'chartOfAccounts'), where('accountId', 'in', accountIds));
         const accountsSnapshot = await getDocs(accountsQuery);
         accountsSnapshot.forEach(accDoc => {
           const accData = accDoc.data() as ChartOfAccountItem;
           accountsData[accData.accountId] = { name: accData.accountName, type: accData.accountType };
         });
      }
      
      const enrichedDetails = detailsData.map(detail => ({
        ...detail,
        accountName: accountsData[detail.accountId]?.name || 'Akun Tidak Ditemukan',
        accountType: accountsData[detail.accountId]?.type,
      }));

      setTransaction({
        ...transactionData,
        details: enrichedDetails,
        transactionDate: (transactionData.transactionDate as Timestamp)?.toDate ? (transactionData.transactionDate as Timestamp).toDate() : new Date(transactionData.transactionDate),
        createdAt: (transactionData.createdAt as Timestamp)?.toDate ? (transactionData.createdAt as Timestamp).toDate() : new Date(transactionData.createdAt),
        postedAt: (transactionData.postedAt as Timestamp)?.toDate ? (transactionData.postedAt as Timestamp).toDate() : transactionData.postedAt ? new Date(transactionData.postedAt) : undefined,
      });

    } catch (err) {
      console.error("Error fetching transaction details:", err);
      setError('Gagal memuat detail transaksi.');
      toast({ title: "Error", description: "Gagal memuat detail transaksi.", variant: "destructive" });
    } finally {
      setPageLoading(false);
    }
  }, [transactionId, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (user && allowedRoles.includes(user.role)) {
        fetchTransactionDetails();
      } else if (user) {
        router.push('/admin/dashboard'); // Redirect if not authorized
      } else {
        router.push('/login'); // Redirect if not logged in
      }
    }
  }, [user, authLoading, router, fetchTransactionDetails, allowedRoles]);

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat detail transaksi...</p>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
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

  if (error) {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        <Button onClick={() => router.push('/admin/finance/transactions')} variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar</Button>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="text-center p-10">
        <Alert><CircleAlert className="h-4 w-4" /><AlertTitle>Data Tidak Ditemukan</AlertTitle><AlertDescription>Transaksi yang Anda cari tidak ditemukan.</AlertDescription></Alert>
        <Button onClick={() => router.push('/admin/finance/transactions')} variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar</Button>
      </div>
    );
  }

  const formatTransactionStatus = (status?: Transaction['status']) => {
    if (!status) return { text: 'Tidak Diketahui', variant: 'outline' as const, Icon: CircleAlert };
    switch (status) {
      case 'DRAFT': return { text: 'Draft', variant: 'secondary' as const, Icon: FileText };
      case 'POSTED': return { text: 'Posted', variant: 'default' as const, Icon: CheckCircle };
      case 'VOID': return { text: 'Void', variant: 'destructive' as const, Icon: CircleAlert };
      default: return { text: status, variant: 'outline' as const, Icon: CircleAlert };
    }
  };
  const statusInfo = formatTransactionStatus(transaction.status);


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <FileText className="mr-3 h-8 w-8" /> Detail Transaksi
        </h1>
        <Button onClick={() => router.push('/admin/finance/transactions')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Transaksi
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="bg-muted/30">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-headline text-accent">
                {transaction.description || 'Transaksi Tanpa Deskripsi'}
              </CardTitle>
              <CardDescription>ID Transaksi: {transaction.id}</CardDescription>
            </div>
            <Badge variant={statusInfo.variant} className={statusInfo.variant === 'default' ? 'bg-green-500 text-white' : ''}>
              <statusInfo.Icon className="mr-1.5 h-4 w-4" /> {statusInfo.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
            <DetailItem label="Tanggal Transaksi" value={transaction.transactionDate instanceof Date ? format(transaction.transactionDate, "PPP", { locale: localeID }) : 'N/A'} icon={CalendarDays} />
            <DetailItem label="Nomor Referensi" value={transaction.referenceNumber} icon={Hash} />
            <DetailItem label="Total Debit" value={`Rp ${(transaction.totalDebit ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={Type} />
            <DetailItem label="Total Kredit" value={`Rp ${(transaction.totalCredit ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={Type} />
            <DetailItem label="Dibuat Oleh (ID)" value={transaction.createdBy} icon={User} />
            <DetailItem label="Dibuat Pada" value={transaction.createdAt instanceof Date ? format(transaction.createdAt, "PPP p", { locale: localeID }) : 'N/A'} icon={CalendarDays} />
            {transaction.status === 'POSTED' && (
              <>
                <DetailItem label="Diposting Oleh (ID)" value={transaction.postedBy} icon={User} />
                <DetailItem label="Diposting Pada" value={transaction.postedAt instanceof Date ? format(transaction.postedAt, "PPP p", { locale: localeID }) : 'N/A'} icon={CalendarDays} />
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Jurnal Entri</CardTitle>
        </CardHeader>
        <CardContent>
          {transaction.details.length === 0 ? (
            <Alert variant="default">
                <CircleAlert className="h-4 w-4" />
                <AlertTitle>Tidak Ada Detail Entri</AlertTitle>
                <AlertDescription>Tidak ada detail entri jurnal yang tercatat untuk transaksi ini.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Akun</TableHead>
                  <TableHead>Nama Akun</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Kredit</TableHead>
                  <TableHead className="hidden md:table-cell">Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaction.details.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell className="font-mono">{detail.accountId}</TableCell>
                    <TableCell>{detail.accountName}</TableCell>
                    <TableCell className="text-right font-mono">
                      {(detail.debitAmount ?? 0) > 0 ? (detail.debitAmount ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(detail.creditAmount ?? 0) > 0 ? (detail.creditAmount ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{detail.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
         <CardFooter className="border-t pt-4 flex justify-end">
            {/* Placeholder for future actions like "Void Transaction" or "Edit Transaction" (if status allows) */}
             <Button variant="secondary" disabled>Void Transaksi (Segera Hadir)</Button>
         </CardFooter>
      </Card>
    </div>
  );
}

    