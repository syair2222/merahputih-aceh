
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { CalendarIcon, PlusCircle, Trash2, Loader2, Info, CheckCircle, AlertTriangle } from 'lucide-react'; // Added CheckCircle, AlertTriangle
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase'; // Added auth
import { collection, getDocs, query, where, orderBy, addDoc, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore'; // Added addDoc, serverTimestamp, writeBatch, doc, increment
import type { ChartOfAccountItem, Transaction, TransactionDetail } from '@/types';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth

const journalEntrySchema = z.object({
  accountId: z.string().min(1, "Akun wajib dipilih."),
  debitAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Debit harus angka positif."}).default("0"),
  creditAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Kredit harus angka positif."}).default("0"),
  notes: z.string().optional(),
}).refine(data => parseFloat(data.debitAmount) === 0 || parseFloat(data.creditAmount) === 0, {
  message: "Hanya satu antara Debit atau Kredit yang boleh diisi per baris.",
  path: ["debitAmount"], 
}).refine(data => parseFloat(data.debitAmount) > 0 || parseFloat(data.creditAmount) > 0, {
    message: "Salah satu Debit atau Kredit harus lebih besar dari 0.",
    path: ["debitAmount"],
});

const transactionFormSchema = z.object({
  transactionDate: z.date({ required_error: "Tanggal transaksi wajib diisi." }),
  description: z.string().min(5, "Deskripsi minimal 5 karakter."),
  referenceNumber: z.string().optional(),
  journalEntries: z.array(journalEntrySchema).min(2, "Minimal dua entri jurnal diperlukan (satu debit, satu kredit)."),
}).refine(data => {
  const totalDebit = data.journalEntries.reduce((sum, entry) => sum + parseFloat(entry.debitAmount || "0"), 0);
  const totalCredit = data.journalEntries.reduce((sum, entry) => sum + parseFloat(entry.creditAmount || "0"), 0);
  // Use a small epsilon for float comparison to avoid precision issues
  return Math.abs(totalDebit - totalCredit) < 0.001;
}, {
  message: "Total Debit harus sama dengan Total Kredit.",
  path: ["journalEntries"],
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export default function TransactionForm() {
  const { toast } = useToast();
  const { user } = useAuth(); // Get current user
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<ChartOfAccountItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      transactionDate: new Date(),
      description: '',
      referenceNumber: '',
      journalEntries: [
        { accountId: '', debitAmount: '0', creditAmount: '0', notes: '' },
        { accountId: '', debitAmount: '0', creditAmount: '0', notes: '' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'journalEntries',
  });

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const q = query(
        collection(db, 'chartOfAccounts'),
        where('isActive', '==', true),
        orderBy('accountId', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const activeAccounts = querySnapshot.docs.map(docSnap => ({ 
        id: docSnap.id, // Firestore document ID
        ...docSnap.data() 
      } as ChartOfAccountItem));
      setAccounts(activeAccounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast({ title: "Gagal Memuat Akun", description: "Tidak dapat mengambil daftar akun dari database.", variant: "destructive" });
    } finally {
      setLoadingAccounts(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const watchedJournalEntries = form.watch('journalEntries');
  const totalDebit = watchedJournalEntries.reduce((sum, entry) => sum + parseFloat(entry.debitAmount || "0"), 0);
  const totalCredit = watchedJournalEntries.reduce((sum, entry) => sum + parseFloat(entry.creditAmount || "0"), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;


  async function onSubmit(data: TransactionFormValues) {
    if (!user) {
      toast({ title: "Error", description: "Pengguna tidak terautentikasi.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const batch = writeBatch(db);

    try {
      // 1. Create Transaction Header
      const transactionHeaderData: Omit<Transaction, 'id'> = {
        transactionDate: data.transactionDate,
        description: data.description,
        referenceNumber: data.referenceNumber || '',
        status: 'POSTED', // Directly post for now
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        postedAt: serverTimestamp(),
        postedBy: user.uid,
        totalDebit: totalDebit,
        totalCredit: totalCredit,
      };
      const transactionRef = doc(collection(db, 'transactions'));
      batch.set(transactionRef, transactionHeaderData);

      // 2. Create Transaction Details & Update Account Balances
      for (const entry of data.journalEntries) {
        const debitAmount = parseFloat(entry.debitAmount || "0");
        const creditAmount = parseFloat(entry.creditAmount || "0");

        const detailData: Omit<TransactionDetail, 'id'> = {
          transactionId: transactionRef.id,
          accountId: entry.accountId,
          debitAmount: debitAmount,
          creditAmount: creditAmount,
          notes: entry.notes || '',
        };
        const detailRef = doc(collection(db, `transactions/${transactionRef.id}/details`));
        batch.set(detailRef, detailData);

        // Update account balance
        const account = accounts.find(acc => acc.accountId === entry.accountId);
        if (account && account.id) {
          const accountDocRef = doc(db, 'chartOfAccounts', account.id);
          let balanceChange = 0;
          if (account.normalBalance === 'DEBIT') {
            balanceChange = debitAmount - creditAmount;
          } else { // KREDIT
            balanceChange = creditAmount - debitAmount;
          }
          batch.update(accountDocRef, { balance: increment(balanceChange) });
        } else {
          throw new Error(`Akun dengan ID ${entry.accountId} tidak ditemukan atau tidak memiliki ID dokumen.`);
        }
      }

      // 3. Commit Batch
      await batch.commit();

      toast({
        title: "Transaksi Berhasil Disimpan!",
        description: "Data transaksi keuangan telah berhasil dicatat.",
      });
      form.reset({
        transactionDate: new Date(),
        description: '',
        referenceNumber: '',
        journalEntries: [
          { accountId: '', debitAmount: '0', creditAmount: '0', notes: '' },
          { accountId: '', debitAmount: '0', creditAmount: '0', notes: '' },
        ],
      });
      fetchAccounts(); // Refresh account balances if displayed on this page (not currently, but good practice)
    } catch (error: any) {
      console.error("Error saving transaction:", error);
      toast({
        title: "Gagal Menyimpan Transaksi",
        description: error.message || "Terjadi kesalahan saat menyimpan data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="transactionDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Tanggal Transaksi</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "PPP", { locale: localeID }) : <span>Pilih tanggal</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Deskripsi Transaksi</FormLabel>
                <FormControl>
                  <Textarea placeholder="Cth: Pembelian ATK bulan Januari" {...field} rows={1} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="referenceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nomor Referensi (Opsional)</FormLabel>
                <FormControl>
                  <Input placeholder="Cth: INV/2024/01/001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-accent">Entri Jurnal</h3>
          {fields.map((fieldItem, index) => ( // Renamed 'field' to 'fieldItem'
            <div key={fieldItem.id} className="grid md:grid-cols-10 gap-x-4 gap-y-2 p-4 border rounded-md relative">
              <FormField
                control={form.control}
                name={`journalEntries.${index}.accountId`}
                render={({ field }) => ( 
                  <FormItem className="md:col-span-4">
                    <FormLabel>Akun</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger disabled={loadingAccounts}>
                          <SelectValue placeholder={loadingAccounts ? "Memuat akun..." : "Pilih Akun"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.length > 0 ? accounts.map(acc => (
                          <SelectItem key={acc.id || acc.accountId} value={acc.accountId}>
                            {acc.accountId} - {acc.accountName}
                          </SelectItem>
                        )) : <div className="p-2 text-sm text-muted-foreground">Tidak ada akun aktif.</div>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`journalEntries.${index}.debitAmount`}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Debit</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} step="any" 
                       onChange={(e) => {
                           field.onChange(e.target.value);
                           if (parseFloat(e.target.value) > 0) {
                               form.setValue(`journalEntries.${index}.creditAmount`, "0");
                           }
                       }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`journalEntries.${index}.creditAmount`}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Kredit</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} step="any" 
                       onChange={(e) => {
                           field.onChange(e.target.value);
                           if (parseFloat(e.target.value) > 0) {
                               form.setValue(`journalEntries.${index}.debitAmount`, "0");
                           }
                       }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name={`journalEntries.${index}.notes`}
                render={({ field }) => (
                  <FormItem className="md:col-span-full"> 
                    <FormLabel>Catatan Entri (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Catatan spesifik untuk entri ini" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {fields.length > 2 && (
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="absolute top-1 right-1 text-destructive hover:bg-destructive/10 md:static md:col-span-1 md:self-end"
                    title="Hapus Baris Entri"
                >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only md:not-sr-only md:ml-2">Hapus</span>
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ accountId: '', debitAmount: '0', creditAmount: '0', notes: '' })}
            className="mt-2"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Baris Entri Jurnal
          </Button>
        </div>
        
        {form.formState.errors.journalEntries?.root && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Entri Jurnal</AlertTitle>
                <AlertDescription>{form.formState.errors.journalEntries.root.message}</AlertDescription>
            </Alert>
        )}


        <div className="mt-6 p-4 border rounded-md bg-muted/50">
            <div className="flex justify-between items-center font-semibold text-lg">
                <span>Total Debit:</span>
                <span>Rp {totalDebit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center font-semibold text-lg mt-1">
                <span>Total Kredit:</span>
                <span>Rp {totalCredit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {!isBalanced && totalDebit > 0 && totalCredit > 0 && (
                 <Alert variant="destructive" className="mt-3">
                    <AlertTriangle className="h-4 w-4"/>
                    <AlertTitle>Tidak Seimbang!</AlertTitle>
                    <AlertDescription>Total Debit tidak sama dengan Total Kredit.</AlertDescription>
                </Alert>
            )}
             {isBalanced && (
                 <Alert variant="default" className="mt-3 bg-green-50 border-green-300 text-green-700">
                    <CheckCircle className="h-4 w-4 text-green-600"/>
                    <AlertTitle className="text-green-800">Seimbang!</AlertTitle>
                    <AlertDescription>Total Debit dan Kredit sudah sama.</AlertDescription>
                </Alert>
            )}
        </div>


        <Button type="submit" disabled={isLoading || !isBalanced} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Simpan Transaksi
        </Button>
      </form>
    </Form>
  );
}
