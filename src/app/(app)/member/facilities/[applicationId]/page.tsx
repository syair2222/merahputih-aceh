
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldAlert, Loader2, UserCircle, MessageSquare, FileText, ExternalLink, Paperclip, Users, Info, CalendarDays, ListChecks, HelpCircle } from 'lucide-react';
import type { FacilityApplicationData, RequestedRecommendation } from '@/types';
import { statusDisplay as adminStatusDisplay } from '@/types'; // Renamed to avoid conflict
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp, updateDoc, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
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

const memberFacilityStatusDisplay: Record<FacilityApplicationData['status'], string> = {
  pending_review: 'Sedang Direview Admin',
  pending_approval: 'Menunggu Persetujuan Admin',
  approved: 'Disetujui Koperasi',
  rejected: 'Ditolak Koperasi',
  completed: 'Selesai',
  cancelled_by_member: 'Dibatalkan oleh Anda',
  requires_correction: 'Data Perlu Diperbaiki'
};

const getStatusBadgeColor = (status?: FacilityApplicationData['status']) => {
  if (!status) return 'bg-gray-400';
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

const getRecommendationStatusBadge = (status: RequestedRecommendation['status']) => {
    switch (status) {
        case 'approved': return <Badge className="bg-green-500 text-white">Disetujui</Badge>;
        case 'rejected': return <Badge variant="destructive">Ditolak</Badge>;
        case 'pending': return <Badge variant="secondary">Menunggu Respons</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
};

const DetailItem: React.FC<{ label: string; value?: string | React.ReactNode; fullWidth?: boolean }> = ({ label, value, fullWidth }) => (
  <div className={`mb-3 ${fullWidth ? "col-span-2" : ""}`}>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    {typeof value === 'string' ? <p className="text-md text-foreground whitespace-pre-wrap">{value || '-'}</p> : value || '-'}
  </div>
);

export default function MemberFacilityApplicationDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const applicationId = params.applicationId as string;
  const { toast } = useToast();

  const [application, setApplication] = useState<FacilityApplicationData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchApplication = useCallback(async () => {
    if (!applicationId || !user) {
        setError("ID Aplikasi tidak valid atau pengguna tidak terautentikasi.");
        setPageLoading(false);
        return;
    }
    setPageLoading(true);
    setError(null);
    try {
      const appDocRef = doc(db, 'facilityApplications', applicationId);
      const appDocSnap = await getDoc(appDocRef);

      if (appDocSnap.exists()) {
        const appData = appDocSnap.data() as Omit<FacilityApplicationData, 'id'>;
        if (appData.userId !== user.uid) {
          setError('Anda tidak memiliki izin untuk melihat detail pengajuan ini.');
          setApplication(null);
          setPageLoading(false);
          return;
        }
        
        const enrichedRequestedRecommendations = (appData.requestedRecommendations || []).map(rec => ({
            ...rec,
            decisionDate: (rec.decisionDate as Timestamp)?.toDate()
        }));

        setApplication({
          id: appDocSnap.id,
          ...appData,
          applicationDate: (appData.applicationDate as Timestamp)?.toDate(),
          decisionDate: (appData.decisionDate as Timestamp)?.toDate(),
          requestedRecommendations: enrichedRequestedRecommendations,
        });
      } else {
        setError('Data pengajuan fasilitas tidak ditemukan.');
      }
    } catch (err) {
      console.error("Error fetching application data:", err);
      setError('Gagal memuat data pengajuan fasilitas.');
    } finally {
      setPageLoading(false);
    }
  }, [applicationId, user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'member') {
         router.push('/');
      }
       else {
        fetchApplication();
      }
    }
  }, [user, authLoading, router, fetchApplication]);

  const handleCancelApplication = async () => {
    if (!application || !user || !(application.status === 'pending_review' || application.status === 'pending_approval' || application.status === 'requires_correction')) {
        toast({ title: "Tidak Dapat Dibatalkan", description: "Pengajuan ini sudah dalam proses lanjut atau sudah selesai.", variant: "destructive" });
        return;
    }
    setIsCancelling(true);
    try {
        const appDocRef = doc(db, 'facilityApplications', application.id!);
        await updateDoc(appDocRef, {
            status: 'cancelled_by_member',
            lastUpdated: serverTimestamp(),
            // Optional: remove pending recommendations if cancelled
            // requestedRecommendations: arrayRemove(...(application.requestedRecommendations?.filter(r => r.status === 'pending') || []))
        });
        toast({ title: "Pengajuan Dibatalkan", description: "Pengajuan fasilitas Anda telah berhasil dibatalkan." });
        fetchApplication(); // Refresh data
    } catch (error) {
        console.error("Error cancelling application:", error);
        toast({ title: "Gagal Membatalkan", description: "Terjadi kesalahan saat membatalkan pengajuan.", variant: "destructive" });
    } finally {
        setIsCancelling(false);
    }
  };


  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat detail pengajuan Anda...</p>
      </div>
    );
  }
  
  if (!user || user.role !== 'member') {
     return (
        <div className="text-center p-10">
            <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Akses Ditolak</AlertTitle>
                <AlertDescription>Anda harus menjadi anggota untuk melihat halaman ini.</AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/')} className="mt-4">Kembali ke Beranda</Button>
        </div>
     );
  }

  if (error) {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        <Button onClick={() => router.back()} variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center p-10">
        <Alert><AlertTitle>Informasi</AlertTitle><AlertDescription>Tidak ada data pengajuan untuk ditampilkan.</AlertDescription></Alert>
         <Button onClick={() => router.back()} variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
      </div>
    );
  }

  const appDateFormatted = application.applicationDate instanceof Date ? application.applicationDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Tidak diketahui';
  const decisionDateFormatted = application.decisionDate instanceof Date ? application.decisionDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
  
  const canBeCancelled = application.status === 'pending_review' || application.status === 'pending_approval' || application.status === 'requires_correction';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold text-primary">Detail Pengajuan Fasilitas Anda</h1>
        <Button onClick={() => router.push('/member/facilities/history')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Riwayat</Button>
      </div>

      <Card>
        <CardHeader className="bg-muted/30">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-headline text-accent">
                Pengajuan: {application.facilityType} {application.specificProductName ? `(${application.specificProductName})` : ''}
              </CardTitle>
              <CardDescription>Tgl. Pengajuan: {appDateFormatted}</CardDescription>
            </div>
            <Badge className={`text-white text-lg px-3 py-1 ${getStatusBadgeColor(application.status)}`}>
              {memberFacilityStatusDisplay[application.status] || application.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-2 gap-x-8 gap-y-4">
          <DetailItem label="Jenis Produk/Layanan" value={application.facilityType} />
          {application.facilityType === 'Lainnya' && <DetailItem label="Nama Produk/Layanan Khusus" value={application.specificProductName} />}
          <DetailItem label="Jumlah/Kuantitas Diajukan" value={application.quantityOrAmount} />
          <DetailItem label="Tujuan/Kebutuhan Penggunaan" value={application.purpose} fullWidth />
          <DetailItem label="Bidang Usaha Anda" value={application.memberBusinessArea} />
          {application.memberBusinessArea === 'Lainnya' && <DetailItem label="Bidang Usaha Lainnya" value={application.otherMemberBusinessArea} />}
          <DetailItem label="Estimasi Waktu Penggunaan/Pelunasan" value={application.estimatedUsageOrRepaymentTime} />
          <DetailItem label="Pernah Mengajukan Sebelumnya?" value={application.hasAppliedBefore} />
          {application.hasAppliedBefore === 'Ya' && <DetailItem label="Detail Pengajuan Sebelumnya" value={application.previousApplicationDetails} fullWidth />}
          <DetailItem label="Catatan Tambahan Anda" value={application.additionalNotes} fullWidth />
        </CardContent>
        {application.adminComments && (application.status === 'rejected' || application.status === 'requires_correction' || application.status === 'approved') && (
            <CardFooter className="border-t pt-4">
                <Alert variant={application.status === 'rejected' ? 'destructive' : 'default'} className="w-full bg-opacity-10">
                    <MessageSquare className="h-4 w-4"/>
                    <AlertTitle className="font-semibold">Komentar dari Admin Koperasi</AlertTitle>
                    <AlertDescription>{application.adminComments}</AlertDescription>
                    {decisionDateFormatted && <p className="text-xs mt-1">Diputuskan oleh: {application.decisionMaker || 'Admin'} pada {decisionDateFormatted}</p>}
                </Alert>
            </CardFooter>
        )}
      </Card>

      {application.supportingDocuments && application.supportingDocuments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-xl font-headline text-accent flex items-center"><Paperclip className="mr-2 h-5 w-5" /> Dokumen Pendukung Terlampir</CardTitle></CardHeader>
          <CardContent className="pt-2">
            <ul className="space-y-2">
              {application.supportingDocuments.map((doc, index) => (
                <li key={index} className="flex items-center justify-between p-2 border rounded-md bg-background hover:bg-muted/50">
                  <div className="flex items-center">
                    <FileText className="mr-3 h-5 w-5 text-primary" />
                    <span className="text-sm">{doc.name} <span className="text-xs text-muted-foreground">({(doc.size / 1024).toFixed(1)} KB)</span></span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={doc.url} target="_blank" rel="noopener noreferrer">
                      Lihat <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
            <CardTitle className="text-xl font-headline text-accent flex items-center">
                <ListChecks className="mr-2 h-5 w-5" /> Status Permintaan Rekomendasi Anda
            </CardTitle>
            <CardDescription>Lihat status permintaan rekomendasi yang Anda kirim ke anggota lain.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {application.requestedRecommendations && application.requestedRecommendations.length > 0 ? (
                <div className="space-y-3">
                    {application.requestedRecommendations.map((rec, index) => (
                        <div key={index} className="p-3 border rounded-md bg-muted/30">
                            <div className="flex justify-between items-center">
                                <p className="font-medium text-foreground">{rec.memberName}</p>
                                {getRecommendationStatusBadge(rec.status)}
                            </div>
                            {rec.status !== 'pending' && rec.decisionDate && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                    <CalendarDays className="mr-1 h-3 w-3" />
                                    Direspon pada: {rec.decisionDate instanceof Date ? format(rec.decisionDate, 'PPP p', { locale: localeID }) : 'N/A'}
                                </p>
                            )}
                             {rec.status === 'rejected' && rec.comment && (
                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">Komentar Perekomen: {rec.comment}</p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                 <Alert variant="default">
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>Belum Ada Permintaan Rekomendasi</AlertTitle>
                    <AlertDescription>Anda tidak meminta rekomendasi dari anggota lain untuk pengajuan ini.</AlertDescription>
                </Alert>
            )}
        </CardContent>
      </Card>

      {canBeCancelled && (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-headline text-accent">Aksi Pengajuan</CardTitle>
            </CardHeader>
            <CardContent>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isCancelling}>
                            {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Batalkan Pengajuan Ini
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Anda Yakin Ingin Membatalkan?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan membatalkan pengajuan fasilitas Anda. Anda dapat mengajukan kembali nanti jika diperlukan.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Tidak</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelApplication} className="bg-destructive hover:bg-destructive/90">
                            Ya, Batalkan Pengajuan
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-2">
                    Anda dapat membatalkan pengajuan jika statusnya masih "Menunggu Review", "Menunggu Persetujuan", atau "Perlu Perbaikan".
                </p>
            </CardContent>
        </Card>
      )}
      
    </div>
  );
}

    