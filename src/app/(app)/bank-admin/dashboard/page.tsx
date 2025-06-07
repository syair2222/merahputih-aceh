
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, Loader2, Building, ListChecks, ExternalLink } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { FacilityApplicationData } from '@/types';

export default function BankAdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pendingBankApplicationsCount, setPendingBankApplicationsCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchPendingBankApplications = useCallback(async () => {
    if (!user || user.role !== 'bank_partner_admin') {
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    try {
      const q = query(
        collection(db, 'facilityApplications'),
        where('targetEntityType', '==', 'BANK_MITRA'),
        where('status', '==', 'approved') // Approved by Koperasi
      );
      const querySnapshot = await getDocs(q);
      let count = 0;
      querySnapshot.forEach(doc => {
        const app = doc.data() as FacilityApplicationData;
        // Check if bank decision is still pending
        if (!app.bankDecisionStatus || app.bankDecisionStatus === 'pending') {
          count++;
        }
      });
      setPendingBankApplicationsCount(count);
    } catch (error) {
      console.error("Error fetching pending bank applications:", error);
      // Optionally set an error state to display to the user
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (user && user.role === 'bank_partner_admin') {
        fetchPendingBankApplications();
      } else if (user) {
        router.push('/'); // Redirect if not a bank admin
      } else {
        router.push('/login'); // Redirect if not logged in
      }
    }
  }, [user, authLoading, router, fetchPendingBankApplications]);

  if (authLoading || (!user && !authLoading)) { // Show loader if auth is loading OR if user is null and auth has finished (means redirecting)
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat dasbor admin bank...</p>
      </div>
    );
  }

  if (!user || user.role !== 'bank_partner_admin') {
    // This case should ideally be handled by the redirect, but as a fallback:
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
          <Building className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Dasbor Admin Bank</h1>
        </div>
        {/* Optional: Back to main admin dashboard if they have other general admin access, or just remove if this is their only entry. */}
        {/* <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Ke Dasbor Admin Umum
        </Button> */}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Selamat Datang, {user.displayName || user.email}</CardTitle>
          <CardDescription>Ini adalah dasbor khusus untuk admin mitra bank. Kelola dan proses pengajuan yang relevan.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pengajuan Menunggu Keputusan Bank</CardTitle>
              <ListChecks className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                 <div className="flex items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                    <span className="text-muted-foreground">Memuat...</span>
                </div>
              ) : (
                <div className="text-3xl font-bold">{pendingBankApplicationsCount}</div>
              )}
              <Link href="/admin/facilities" className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 block">
                Lihat Semua Pengajuan &rarr;
              </Link>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aksi Cepat</CardTitle>
               <ExternalLink className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
               <Button asChild className="w-full justify-start">
                 <Link href="/admin/facilities">
                    <ListChecks className="mr-2 h-4 w-4" /> Tinjau Pengajuan Fasilitas
                 </Link>
               </Button>
                <p className="text-xs text-muted-foreground mt-2">
                    Akses daftar pengajuan yang telah disetujui koperasi dan ditujukan untuk bank Anda.
                </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Alert>
        <Building className="h-4 w-4" />
        <AlertTitle>Informasi</AlertTitle>
        <AlertDescription>
          Halaman ini menampilkan ringkasan aktivitas dan pengajuan yang memerlukan tindakan dari Anda sebagai admin bank mitra. 
          Pastikan untuk secara berkala meninjau pengajuan yang masuk.
        </AlertDescription>
      </Alert>

    </div>
  );
}
