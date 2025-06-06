
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldAlert, Loader2, DollarSign, UserCircle, CheckSquare, XSquare, MessageSquare, FileText, ExternalLink, Paperclip, Users, Info, Star, CalendarDays } from 'lucide-react';
import type { FacilityApplicationData, RequestedRecommendation } from '@/types';
import { FacilityTypeOptions, MemberBusinessAreaOptions, statusDisplay } from '@/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FormLabel } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';


// Re-define statusDisplay if not exported from types
const localStatusDisplay: Record<FacilityApplicationData['status'], string> = {
  pending_review: 'Menunggu Review',
  pending_approval: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled_by_member: 'Dibatalkan Anggota',
  requires_correction: 'Perlu Perbaikan'
};


const DetailItem: React.FC<{ label: string; value?: string | React.ReactNode; fullWidth?: boolean }> = ({ label, value, fullWidth }) => (
  <div className={`mb-3 ${fullWidth ? "col-span-2" : ""}`}>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    {typeof value === 'string' ? <p className="text-md text-foreground whitespace-pre-wrap">{value || '-'}</p> : value || '-'}
  </div>
);

const RecommendationStars: React.FC<{ count: number }> = ({ count }) => {
  let stars = 0;
  if (count === 1) stars = 1;
  else if (count >= 2 && count <= 3) stars = 2;
  else if (count >= 4 && count <= 5) stars = 3;
  else if (count >= 6 && count <= 7) stars = 4;
  else if (count >= 8) stars = 5;

  return (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-5 w-5",
            i < stars ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          )}
        />
      ))}
      <span className="ml-2 text-sm text-muted-foreground">({count} rekomendasi disetujui)</span>
    </div>
  );
};

