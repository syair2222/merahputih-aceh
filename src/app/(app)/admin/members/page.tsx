
// src/app/(app)/admin/members/page.tsx
'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import type { MemberRegistrationData } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Eye, Loader2, ShieldAlert, Users, ArrowLeft } from 'lucide-react';

interface Member extends MemberRegistrationData {
  id: string; // Firestore document ID
}

const getStatusBadge = (status: MemberRegistrationData['status']): ReactNode => {
  switch (status) {
    case 'approved': return <Badge variant="default" className="bg-green-500 text-white">Disetujui</Badge>;
    case 'pending': return <Badge variant="secondary" className="bg-yellow-500 text-white">Menunggu</Badge>;
    case 'rejected': return <Badge variant="destructive">Ditolak</Badge>;
    case 'verified': return <Badge variant="default" className="bg-blue-500 text-white">Terverifikasi</Badge>;
    default: return <Badge variant="outline">{status || 'Tidak Diketahui'}</Badge>;
  }
};

export default function AdminMembersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas')) {
      const fetchMembers = async () => {
        setPageLoading(true);
        setError(null);
        try {
          const membersCollectionRef = collection(db, 'members');
          // Order by registrationTimestamp if available, most recent first
          const q = query(membersCollectionRef, orderBy('registrationTimestamp', 'desc'));
          const membersSnapshot = await getDocs(q);
          const membersList = membersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as MemberRegistrationData),
          })) as Member[];
          setMembers(membersList);
        } catch (err) {
          console.error("Error fetching members:", err);
          setError('Gagal memuat data anggota.');
        } finally {
          setPageLoading(false);
        }
      };
      fetchMembers();
    }
  }, [user]); // Re-fetch if user changes (though mostly for initial load after role check)

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat daftar anggota...</p>
      </div>
    );
  }

  if (!user || !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas')) {
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
          <CardTitle>Daftar Semua Anggota</CardTitle>
          <CardDescription>
            Berikut adalah daftar semua calon anggota dan anggota yang terdaftar di sistem.
            Total Anggota: {members.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 && !pageLoading ? (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertTitle>Belum Ada Anggota</AlertTitle>
              <AlertDescription>Saat ini belum ada anggota yang terdaftar.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
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
                    <TableCell className="hidden lg:table-cell">
                      {member.registrationTimestamp 
                        ? new Date((member.registrationTimestamp as any).seconds * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric'}) 
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/members/${member.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> Lihat
                        </Link>
                      </Button>
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
