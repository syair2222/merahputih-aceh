
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, Loader2, Send } from 'lucide-react';
import ApplyFacilityForm from '@/components/member/apply-facility-form'; // Import the new component

export default function MemberApplyFacilityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat halaman...</p>
      </div>
    );
  }

  if (!user) {
    // This should ideally be caught by AppLayout or middleware, but as a safeguard
    router.push('/login');
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Mengalihkan ke login...</p>
      </div>
    );
  }
  
  if (user.role !== 'member') {
    // Redirect if not a member (e.g., admin trying to access member page directly)
    router.push('/'); 
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Mengalihkan...</p>
      </div>
    );
  }


  if (user.status !== 'approved') {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Fitur Terbatas</AlertTitle>
          <AlertDescription>Status keanggotaan Anda belum disetujui. Anda belum dapat mengajukan fasilitas.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Anggota
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Send className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Formulir Pengajuan Produk Koperasi</h1>
        </div>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Detail Pengajuan</CardTitle>
          <CardDescription>Isi semua data yang diperlukan dengan benar dan lengkap.</CardDescription>
        </CardHeader>
        <CardContent>
          <ApplyFacilityForm 
            onFormSubmitSuccess={() => {
              router.push('/member/facilities/history?newApplication=true');
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

    