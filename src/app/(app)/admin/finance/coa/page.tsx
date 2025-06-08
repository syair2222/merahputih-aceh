
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
import type { UserProfile, ChartOfAccountItem, AccountType, NormalBalance } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Zod schema for the account form
const accountFormSchema = z.object({
  accountId: z.string().min(3, "ID Akun minimal 3 karakter.").regex(/^[0-9.-]+$/, "ID Akun hanya boleh berisi angka, titik, atau strip."),
  accountName: z.string().min(3, "Nama Akun minimal 3 karakter."),
  accountType: z.enum(['ASET', 'LIABILITAS', 'EKUITAS', 'PENDAPATAN', 'BEBAN'], {
    required_error: "Tipe Akun wajib dipilih.",
  }),
  normalBalance: z.enum(['DEBIT', 'KREDIT'], {
    required_error: "Saldo Normal wajib dipilih.",
  }),
  parentId: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});
type AccountFormValues = z.infer<typeof accountFormSchema>;

// Helper function to format account types
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
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccountItem | null>(null);

  const [accountToDelete, setAccountToDelete] = useState<ChartOfAccountItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  const allowedRoles: Array<UserProfile['role']> = ['admin_utama', 'sekertaris', 'bendahara'];

  const createForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      accountId: '', accountName: '', parentId: '', description: '', isActive: true,
    },
  });

  const editForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { // Default values for edit form will be set when modal opens
      accountId: '', accountName: '', parentId: '', description: '', isActive: true,
    },
  });

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
        router.push('/login');
      }
    }
  }, [user, authLoading, router, fetchAccounts, allowedRoles]);

  const handleCreateAccount = async (values: AccountFormValues) => {
    if (!user) {
        toast({ title: "Error", description: "Pengguna tidak terautentikasi.", variant: "destructive"});
        return;
    }
    setIsSubmittingCreate(true);
    try {
      const uniquenessQuery = query(collection(db, 'chartOfAccounts'), where('accountId', '==', values.accountId));
      const querySnapshot = await getDocs(uniquenessQuery);
      if (!querySnapshot.empty) {
        createForm.setError('accountId', { type: 'manual', message: 'ID Akun ini sudah digunakan.' });
        toast({ title: "Gagal", description: "ID Akun sudah ada.", variant: "destructive" });
        setIsSubmittingCreate(false);
        return;
      }

      const newAccount: Omit<ChartOfAccountItem, 'id' | 'balance'> = {
        accountId: values.accountId,
        accountName: values.accountName,
        accountType: values.accountType as AccountType,
        normalBalance: values.normalBalance as NormalBalance,
        parentId: values.parentId || null,
        description: values.description || '',
        isActive: values.isActive,
      };

      await addDoc(collection(db, 'chartOfAccounts'), {
        ...newAccount,
        balance: 0,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      toast({ title: "Sukses", description: `Akun "${values.accountName}" berhasil ditambahkan.` });
      setIsCreateModalOpen(false);
      createForm.reset();
      fetchAccounts();
    } catch (err) {
      console.error("Error creating account:", err);
      toast({ title: "Gagal Membuat Akun", description: "Terjadi kesalahan saat menyimpan akun.", variant: "destructive"});
    } finally {
      setIsSubmittingCreate(false);
    }
  };
  
  const openEditModal = (account: ChartOfAccountItem) => {
    setEditingAccount(account);
    editForm.reset({
        accountId: account.accountId,
        accountName: account.accountName,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        parentId: account.parentId || '',
        description: account.description || '',
        isActive: account.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAccount = async (values: AccountFormValues) => {
    if (!user || !editingAccount || !editingAccount.id) {
        toast({ title: "Error", description: "Data tidak lengkap atau pengguna tidak terautentikasi.", variant: "destructive"});
        return;
    }
    setIsSubmittingEdit(true);
    try {
        // accountId cannot be changed, so no uniqueness check needed here for it.
        const accountDocRef = doc(db, 'chartOfAccounts', editingAccount.id);
        await updateDoc(accountDocRef, {
            accountName: values.accountName,
            accountType: values.accountType,
            normalBalance: values.normalBalance,
            parentId: values.parentId || null,
            description: values.description || '',
            isActive: values.isActive,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
        });
        toast({ title: "Sukses", description: `Akun "${values.accountName}" berhasil diperbarui.`});
        setIsEditModalOpen(false);
        setEditingAccount(null);
        fetchAccounts();
    } catch (err) {
        console.error("Error updating account:", err);
        toast({ title: "Gagal Memperbarui Akun", description: "Terjadi kesalahan.", variant: "destructive"});
    } finally {
        setIsSubmittingEdit(false);
    }
  };

  const openDeleteDialog = (account: ChartOfAccountItem) => {
    setAccountToDelete(account);
  };

  const handleDeleteAccount = async () => {
    if (!user || !accountToDelete || !accountToDelete.id) {
      toast({ title: "Error", description: "Data akun tidak valid atau Anda tidak terautentikasi.", variant: "destructive" });
      return;
    }
    setIsDeleting(true);
    try {
      // TODO: Add validation: Cannot delete if balance is not zero or if transactions exist.
      // For now, direct delete.
      await deleteDoc(doc(db, 'chartOfAccounts', accountToDelete.id));
      toast({ title: "Sukses", description: `Akun "${accountToDelete.accountName}" berhasil dihapus.` });
      setAccountToDelete(null); // Close dialog
      fetchAccounts(); // Refresh list
    } catch (err) {
      console.error("Error deleting account:", err);
      toast({ title: "Gagal Menghapus Akun", description: "Terjadi kesalahan saat menghapus akun.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };


  if (authLoading || pageLoading) {
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
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button> <PlusCircle className="mr-2 h-4 w-4" /> Tambah Akun Baru </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader><DialogTitle>Tambah Akun Baru</DialogTitle><DialogDescription>Isi detail akun baru.</DialogDescription></DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateAccount)} className="space-y-4 py-4">
                  <FormField control={createForm.control} name="accountId" render={({ field }) => (<FormItem><FormLabel>ID Akun (Angka Unik)</FormLabel><FormControl><Input {...field} placeholder="Cth: 1010, 4100.1" /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={createForm.control} name="accountName" render={({ field }) => (<FormItem><FormLabel>Nama Akun</FormLabel><FormControl><Input {...field} placeholder="Cth: Kas Besar, Pendapatan Jasa" /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={createForm.control} name="accountType" render={({ field }) => (<FormItem><FormLabel>Tipe Akun</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Tipe Akun" /></SelectTrigger></FormControl><SelectContent><SelectItem value="ASET">Aset</SelectItem><SelectItem value="LIABILITAS">Liabilitas</SelectItem><SelectItem value="EKUITAS">Ekuitas</SelectItem><SelectItem value="PENDAPATAN">Pendapatan</SelectItem><SelectItem value="BEBAN">Beban</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                  <FormField control={createForm.control} name="normalBalance" render={({ field }) => (<FormItem><FormLabel>Saldo Normal</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Saldo Normal" /></SelectTrigger></FormControl><SelectContent><SelectItem value="DEBIT">Debit</SelectItem><SelectItem value="KREDIT">Kredit</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                  <FormField control={createForm.control} name="parentId" render={({ field }) => (<FormItem><FormLabel>ID Akun Induk (Opsional)</FormLabel><FormControl><Input {...field} placeholder="ID akun induk jika sub-akun" /></FormControl><FormDescription>Kosongkan jika akun utama.</FormDescription><FormMessage /></FormItem>)}/>
                  <FormField control={createForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Deskripsi (Opsional)</FormLabel><FormControl><Textarea {...field} placeholder="Deskripsi singkat akun" /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={createForm.control} name="isActive" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Akun Aktif</FormLabel><FormDescription>Nonaktifkan jika tidak digunakan.</FormDescription></div></FormItem>)}/>
                  <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Batal</Button></DialogClose><Button type="submit" disabled={isSubmittingCreate}>{isSubmittingCreate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan Akun</Button></DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button onClick={() => router.push('/admin/dashboard')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor</Button>
        </div>
      </div>

      {/* Edit Account Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => { setIsEditModalOpen(isOpen); if (!isOpen) setEditingAccount(null); }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader><DialogTitle>Edit Akun: {editingAccount?.accountName}</DialogTitle><DialogDescription>Perbarui detail akun.</DialogDescription></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateAccount)} className="space-y-4 py-4">
              <FormField control={editForm.control} name="accountId" render={({ field }) => (<FormItem><FormLabel>ID Akun (Tidak Bisa Diubah)</FormLabel><FormControl><Input {...field} readOnly className="bg-muted/50" /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={editForm.control} name="accountName" render={({ field }) => (<FormItem><FormLabel>Nama Akun</FormLabel><FormControl><Input {...field} placeholder="Cth: Kas Besar" /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={editForm.control} name="accountType" render={({ field }) => (<FormItem><FormLabel>Tipe Akun</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Tipe Akun" /></SelectTrigger></FormControl><SelectContent><SelectItem value="ASET">Aset</SelectItem><SelectItem value="LIABILITAS">Liabilitas</SelectItem><SelectItem value="EKUITAS">Ekuitas</SelectItem><SelectItem value="PENDAPATAN">Pendapatan</SelectItem><SelectItem value="BEBAN">Beban</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
              <FormField control={editForm.control} name="normalBalance" render={({ field }) => (<FormItem><FormLabel>Saldo Normal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Saldo Normal" /></SelectTrigger></FormControl><SelectContent><SelectItem value="DEBIT">Debit</SelectItem><SelectItem value="KREDIT">Kredit</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
              <FormField control={editForm.control} name="parentId" render={({ field }) => (<FormItem><FormLabel>ID Akun Induk (Opsional)</FormLabel><FormControl><Input {...field} placeholder="ID akun induk" /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={editForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Deskripsi (Opsional)</FormLabel><FormControl><Textarea {...field} placeholder="Deskripsi akun" /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={editForm.control} name="isActive" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Akun Aktif</FormLabel></div></FormItem>)}/>
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Batal</Button></DialogClose><Button type="submit" disabled={isSubmittingEdit}>{isSubmittingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan Perubahan</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Account Alert Dialog */}
      <AlertDialog open={!!accountToDelete} onOpenChange={(isOpen) => { if(!isOpen) setAccountToDelete(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda Yakin Ingin Menghapus Akun Ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun "{accountToDelete?.accountName}" (ID: {accountToDelete?.accountId}) akan dihapus secara permanen. 
              Tindakan ini tidak dapat dibatalkan. Pastikan akun ini tidak memiliki saldo atau transaksi terkait sebelum menghapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAccountToDelete(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Hapus Akun
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Card className="shadow-lg">
        <CardHeader><CardTitle className="text-xl font-headline text-accent">Daftar Akun</CardTitle><CardDescription>Kelola semua akun dalam pencatatan keuangan koperasi.</CardDescription></CardHeader>
        <CardContent>
          {error && (<Alert variant="destructive" className="mb-4"><ShieldAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)}
          
          {!error && !pageLoading && accounts.length === 0 && (
            <Alert><BookText className="h-4 w-4" /><AlertTitle>Belum Ada Akun</AlertTitle><AlertDescription>Mulai dengan menambahkan akun baru.</AlertDescription></Alert>
          )}
          
          {!error && !pageLoading && accounts.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>ID Akun</TableHead><TableHead>Nama Akun</TableHead><TableHead className="hidden md:table-cell">Tipe</TableHead><TableHead className="hidden sm:table-cell">Saldo Normal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id || account.accountId}>
                    <TableCell className="font-mono">{account.accountId}</TableCell>
                    <TableCell className="font-medium">{account.accountName}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatAccountType(account.accountType)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{account.normalBalance}</TableCell>
                    <TableCell><Badge variant={account.isActive ? 'default' : 'secondary'} className={account.isActive ? 'bg-green-500 text-white' : ''}>{account.isActive ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(account)}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(account)}><Trash2 className="mr-1 h-3 w-3" /> Hapus</Button>
                      </AlertDialogTrigger>
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