const getRecommendationStatusBadge = (status: RequestedRecommendation['status']) => {
    switch (status) {
        case 'approved': return <Badge className="bg-green-500 text-white">Disetujui</Badge>;
        case 'rejected': return <Badge variant="destructive">Ditolak</Badge>;
        case 'pending': return <Badge variant="secondary">Menunggu</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
};


export default function AdminFacilityApplicationDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const applicationId = params.applicationId as string;
  const { toast } = useToast();

  const [application, setApplication] = useState<FacilityApplicationData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminDecisionComment, setAdminDecisionComment] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const fetchApplication = useCallback(async () => {
    if (!applicationId) {
        setError("ID Aplikasi tidak valid.");
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
        
        const enrichedRequestedRecommendations = (appData.requestedRecommendations || []).map(rec => ({
            ...rec,
            decisionDate: (rec.decisionDate as Timestamp)?.toDate() // Convert Firestore Timestamp
        }));

        setApplication({
          id: appDocSnap.id,
          ...appData,
          applicationDate: (appData.applicationDate as Timestamp)?.toDate(),
          decisionDate: (appData.decisionDate as Timestamp)?.toDate(),
          requestedRecommendations: enrichedRequestedRecommendations,
        });
        setAdminDecisionComment(appData.adminComments || '');
      } else {
        setError('Data pengajuan fasilitas tidak ditemukan.');
      }
    } catch (err) {
      console.error("Error fetching application data:", err);
      setError('Gagal memuat data pengajuan fasilitas.');
    } finally {
      setPageLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas')) {
        router.push('/');
      } else {
        fetchApplication();
      }
    }
  }, [user, authLoading, router, fetchApplication]);

  const handleDecision = async (newStatus: 'approved' | 'rejected' | 'requires_correction' | 'completed') => {
    if (!application || !user) return;
    if ((newStatus === 'rejected' || newStatus === 'requires_correction') && !adminDecisionComment.trim()) {
        toast({ title: "Komentar Wajib", description: "Mohon isi alasan penolakan atau permintaan perbaikan.", variant: "destructive"});
        return;
    }

    setIsSubmittingDecision(true);
    try {
        const appDocRef = doc(db, 'facilityApplications', application.id!);
        await updateDoc(appDocRef, {
            status: newStatus,
            adminComments: adminDecisionComment.trim(),
            decisionMaker: user.displayName || user.email,
            decisionDate: serverTimestamp(),
            lastUpdated: serverTimestamp(),
        });
        toast({ title: "Keputusan Disimpan", description: `Pengajuan telah diubah statusnya menjadi ${localStatusDisplay[newStatus]}.`});
        fetchApplication(); // Refresh data
    } catch (err) {
        console.error("Error updating application status:", err);
        toast({ title: "Gagal Menyimpan Keputusan", description: "Terjadi kesalahan saat memproses keputusan.", variant: "destructive"});
    } finally {
        setIsSubmittingDecision(false);
    }
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


  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat detail pengajuan...</p>
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


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold text-primary">Detail Pengajuan Fasilitas</h1>
        <Button onClick={() => router.push('/admin/facilities')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar</Button>
      </div>

      <Card>
        <CardHeader className="bg-muted/30">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-headline text-accent">Pengajuan oleh: {application.memberFullName}</CardTitle>
              <CardDescription>Nomor Anggota: {application.memberIdNumber || 'N/A'} | Tgl. Pengajuan: {appDateFormatted}</CardDescription>
            </div>
            <Badge className={`text-white text-lg px-3 py-1 ${getStatusBadgeColor(application.status)}`}>
              {localStatusDisplay[application.status] || application.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-2 gap-x-8 gap-y-4">
          <DetailItem label="Alamat Domisili Anggota" value={application.memberAddress} fullWidth />
          <DetailItem label="Jenis Produk/Layanan" value={application.facilityType} />
          {application.facilityType === 'Lainnya' && <DetailItem label="Nama Produk/Layanan Khusus" value={application.specificProductName} />}
          <DetailItem label="Jumlah/Kuantitas Diajukan" value={application.quantityOrAmount} />
          <DetailItem label="Tujuan/Kebutuhan Penggunaan" value={application.purpose} fullWidth />
          <DetailItem label="Bidang Usaha Anggota" value={application.memberBusinessArea} />
          {application.memberBusinessArea === 'Lainnya' && <DetailItem label="Bidang Usaha Lainnya" value={application.otherMemberBusinessArea} />}
          <DetailItem label="Estimasi Waktu Penggunaan/Pelunasan" value={application.estimatedUsageOrRepaymentTime} />
          <DetailItem label="Pernah Mengajukan Sebelumnya?" value={application.hasAppliedBefore} />
          {application.hasAppliedBefore === 'Ya' && <DetailItem label="Detail Pengajuan Sebelumnya" value={application.previousApplicationDetails} fullWidth />}
          <DetailItem label="Catatan Tambahan dari Anggota" value={application.additionalNotes} fullWidth />
        </CardContent>
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
                <Users className="mr-2 h-5 w-5" /> Informasi Rekomendasi Anggota
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
             <DetailItem 
                label="Kekuatan Rekomendasi Komunitas" 
                value={<RecommendationStars count={application.recommendationCount || 0} />} 
             />
            <Separator />
            <h4 className="text-md font-semibold text-foreground">Detail Perekomen:</h4>
            {application.requestedRecommendations && application.requestedRecommendations.length > 0 ? (
                <div className="space-y-3">
                    {application.requestedRecommendations.map((rec, index) => (
                        <div key={index} className="p-3 border rounded-md bg-muted/30">
                            <div className="flex justify-between items-center">
                                <p className="font-medium text-foreground">{rec.memberName} (ID: {rec.memberId.substring(0,6)}...)</p>
                                {getRecommendationStatusBadge(rec.status)}
                            </div>
                            {rec.comment && (
                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">Komentar: {rec.comment}</p>
                            )}
                            {rec.decisionDate && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                    <CalendarDays className="mr-1 h-3 w-3" />
                                    Diputuskan: {rec.decisionDate instanceof Date ? format(rec.decisionDate, 'PPP p', { locale: localeID }) : 'N/A'}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                 <p className="text-muted-foreground text-sm">Tidak ada anggota yang diminta rekomendasi atau belum ada yang memberikan keputusan.</p>
            )}
             <Alert variant="default" className="mt-4 bg-blue-50 border-blue-300 text-blue-700">
                <Info className="h-5 w-5 text-blue-600" />
                <AlertTitle className="font-semibold text-blue-800">Informasi Penilaian</AlertTitle>
                <AlertDescription>
                  Capai rekomendasi terbanyak sebagai salah satu cara kami menilai kelayakan dan kepercayaan. Rekomendasi dari anggota lain menjadi pertimbangan penting.
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-xl font-headline text-accent flex items-center"><MessageSquare className="mr-2 h-5 w-5" /> Keputusan & Komentar Admin</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {application.status !== 'pending_review' && application.status !== 'pending_approval' && (
            <Alert variant={application.status === 'approved' || application.status === 'completed' ? 'default' : 'destructive'} className="bg-opacity-10">
              <AlertTitle className="font-semibold">
                Keputusan Sebelumnya: {localStatusDisplay[application.status]}
                {application.decisionMaker && ` oleh ${application.decisionMaker}`}
                {decisionDateFormatted && ` pada ${decisionDateFormatted}`}
              </AlertTitle>
              {application.adminComments && <AlertDescription>Komentar: {application.adminComments}</AlertDescription>}
            </Alert>
          )}

          {(application.status === 'pending_review' || application.status === 'pending_approval' || application.status === 'requires_correction') && (
            <>
              <div>
                <FormLabel htmlFor="adminDecisionComment">Komentar / Alasan Keputusan (Wajib jika ditolak/minta perbaikan)</FormLabel>
                <Textarea
                  id="adminDecisionComment"
                  value={adminDecisionComment}
                  onChange={(e) => setAdminDecisionComment(e.target.value)}
                  placeholder="Tuliskan komentar atau alasan keputusan di sini..."
                  rows={4}
                  className="mt-1"
                  disabled={isSubmittingDecision}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => handleDecision('approved')} variant="default" className="bg-green-600 hover:bg-green-700 text-white" disabled={isSubmittingDecision}>
                  <CheckSquare className="mr-2 h-4 w-4" /> Setujui Pengajuan
                </Button>
                <Button onClick={() => handleDecision('rejected')} variant="destructive" disabled={isSubmittingDecision}>
                  <XSquare className="mr-2 h-4 w-4" /> Tolak Pengajuan
                </Button>
                <Button onClick={() => handleDecision('requires_correction')} variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" disabled={isSubmittingDecision}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Minta Perbaikan Data
                </Button>
                 {isSubmittingDecision && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>
            </>
          )}
           {(application.status === 'approved' && user?.role === 'admin_utama') && ( // Only allow admin_utama to mark as completed
            <Button onClick={() => handleDecision('completed')} variant="secondary" disabled={isSubmittingDecision}>
              Tandai Selesai
              {isSubmittingDecision && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

