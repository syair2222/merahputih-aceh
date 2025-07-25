
// src/app/(app)/admin/user-management/page.tsx
'use client';

import type { ReactNode } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, Timestamp, doc, updateDoc, serverTimestamp, deleteDoc, type DocumentData, getDoc as getFirestoreDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import type { UserDocument, UserProfile } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Loader2, ShieldAlert, UserCog, Edit, Save, Trash2, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import * as z from 'zod';
import { Input } from '@/components/ui/input';


interface DisplayUser extends UserDocument {
  lastLogin?: Date | string;
}

// Define the form schema using Zod
const formSchema = z.object({
  role: z.enum([
    'admin_utama', 'sekertaris', 'bendahara', 'dinas', 'member',
    'prospective_member', 'bank_partner_admin', 'related_agency_admin'
  ]),
  status: z.enum(['pending', 'approved', 'rejected', 'verified', 'requires_correction']),
  isWorker: z.boolean().default(false),
  workerDepartment: z.string().nullable().optional(),
  monthlyPointSalary: z.union([z.number().int().min(0), z.literal('')]).nullable().optional().transform(e => e === '' ? null : e),
});

const roleOptions: UserProfile['role'][] = [
  'admin_utama',
  'sekertaris',
  'bendahara',
  'dinas',
  'member',
  'prospective_member',
  'bank_partner_admin',
  'related_agency_admin',
];

const statusOptions: UserProfile['status'][] = [
    'pending',
    'approved',
    'rejected',
    'verified',
    'requires_correction',
];

function formatRole(role?: UserProfile['role']): string {
  if (!role) return 'Tidak Diketahui';
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatStatus(status?: UserProfile['status']): string {
    if (!status) return 'Tidak Ada';
    switch (status) {
        case 'pending': return 'Menunggu';
        case 'approved': return 'Disetujui';
        case 'rejected': return 'Ditolak';
        case 'verified': return 'Terverifikasi';
        case 'requires_correction': return 'Perlu Koreksi';
        default: return status;
    }
}

const getRoleBadgeVariant = (role?: UserProfile['role']): "default" | "secondary" | "destructive" | "outline" => {
    if (!role) return "outline";
    if (role.includes('admin')) return "default";
    if (role === 'member') return "secondary";
    if (role === 'prospective_member') return "outline";
    return "secondary";
};

const getStatusBadgeVariant = (status?: UserProfile['status']): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return "outline";
    switch (status) {
        case 'approved':
        case 'verified':
            return "default";
        case 'pending':
        case 'requires_correction':
            return "secondary";
        case 'rejected':
            return "destructive";
        default:
            return "outline";
    }
};


