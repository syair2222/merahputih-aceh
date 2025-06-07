
// src/app/(app)/admin/members/page.tsx
'use client';

import type { ReactNode } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, where, QueryConstraint, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import type { MemberRegistrationData } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Eye, Loader2, ShieldAlert, Users, ArrowLeft, Filter, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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


interface Member extends MemberRegistrationData {
  id: string; // Firestore document ID
}

type MemberStatusFilter = MemberRegistrationData['status'] | 'all';

const statusDisplayMap: Record<MemberRegistrationData['status'], string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  verified: 'Terverifikasi',
  requires_correction: 'Perlu Perbaikan',
};


const getStatusBadge = (status?: MemberRegistrationData['status']): ReactNode => {
  if (!status) return <Badge variant="outline">Tidak Diketahui</Badge>;
  switch (status) {
    case 'approved': return <Badge variant="default" className="bg-green-500 text-white hover:bg-green-600">{statusDisplayMap[status]}</Badge>;
    case 'pending': return <Badge variant="secondary" className="bg-yellow-500 text-white hover:bg-yellow-600">{statusDisplayMap[status]}</Badge>;
    case 'rejected': return <Badge variant="destructive" className="bg-red-500 text-white hover:bg-red-600">{statusDisplayMap[status]}</Badge>;
    case 'verified': return <Badge variant="default" className="bg-blue-500 text-white hover:bg-blue-600">{statusDisplayMap[status]}</Badge>;
    case 'requires_correction': return <Badge variant="default" className="bg-orange-500 text-white hover:bg-orange-600">{statusDisplayMap[status]}</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export default function AdminMembersPage() {
  const { user: adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>("all");
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);


  const fetchMembers = useCallback(async () => {
    if (!adminUser || !(adminUser.role === 'admin_utama' || adminUser.role === 'sekertaris' || adminUser.role === 'bendahara' || adminUser.role === 'dinas' || adminUser.role === 'bank_partner_admin')) {
       setPageLoading(false);
       return;
    }
    setPageLoading(true);
    setError(null);
    try {
      const membersCollectionRef = collection(db, 'members');
      const qConstraints: QueryConstraint[] = [orderBy('registrationTimestamp', 'desc')];
      
      if (statusFilter !== "all") {
        qConstraints.push(where("status", "==", statusFilter));
      }
      
      const q = query(membersCollectionRef, ...qConstraints);
      const membersSnapshot = await getDocs(q);
      const membersList = membersSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as MemberRegistrationData),
      })) as Member[];
      setMembers(membersList);
    } catch (err) {
      console.error("Error fetching members:", err);
      setError('Gagal memuat data anggota.');
    } finally {
      setPageLoading(false);
    }
  }, [adminUser, statusFilter]);


  useEffect(() => {
    if (authLoading) return; 

    if (adminUser && (adminUser.role === 'admin_utama' || adminUser.role === 'sekertaris' || adminUser.role === 'bendahara' || adminUser.role === 'dinas' || adminUser.role === 'bank_partner_admin')) {
        fetchMembers();
    } else if (adminUser) {
        router.push('/'); 
    } else {
        router.push('/login'); 
    }
  }, [adminUser, authLoading, router, fetchMembers]);

  const handleDeleteMember = async () => {
    if (!memberToDelete || !adminUser) {
      toast({ title: "Error", description: "Data anggota tidak ditemukan atau aksi tidak diizinkan.", variant: "destructive" });
      return;
    }

    if (adminUser.role !== 'admin_utama') {
        toast({ title: "Akses Ditolak", description: "Hanya Admin Utama yang dapat menghapus data anggota.", variant: "destructive"});
        setMemberToDelete(null);
        return;
    }

    try {
      await deleteDoc(doc(db, 'members', memberToDelete.id));
      await deleteDoc(doc(db, 'users', memberToDelete.id));
      if (memberToDelete.username) {
        await deleteDoc(doc(db, 'usernames', memberToDelete.username.toLowerCase()));
      }

      toast({ title: "Anggota Dihapus", description: `Data untuk ${memberToDelete.fullName} berhasil dihapus.` });
      setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
      setMemberToDelete(null);
    } catch (err) {
      console.error("Error deleting member:", err);
      toast({ title: "Gagal Menghapus", description: "Terjadi kesalahan saat menghapus data anggota.", variant: "destructive" });
    }
  };


  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat daftar anggota...</p>
      </div>
    );
  }

  if (!adminUser || !(adminUser.role === 'admin_utama' || adminUser.role === 'sekertaris' || adminUser.role === 'bendahara' || adminUser.role === 'dinas' || adminUser.role === 'bank_partner_admin')) {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-4">Kembali ke Beranda</Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
         <Button onClick={() => router.back()} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </div>
    );
  }
  
  const canDelete = adminUser.role === 'admin_utama';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Manajemen Anggota</h1>
        </div>
         <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Daftar Anggota & Calon Anggota</CardTitle>
                <CardDescription>
                    Berikut adalah daftar semua calon anggota dan anggota yang terdaftar. Total: {members.length}
                </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter Status: {statusFilter === 'all' ? 'Semua' : statusDisplayMap[statusFilter as MemberRegistrationData['status']]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Filter Berdasarkan Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as MemberStatusFilter)}>
                  <DropdownMenuRadioItem value="all">Semua Status</DropdownMenuRadioItem>
                  {Object.keys(statusDisplayMap).map(sKey => (
                    <DropdownMenuRadioItem key={sKey} value={sKey}>{statusDisplayMap[sKey as MemberRegistrationData['status']]}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 && !pageLoading ? (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertTitle>Belum Ada Anggota</AlertTitle>
              <AlertDescription>Saat ini belum ada anggota yang terdaftar dengan filter yang dipilih.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">No. Anggota</TableHead>
                  <TableHead className="hidden lg:table-cell">Tgl. Daftar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.fullName || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{member.email || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{member.memberIdNumber || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {member.registrationTimestamp 
                        ? new Date((member.registrationTimestamp as any).seconds * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric'}) 
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/members/${member.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> Lihat Detail
                        </Link>
                      </Button>
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={() => setMemberToDelete(member)}>
                              <Trash2 className="mr-1 h-3 w-3" /> Hapus
                            </Button>
                          </AlertDialogTrigger>
                          {memberToDelete && memberToDelete.id === member.id && (
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Anda Yakin Ingin Menghapus?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tindakan ini akan menghapus data anggota "{memberToDelete.fullName}" secara permanen dari sistem. 
                                  Ini juga akan menghapus data pengguna terkait dan username. Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setMemberToDelete(null)}>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive hover:bg-destructive/90">
                                  Ya, Hapus Data
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
    </div>
  );
}

    

    
