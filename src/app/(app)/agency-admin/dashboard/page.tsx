
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, Loader2, Briefcase, ListChecks, ExternalLink } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { FacilityApplicationData } from '@/types';

export default function AgencyAdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [relevantApplicationsCount, setRelevantApplicationsCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchRelevantApplications = useCallback(async () => {
    if (!user || user.role !== 'related_agency_admin') {
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    try {
      const q = query(
        collection(db, 'facilityApplications'),
        where('targetEntityType', 'in', ['DINAS_TERKAIT', 'UMUM_BELUM_DITENTUKAN']),
        where('status', '==', 'approved') // Approved by Koperasi, ready for Dinas review/info
      );
      const querySnapshot = await getDocs(q);
      setRelevantApplicationsCount(querySnapshot.size);
    } catch (error) {
      console.error("Error fetching relevant applications for agency:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (user && user.role === 'related_agency_admin') {
        fetchRelevantApplications();
      } else if (user) {
        router.push('/'); 
      } else {
        router.push('/login');
      }
    }
  }, [user, authLoading, router, fetchRelevantApplications]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat dasbor admin dinas...</p>
      </div>
    );
  }

  if (!user || user.role !== 'related_agency_admin') {
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Briefcase className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Dasbor Admin Dinas Terkait</h1>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Selamat Datang, {user.displayName || user.email}</CardTitle>
          <CardDescription>Dasbor ini menyediakan ringkasan aktivitas dan pengajuan yang relevan dengan dinas Anda.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pengajuan Relevan (Disetujui Koperasi)</CardTitle>
              <ListChecks className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                 <div className="flex items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                    <span className="text-muted-foreground">Memuat...</span>
                </div>
              ) : (
                <div className="text-3xl font-bold">{relevantApplicationsCount}</div>
              )}
              <Link href="/admin/facilities" className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 block">
                Lihat Semua Pengajuan Relevan &rarr;
              </Link>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aksi Cepat</CardTitle>
               <ExternalLink className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
               <Button asChild className="w-full justify-start">
                 <Link href="/admin/facilities">
                    <ListChecks className="mr-2 h-4 w-4" /> Tinjau Pengajuan Fasilitas
                 </Link>
               </Button>
                <p className="text-xs text-muted-foreground mt-2">
                    Akses daftar pengajuan yang telah disetujui koperasi dan relevan untuk dinas Anda.
                </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Alert>
        <Briefcase className="h-4 w-4" />
        <AlertTitle>Informasi</AlertTitle>
        <AlertDescription>
          Halaman ini menampilkan ringkasan pengajuan yang mungkin memerlukan perhatian atau pencatatan dari dinas Anda.
          Pastikan untuk secara berkala meninjau pengajuan yang relevan.
        </AlertDescription>
      </Alert>

    </div>
  );
}