export default function UserManagementPage() {
  const { user: currentAdminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<DisplayUser | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [userToDelete, setUserToDelete] = useState<DisplayUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);


  const fetchUsers = useCallback(async () => {
    if (!currentAdminUser || currentAdminUser.role !== 'admin_utama') {
       setPageLoading(false);
       return;
    }
    setPageLoading(true);
    setError(null);
    try {
      const usersCollectionRef = collection(db, 'users');
      const q = query(usersCollectionRef, orderBy('displayName', 'asc'));
      const usersSnapshot = await getDocs(usersCollectionRef); // Corrected: use getDocs with usersCollectionRef
      const usersList = usersSnapshot.docs.map(docSnap => {
        const data = docSnap.data() as UserDocument;
        let lastLoginDisplay: string | Date = 'N/A';
        if (data.lastLogin && (data.lastLogin as unknown as Timestamp).toDate) {
            lastLoginDisplay = (data.lastLogin as unknown as Timestamp).toDate();
        }
        return {
          id: docSnap.id,
          ...data,
          lastLogin: lastLoginDisplay,
        };
      }) as DisplayUser[];
      setUsers(usersList);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError('Gagal memuat data pengguna.');
      toast({ title: "Error", description: "Gagal memuat data pengguna.", variant: "destructive" });
    } finally {
      setPageLoading(false);
    }
  }, [currentAdminUser, toast]);

  useEffect(() => {
    if (!authLoading) {
        if (currentAdminUser && currentAdminUser.role === 'admin_utama') {
            fetchUsers();
        } else if (currentAdminUser) {
            router.push('/admin/dashboard');
            toast({ title: "Akses Ditolak", description: "Anda tidak memiliki izin untuk halaman ini.", variant: "destructive"});
        } else {
            router.push('/login');
        }
    }
  }, [currentAdminUser, authLoading, router, fetchUsers, toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: 'member',
      status: 'pending',
      isWorker: false,
      workerDepartment: '',
      monthlyPointSalary: '',
    },
  });

  const { reset, handleSubmit: handleRHFSubmit, watch, getValues } = form; // Added getValues
  const editingIsWorker = watch('isWorker');

  const handleEditUser = (userToEdit: DisplayUser) => {
    setSelectedUserForEdit(userToEdit);
    reset({
        role: userToEdit.role,
        status: userToEdit.status,
        isWorker: userToEdit.isWorker || false,
        workerDepartment: userToEdit.workerDepartment || '',
        monthlyPointSalary: userToEdit.monthlyPointSalary !== undefined && userToEdit.monthlyPointSalary !== null ? userToEdit.monthlyPointSalary : '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveChanges = async (formData: z.infer<typeof formSchema>) => {
    if (!selectedUserForEdit || !currentAdminUser || currentAdminUser.role !== 'admin_utama') {
        toast({title: "Error", description: "Data pengguna tidak dipilih atau aksi tidak diizinkan.", variant: "destructive"});
        return;
    }
    if (selectedUserForEdit.uid === currentAdminUser.uid && formData.role !== 'admin_utama') {
        toast({title: "Aksi Tidak Diizinkan", description: "Admin Utama tidak dapat mengubah perannya sendiri menjadi non-admin.", variant: "destructive"});
        return;
    }

    setIsSubmittingEdit(true);
    try {
        const userDocRef = doc(db, 'users', selectedUserForEdit.uid);

        const updatePayload: DocumentData = {
            role: formData.role,
            status: formData.status,
            isWorker: formData.isWorker,
            updatedAt: serverTimestamp(),
            updatedBy: currentAdminUser.uid,
        };

        if (formData.isWorker) {
            updatePayload.workerDepartment = formData.workerDepartment?.trim() || null;
            updatePayload.monthlyPointSalary = formData.monthlyPointSalary; // Already transformed by Zod
        } else {
            updatePayload.workerDepartment = null;
            updatePayload.monthlyPointSalary = null;
        }

        await updateDoc(userDocRef, updatePayload);

        // Logic for updating 'members' collection status
        const memberDocRef = doc(db, 'members', selectedUserForEdit.uid);
        const memberDocSnap = await getFirestoreDoc(memberDocRef); // Use getFirestoreDoc

        if (selectedUserForEdit.role !== 'member' && formData.role === 'member' && formData.status === 'approved') {
            if (memberDocSnap.exists()) {
                await updateDoc(memberDocRef, { status: 'approved', lastAdminActionTimestamp: serverTimestamp() });
            } else {
                console.warn(`User ${selectedUserForEdit.uid} set to member/approved, but no corresponding document in 'members' collection found.`);
            }
        } else if (selectedUserForEdit.role === 'member' && formData.role !== 'member') {
             if (memberDocSnap.exists()) {
                await updateDoc(memberDocRef, { status: 'pending', lastAdminActionTimestamp: serverTimestamp() });
             }
        }

        toast({title: "Perubahan Disimpan", description: `Data untuk ${selectedUserForEdit.displayName} telah diperbarui.`});
        setIsEditModalOpen(false);
        fetchUsers();
    } catch(error) {
        console.error("Error updating user data:", error);
        toast({title: "Gagal Menyimpan", description: "Terjadi kesalahan.", variant: "destructive"});
    } finally {
        setIsSubmittingEdit(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !currentAdminUser || currentAdminUser.role !== 'admin_utama') {
      toast({ title: "Error", description: "Data pengguna tidak ditemukan atau aksi tidak diizinkan.", variant: "destructive" });
      return;
    }
    if (userToDelete.uid === currentAdminUser.uid) {
      toast({ title: "Aksi Tidak Diizinkan", description: "Admin Utama tidak dapat menghapus akunnya sendiri.", variant: "destructive" });
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));

      try {
        await deleteDoc(doc(db, 'members', userToDelete.uid));
      } catch (memberDeleteError) {
        console.warn(`Could not delete member record for ${userToDelete.uid} (may not exist):`, memberDeleteError);
      }

      if (userToDelete.username && typeof userToDelete.username === 'string' && userToDelete.username.trim() !== '') {
        try {
          await deleteDoc(doc(db, 'usernames', userToDelete.username.toLowerCase()));
        } catch (usernameDeleteError) {
          console.warn(`Could not delete username record for ${userToDelete.username} (may not exist or invalid path):`, usernameDeleteError);
        }
      }

      toast({ title: "Pengguna Dihapus", description: `Data untuk ${userToDelete.displayName || userToDelete.email} berhasil dihapus.` });
      setUsers(prev => prev.filter(u => u.uid !== userToDelete.uid));
      setUserToDelete(null);
    } catch (err) {
      console.error("Error deleting user:", err);
      toast({ title: "Gagal Menghapus", description: "Terjadi kesalahan saat menghapus data pengguna.", variant: "destructive" });
    } finally {
      setIsDeletingUser(false);
    }
  };


  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat manajemen pengguna...</p>
      </div>
    );
  }

  if (!currentAdminUser || currentAdminUser.role !== 'admin_utama') {
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
          <UserCog className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Manajemen Pengguna & Peran</h1>
        </div>
         <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle>Daftar Pengguna Sistem</CardTitle>
            <CardDescription>
                Kelola pengguna, peran, dan status akun dalam sistem. Total Pengguna: {users.length}
            </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {users.length === 0 && !pageLoading && !error ? (
            <Alert>
              <UserCog className="h-4 w-4" />
              <AlertTitle>Tidak Ada Pengguna</AlertTitle>
              <AlertDescription>Belum ada pengguna yang terdaftar di sistem.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Pengguna</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead className="hidden sm:table-cell">Status Akun</TableHead>
                  <TableHead className="hidden lg:table-cell">Pekerja?</TableHead>
                  <TableHead className="hidden lg:table-cell">Departemen</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Gaji Poin</TableHead>
                  <TableHead className="hidden xl:table-cell">Login Terakhir</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userDoc) => (
                  <TableRow key={userDoc.uid}>
                    <TableCell className="font-medium">{userDoc.displayName || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{userDoc.email || 'N/A'}</TableCell>
                    <TableCell>
                        <Badge variant={getRoleBadgeVariant(userDoc.role)} className={userDoc.role?.includes('admin') ? 'bg-primary text-primary-foreground' : ''}>
                            {formatRole(userDoc.role)}
                        </Badge>
                    </TableCell>
                     <TableCell className="hidden sm:table-cell">
                        <Badge variant={getStatusBadgeVariant(userDoc.status)} className={userDoc.status === 'approved' || userDoc.status === 'verified' ? 'bg-green-500 text-white' : userDoc.status === 'rejected' ? 'bg-red-500 text-white' : userDoc.status === 'requires_correction' ? 'bg-orange-500 text-white' : ''}>
                            {formatStatus(userDoc.status)}
                        </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                        {userDoc.isWorker ? <Badge className="bg-blue-500 text-white"><Briefcase className="mr-1 h-3 w-3"/>Ya</Badge> : <Badge variant="outline">Tidak</Badge>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{userDoc.isWorker && userDoc.workerDepartment ? userDoc.workerDepartment : '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right font-mono">
                        {userDoc.isWorker && userDoc.monthlyPointSalary !== undefined && userDoc.monthlyPointSalary !== null ? userDoc.monthlyPointSalary.toLocaleString('id-ID') : '-'}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {userDoc.lastLogin instanceof Date
                        ? userDoc.lastLogin.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour:'2-digit', minute:'2-digit' })
                        : typeof userDoc.lastLogin === 'string' ? userDoc.lastLogin : 'Belum Pernah'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(userDoc)} disabled={userDoc.uid === currentAdminUser?.uid && userDoc.role === 'admin_utama'}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      {currentAdminUser && userDoc.uid !== currentAdminUser.uid && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={() => setUserToDelete(userDoc)} disabled={isDeletingUser}>
                              <Trash2 className="mr-1 h-3 w-3" /> Hapus
                            </Button>
                          </AlertDialogTrigger>
                          {userToDelete && userToDelete.uid === userDoc.uid && (
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Anda Yakin Ingin Menghapus Pengguna Ini?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tindakan ini akan menghapus pengguna "{userToDelete.displayName || userToDelete.email}" secara permanen dari sistem.
                                  Ini juga akan menghapus data anggota terkait (jika ada) dan username. Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setUserToDelete(null)}>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90" disabled={isDeletingUser}>
                                  {isDeletingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Ya, Hapus Pengguna
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          )}
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedUserForEdit && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setSelectedUserForEdit(null);
                reset();
            }
            setIsEditModalOpen(isOpen);
        }}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Edit Pengguna: {selectedUserForEdit.displayName}</DialogTitle>
              <DialogDescription>Ubah peran, status, dan detail pekerja untuk pengguna ini.</DialogDescription>
               {selectedUserForEdit.uid === currentAdminUser?.uid && selectedUserForEdit.role === 'admin_utama' && form.watch('role') !== 'admin_utama' && (
                    <Alert variant="destructive" className="col-span-4">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Perhatian!</AlertTitle>
                        <AlertDescription>Admin Utama tidak dapat mengubah perannya sendiri menjadi non-admin.</AlertDescription>
                    </Alert>
                )}
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={handleRHFSubmit(handleSaveChanges)} className="grid gap-4 py-4">

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right col-span-1">Peran</FormLabel>
                      <FormControl className="col-span-3">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={selectedUserForEdit.uid === currentAdminUser?.uid && selectedUserForEdit.role === 'admin_utama'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih peran" />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map(role => (
                              <SelectItem key={role} value={role}>{formatRole(role)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="col-span-4 col-start-1 text-right" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right col-span-1">Status</FormLabel>
                      <FormControl className="col-span-3">
                         <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih status" />
                            </SelectTrigger>
                            <SelectContent>
                            {statusOptions.map(status => (
                                <SelectItem key={status} value={status}>{formatStatus(status)}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                      </FormControl>
                       <FormMessage className="col-span-4 col-start-1 text-right" />
                    </FormItem>
                  )}
                />

                <FormField
                   control={form.control}
                   name="isWorker"
                   render={({ field }) => (
                     <FormItem className="grid grid-cols-4 items-center gap-4">
                       <FormLabel className="text-right col-span-1">Pekerja Koperasi</FormLabel>
                       <div className="col-span-3 flex items-center space-x-2">
                         <FormControl>
                           <Checkbox
                             checked={field.value}
                             onCheckedChange={field.onChange}
                           />
                         </FormControl>
                         <FormDescription>Tandai jika pengguna ini adalah pekerja aktif koperasi.</FormDescription>
                       </div>
                        <FormMessage className="col-span-4 col-start-1 text-right" />
                     </FormItem>
                   )}
                 />

                {editingIsWorker && (
                  <>
                    <FormField
                      control={form.control}
                      name="workerDepartment"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                          <FormLabel className="text-right col-span-1">Departemen</FormLabel>
                          <FormControl className="col-span-3">
                            <Input placeholder="Cth: Keuangan, Pemasaran" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage className="col-span-4 col-start-1 text-right" />
                        </FormItem>
                      )}
                    />

                     <FormField
                       control={form.control}
                       name="monthlyPointSalary"
                       render={({ field }) => (
                         <FormItem className="grid grid-cols-4 items-center gap-4">
                           <FormLabel className="text-right col-span-1">Gaji Poin Bulanan</FormLabel>
                           <FormControl className="col-span-3">
                             <Input
                               type="number"
                               placeholder="Cth: 50000"
                               {...field}
                               value={field.value !== null && field.value !== undefined ? String(field.value) : ''}
                               onChange={e => {
                                 const value = e.target.value;
                                 field.onChange(value === '' ? '' : Number(value));
                               }}
                             />
                           </FormControl>
                           <FormMessage className="col-span-4 col-start-1 text-right" />
                         </FormItem>
                       )}
                     />
                  </>
                )}


                 <DialogFooter className="col-span-4 pt-4">
                   <DialogClose asChild><Button type="button" variant="outline">Batal</Button></DialogClose>
                   <Button type="submit" disabled={isSubmittingEdit || (selectedUserForEdit.uid === currentAdminUser?.uid && selectedUserForEdit.role === 'admin_utama' && getValues('role') !== 'admin_utama')}>
                     {isSubmittingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Simpan Perubahan
                   </Button>
                 </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

