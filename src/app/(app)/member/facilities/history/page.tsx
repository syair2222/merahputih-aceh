
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldAlert, Loader2, History, Eye, MessageSquare } from 'lucide-react';
import type { FacilityApplicationData } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

// Re-define statusDisplay if not exported from types (or ensure it is exported)
const statusDisplayMember: Record<FacilityApplicationData['status'], string> = {
  pending_review: 'Sedang Direview',
  pending_approval: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled_by_member: 'Dibatalkan',
  requires_correction: 'Perlu Perbaikan Data'
};

export default function MemberFacilityHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<FacilityApplicationData[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!user || user.role !== 'member') {
      setPageLoading(false);
      return;
    }
    setPageLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'facilityApplications'),
        where('userId', '==', user.uid),
        orderBy('applicationDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const appsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<FacilityApplicationData, 'id'>),
        applicationDate: (doc.data().applicationDate as Timestamp)?.toDate(),
      })) as FacilityApplicationData[];
      setApplications(appsData);
    } catch (err) {
      console.error("Error fetching member's facility applications:", err);
      setError('Gagal memuat riwayat pengajuan fasilitas Anda.');
    } finally {
      setPageLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'member') {
        router.push('/');
      } else {
        fetchApplications();
      }
    }
  }, [user, authLoading, router, fetchApplications]);

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat riwayat pengajuan...</p>
      </div>
    );
  }

  if (!user || user.role !== 'member') {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Akses Ditolak</AlertTitle><AlertDescription>Anda harus menjadi anggota untuk melihat halaman ini.</AlertDescription></Alert>
        <Button onClick={() => router.push('/')} className="mt-4">Kembali ke Beranda</Button>
      </div>
    );
  }
  
  const getStatusBadgeColor = (status: FacilityApplicationData['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'pending_review':
      case 'pending_approval': return 'bg-yellow-500';
      case 'requires_correction': return 'bg-orange-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled_by_member': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <History className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Riwayat Pengajuan Fasilitas</h1>
        </div>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor</Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Daftar Pengajuan Anda</CardTitle>
          <CardDescription>Berikut adalah semua pengajuan fasilitas yang pernah Anda buat.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
          )}
          {!error && applications.length === 0 && !pageLoading && (
            <Alert><History className="h-4 w-4" /><AlertTitle>Belum Ada Riwayat</AlertTitle><AlertDescription>Anda belum pernah membuat pengajuan fasilitas.</AlertDescription></Alert>
          )}
          {!error && applications.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis Fasilitas</TableHead>
                  <TableHead className="hidden md:table-cell">Kuantitas/Jumlah</TableHead>
                  <TableHead className="hidden lg:table-cell">Tgl. Pengajuan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.facilityType}{app.facilityType === 'Lainnya' && app.specificProductName ? ` (${app.specificProductName})` : ''}</TableCell>
                    <TableCell className="hidden md:table-cell">{app.quantityOrAmount}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {app.applicationDate instanceof Date ? app.applicationDate.toLocaleDateString('id-ID') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-white ${getStatusBadgeColor(app.status)}`}>
                        {statusDisplayMember[app.status] || app.status}
                      </Badge>
                      {app.adminComments && (app.status === 'rejected' || app.status === 'requires_correction') && (
                        <Button variant="link" size="sm" className="p-1 h-auto ml-1 text-xs" onClick={() => toast({title: `Catatan Admin untuk ${app.facilityType}`, description: app.adminComments})}>
                            <MessageSquare className="h-3 w-3 mr-1"/>Lihat Catatan
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                       {/* TODO: Create a detail view page for members as well, similar to admin's but read-only */}
                       <Button variant="outline" size="sm" onClick={() => toast({title: "Detail Pengajuan", description:"Fitur detail pengajuan untuk anggota segera hadir."})}>
                         <Eye className="mr-2 h-4 w-4" /> Lihat (Segera)
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="mt-6">
            <Button onClick={() => router.push('/member/facilities/apply')}>
              <Send className="mr-2 h-4 w-4" /> Buat Pengajuan Baru
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
