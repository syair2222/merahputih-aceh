
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
import { ArrowLeft, ShieldAlert, Loader2, DollarSign, Eye, Filter } from 'lucide-react';
import type { FacilityApplicationData } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, Timestamp, where, QueryConstraint } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


type ApplicationStatusFilter = FacilityApplicationData['status'] | 'all';

const statusDisplay: Record<FacilityApplicationData['status'], string> = {
  pending_review: 'Menunggu Review',
  pending_approval: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled_by_member: 'Dibatalkan Anggota',
  requires_correction: 'Perlu Perbaikan'
};


export default function AdminFacilitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<FacilityApplicationData[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<ApplicationStatusFilter>("all")


  const fetchApplications = useCallback(async () => {
    if (!user || !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas' || user.role === 'bank_partner_admin')) {
      setPageLoading(false);
      return;
    }
    setPageLoading(true);
    setError(null);
    try {
      const qConstraints: QueryConstraint[] = [orderBy('applicationDate', 'desc')];
      
      if (statusFilter !== "all") {
        qConstraints.push(where("status", "==", statusFilter));
      }

      // Filter by targetEntityType based on user role
      if (user.role === 'bank_partner_admin') {
        qConstraints.push(where("targetEntityType", "in", ["BANK_MITRA", "UMUM_BELUM_DITENTUKAN"]));
      } else if (user.role === 'dinas') {
        qConstraints.push(where("targetEntityType", "in", ["DINAS_TERKAIT", "UMUM_BELUM_DITENTUKAN"]));
      }
      // Roles 'admin_utama', 'sekertaris', 'bendahara' will not have targetEntityType filter by default, seeing all based on status.

      const q = query(collection(db, 'facilityApplications'), ...qConstraints);
      const querySnapshot = await getDocs(q);
      const appsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<FacilityApplicationData, 'id'>),
        applicationDate: (doc.data().applicationDate as Timestamp)?.toDate(), // Convert Firestore Timestamp
      })) as FacilityApplicationData[];
      setApplications(appsData);
    } catch (err) {
      console.error("Error fetching facility applications:", err);
      setError('Gagal memuat data pengajuan fasilitas.');
    } finally {
      setPageLoading(false);
    }
  }, [user, statusFilter]);


  useEffect(() => {
    if (!authLoading) {
      if (!user || !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas' || user.role === 'bank_partner_admin')) {
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
        <p className="ml-4 text-lg text-muted-foreground">Memuat data pengajuan...</p>
      </div>
    );
  }

  if (!user || !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas' || user.role === 'bank_partner_admin')) {
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
          <DollarSign className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Manajemen Pengajuan Fasilitas</h1>
        </div>
        <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Admin
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-headline text-accent">Daftar Pengajuan Fasilitas Anggota</CardTitle>
              <CardDescription>Tinjau dan kelola pengajuan fasilitas dari anggota koperasi.</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter Status: {statusFilter === 'all' ? 'Semua' : statusDisplay[statusFilter as FacilityApplicationData['status']]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Filter Berdasarkan Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApplicationStatusFilter)}>
                  <DropdownMenuRadioItem value="all">Semua Status</DropdownMenuRadioItem>
                  {Object.keys(statusDisplay).map(sKey => (
                    <DropdownMenuRadioItem key={sKey} value={sKey}>{statusDisplay[sKey as FacilityApplicationData['status']]}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!error && applications.length === 0 && !pageLoading && (
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertTitle>Belum Ada Pengajuan</AlertTitle>
              <AlertDescription>Saat ini belum ada pengajuan fasilitas dari anggota dengan filter yang dipilih.</AlertDescription>
            </Alert>
          )}
          {!error && applications.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Anggota</TableHead>
                  <TableHead className="hidden md:table-cell">Jenis Fasilitas</TableHead>
                  <TableHead className="hidden sm:table-cell">Tujuan Pengajuan</TableHead>
                  <TableHead className="hidden lg:table-cell">Tgl. Pengajuan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.memberFullName}</TableCell>
                    <TableCell className="hidden md:table-cell">{app.facilityType}{app.facilityType === 'Lainnya' && app.specificProductName ? ` (${app.specificProductName})` : ''}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">{app.targetEntityType ? app.targetEntityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {app.applicationDate instanceof Date ? app.applicationDate.toLocaleDateString('id-ID') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-white ${getStatusBadgeColor(app.status)}`}>
                        {statusDisplay[app.status] || app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/facilities/${app.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> Lihat Detail
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
