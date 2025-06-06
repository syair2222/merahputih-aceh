
// src/app/(app)/admin/user-management/page.tsx
'use client';

import type { ReactNode } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import type { UserDocument, UserProfile } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Loader2, ShieldAlert, UserCog, Edit, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';

interface DisplayUser extends UserDocument {
  lastLogin?: Date | string; // For display purposes
}

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
            return "default"; // Greenish in default theme
        case 'pending':
        case 'requires_correction':
            return "secondary"; // Yellowish/Orangeish in default theme
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
  const [editingRole, setEditingRole] = useState<UserProfile['role'] | undefined>(undefined);
  const [editingStatus, setEditingStatus] = useState<UserProfile['status'] | undefined>(undefined);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

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
      const usersSnapshot = await getDocs(q);
      const usersList = usersSnapshot.docs.map(docSnap => {
        const data = docSnap.data() as UserDocument;
        let lastLoginDisplay: string | Date = 'N/A';
        if (data.lastLogin && (data.lastLogin as unknown as Timestamp).toDate) {
            lastLoginDisplay = (data.lastLogin as unknown as Timestamp).toDate();
        }
        return {
          id: docSnap.id, // Firestore document ID is typically user.uid for 'users' collection
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
            router.push('/admin/dashboard'); // Or a general access denied page
            toast({ title: "Akses Ditolak", description: "Anda tidak memiliki izin untuk halaman ini.", variant: "destructive"});
        } else {
            router.push('/login');
        }
    }
  }, [currentAdminUser, authLoading, router, fetchUsers, toast]);

  const handleEditUser = (userToEdit: DisplayUser) => {
    setSelectedUserForEdit(userToEdit);
    setEditingRole(userToEdit.role);
    setEditingStatus(userToEdit.status);
    setIsEditModalOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedUserForEdit || !editingRole || !editingStatus || !currentAdminUser || currentAdminUser.role !== 'admin_utama') {
        toast({title: "Error", description: "Data tidak lengkap atau aksi tidak diizinkan.", variant: "destructive"});
        return;
    }
    if (selectedUserForEdit.uid === currentAdminUser.uid && editingRole !== 'admin_utama') {
        toast({title: "Aksi Tidak Diizinkan", description: "Admin Utama tidak dapat mengubah perannya sendiri menjadi non-admin.", variant: "destructive"});
        return;
    }

    setIsSubmittingEdit(true);
    try {
        const userDocRef = doc(db, 'users', selectedUserForEdit.uid);
        await updateDoc(userDocRef, {
            role: editingRole,
            status: editingStatus,
            updatedAt: serverTimestamp(),
            updatedBy: currentAdminUser.uid,
        });

        // If role is changed to/from 'member', potentially update 'members' collection status too
        if (selectedUserForEdit.role !== 'member' && editingRole === 'member' && editingStatus === 'approved') {
            const memberDocRef = doc(db, 'members', selectedUserForEdit.uid);
            await updateDoc(memberDocRef, { status: 'approved', lastAdminActionTimestamp: serverTimestamp() }).catch(e => console.warn("Could not update member status for", selectedUserForEdit.uid, e));
        } else if (selectedUserForEdit.role === 'member' && editingRole !== 'member') {
             const memberDocRef = doc(db, 'members', selectedUserForEdit.uid);
             // Consider what status to set if user is no longer a 'member'
             // For now, let's assume if they are not a member, their member record status might be 'pending' or 'rejected'
             // This part might need more specific business logic.
             await updateDoc(memberDocRef, { status: 'pending', lastAdminActionTimestamp: serverTimestamp() }).catch(e => console.warn("Could not update member status for", selectedUserForEdit.uid, e));
        }


        toast({title: "Perubahan Disimpan", description: `Peran untuk ${selectedUserForEdit.displayName} telah diperbarui.`});
        setIsEditModalOpen(false);
        fetchUsers(); // Refresh list
    } catch(error) {
        console.error("Error updating user role/status:", error);
        toast({title: "Gagal Menyimpan", description: "Terjadi kesalahan.", variant: "destructive"});
    } finally {
        setIsSubmittingEdit(false);
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
                  <TableHead className="hidden lg:table-cell">Login Terakhir</TableHead>
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
                      {userDoc.lastLogin instanceof Date 
                        ? userDoc.lastLogin.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour:'2-digit', minute:'2-digit' }) 
                        : typeof userDoc.lastLogin === 'string' ? userDoc.lastLogin : 'Belum Pernah'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(userDoc)} disabled={userDoc.uid === currentAdminUser.uid && userDoc.role === 'admin_utama'}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Button>
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
                setSelectedUserForEdit(null); // Clear selection when dialog closes
            }
            setIsEditModalOpen(isOpen);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Pengguna: {selectedUserForEdit.displayName}</DialogTitle>
              <DialogDescription>Ubah peran dan status untuk pengguna ini.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role-edit" className="text-right col-span-1">Peran</Label>
                <Select
                    value={editingRole}
                    onValueChange={(value) => setEditingRole(value as UserProfile['role'])}
                    disabled={selectedUserForEdit.uid === currentAdminUser.uid && selectedUserForEdit.role === 'admin_utama'}
                >
                    <SelectTrigger id="role-edit" className="col-span-3">
                        <SelectValue placeholder="Pilih peran" />
                    </SelectTrigger>
                    <SelectContent>
                    {roleOptions.map(role => (
                        <SelectItem key={role} value={role}>{formatRole(role)}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status-edit" className="text-right col-span-1">Status</Label>
                <Select value={editingStatus} onValueChange={(value) => setEditingStatus(value as UserProfile['status'])}>
                    <SelectTrigger id="status-edit" className="col-span-3">
                        <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                    {statusOptions.map(status => (
                        <SelectItem key={status} value={status}>{formatStatus(status)}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              </div>
               {selectedUserForEdit.uid === currentAdminUser.uid && selectedUserForEdit.role === 'admin_utama' && editingRole !== 'admin_utama' && (
                    <Alert variant="destructive" className="col-span-4">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Perhatian!</AlertTitle>
                        <AlertDescription>Admin Utama tidak dapat mengubah perannya sendiri menjadi non-admin.</AlertDescription>
                    </Alert>
                )}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
              <Button onClick={handleSaveChanges} disabled={isSubmittingEdit || (selectedUserForEdit.uid === currentAdminUser.uid && selectedUserForEdit.role === 'admin_utama' && editingRole !== 'admin_utama')}>
                {isSubmittingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
