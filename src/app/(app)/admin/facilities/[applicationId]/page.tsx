
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
import { ArrowLeft, ShieldAlert, Loader2, DollarSign, UserCircle, CheckSquare, XSquare, MessageSquare, FileText, ExternalLink, Paperclip, Users, Info, Star, CalendarDays, Building, Coins } from 'lucide-react';
import type { FacilityApplicationData, RequestedRecommendation } from '@/types';
import { FacilityTypeOptions, MemberBusinessAreaOptions, statusDisplay as adminStatusDisplayKoperasi } from '@/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp, increment } from 'firebase/firestore'; // Added increment
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

// Status display for Koperasi's decision
const localStatusDisplayKoperasi: Record<FacilityApplicationData['status'], string> = {
  pending_review: 'Menunggu Review Koperasi',
  pending_approval: 'Menunggu Persetujuan Koperasi',
  approved: 'Disetujui Koperasi',
  rejected: 'Ditolak Koperasi',
  completed: 'Selesai',
  cancelled_by_member: 'Dibatalkan Anggota',
  requires_correction: 'Perlu Perbaikan (Koperasi)'
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
  const [adminDecisionComment, setAdminDecisionComment] = useState(''); // For Koperasi Admin
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false); // For Koperasi Admin

  const [bankAdminDecisionComment, setBankAdminDecisionComment] = useState(''); // For Bank Admin
  const [isSubmittingBankDecision, setIsSubmittingBankDecision] = useState(false); // For Bank Admin

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
            decisionDate: (rec.decisionDate as Timestamp)?.toDate()
        }));

        setApplication({
          id: appDocSnap.id,
          ...appData,
          applicationDate: (appData.applicationDate as Timestamp)?.toDate(),
          decisionDate: (appData.decisionDate as Timestamp)?.toDate(), // Koperasi decision date
          bankDecisionTimestamp: appData.bankDecisionTimestamp ? (appData.bankDecisionTimestamp as Timestamp).toDate() : undefined, // Bank decision date
          requestedRecommendations: enrichedRequestedRecommendations,
        });
        setAdminDecisionComment(appData.adminComments || '');
        // Initialize bank comment if bank is about to make a decision or has made one with 'pending' status (if such flow exists)
        if (appData.bankDecisionStatus === 'pending' && appData.bankComments) {
            setBankAdminDecisionComment(appData.bankComments);
        } else {
            setBankAdminDecisionComment(''); // Reset if not applicable
        }

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
      if (!user || !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas' || user.role === 'bank_partner_admin')) {
        router.push('/');
      } else {
        fetchApplication();
      }
    }
  }, [user, authLoading, router, fetchApplication]);

  // For Koperasi Admin Decision
  const handleDecision = async (newStatus: 'approved' | 'rejected' | 'requires_correction' | 'completed') => {
    if (!application || !user) return;
    
    if (user.role === 'bank_partner_admin') {
        toast({ title: "Aksi Tidak Diizinkan", description: "Admin Bank Mitra tidak dapat mengubah status pengajuan dari sisi koperasi.", variant: "destructive"});
        return;
    }

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
        toast({ title: "Keputusan Koperasi Disimpan", description: `Pengajuan telah diubah statusnya menjadi ${localStatusDisplayKoperasi[newStatus]}.`});
        
        // Award points if loan approved
        if (newStatus === 'approved' && application.facilityType === 'Pinjaman Usaha' && application.userId && application.quantityOrAmount) {
            let loanAmountNumber = 0;
            const cleanedAmountString = application.quantityOrAmount.replace(/\D/g, ''); // Remove all non-digits
            if (cleanedAmountString) {
                loanAmountNumber = parseInt(cleanedAmountString, 10);
            }

            if (!isNaN(loanAmountNumber) && loanAmountNumber > 0) {
                const memberDocRef = doc(db, 'members', application.userId);
                await updateDoc(memberDocRef, {
                    currentPointsBalance: increment(loanAmountNumber)
                });
                toast({
                    title: "Poin Diberikan",
                    description: `Sebanyak ${loanAmountNumber.toLocaleString('id-ID')} poin berhasil ditambahkan ke saldo poin anggota ${application.memberFullName}.`,
                    duration: 7000
                });
            } else {
                console.warn(`Could not parse loan amount for points: ${application.quantityOrAmount} for application ${application.id}`);
                toast({
                    title: "Peringatan Poin",
                    description: `Poin tidak dapat diberikan secara otomatis karena format jumlah pinjaman (${application.quantityOrAmount}) tidak valid. Harap perbarui saldo poin anggota secara manual jika perlu.`,
                    variant: "destructive",
                    duration: 10000
                });
            }
        }
        
        fetchApplication(); 
    } catch (err) {
        console.error("Error updating application status (Koperasi):", err);
        toast({ title: "Gagal Menyimpan Keputusan Koperasi", description: "Terjadi kesalahan saat memproses keputusan.", variant: "destructive"});
    } finally {
        setIsSubmittingDecision(false);
    }
  };

  // For Bank Partner Admin Decision
  const handleBankDecision = async (newBankStatus: 'approved' | 'rejected') => {
    if (!application || !user || user.role !== 'bank_partner_admin') return;

    if (newBankStatus === 'rejected' && !bankAdminDecisionComment.trim()) {
        toast({ title: "Komentar Wajib", description: "Mohon isi alasan jika bank menolak pengajuan.", variant: "destructive"});
        return;
    }
    
    setIsSubmittingBankDecision(true);
    try {
        const appDocRef = doc(db, 'facilityApplications', application.id!);
        await updateDoc(appDocRef, {
            bankDecisionStatus: newBankStatus,
            bankComments: bankAdminDecisionComment.trim(),
            bankDecisionMaker: user.displayName || user.email,
            bankDecisionTimestamp: serverTimestamp(),
            lastUpdated: serverTimestamp(),
        });
        toast({ title: "Keputusan Bank Disimpan", description: `Keputusan bank telah disimpan sebagai '${newBankStatus === 'approved' ? 'Disetujui Bank' : 'Ditolak Bank'}'.`});
        fetchApplication(); // Refresh data
    } catch (err) {
        console.error("Error updating bank decision:", err);
        toast({ title: "Gagal Menyimpan Keputusan Bank", description: "Terjadi kesalahan.", variant: "destructive"});
    } finally {
        setIsSubmittingBankDecision(false);
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
  const koperasiDecisionDateFormatted = application.decisionDate instanceof Date ? application.decisionDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
  const bankDecisionTimestampFormatted = application.bankDecisionTimestamp instanceof Date ? application.bankDecisionTimestamp.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
  
  const canKoperasiAdminMakeDecision = user?.role === 'admin_utama' || user?.role === 'sekertaris' || user?.role === 'bendahara' || user?.role === 'dinas';
  
  // Conditions for bank_partner_admin to see the decision form
  const showBankDecisionForm = user?.role === 'bank_partner_admin' &&
    application.targetEntityType === 'BANK_MITRA' &&
    application.status === 'approved' && // Koperasi must have approved
    (!application.bankDecisionStatus || application.bankDecisionStatus === 'pending'); // Bank hasn't made a final decision

  // Condition for bank_partner_admin to see that a bank decision has already been made
  const bankDecisionAlreadyMade = user?.role === 'bank_partner_admin' &&
    application.targetEntityType === 'BANK_MITRA' &&
    application.status === 'approved' &&
    application.bankDecisionStatus && application.bankDecisionStatus !== 'pending';

  // Condition for bank_partner_admin where the application is not relevant or not ready for bank action
  const bankCannotActYet = user?.role === 'bank_partner_admin' &&
    (application.targetEntityType !== 'BANK_MITRA' || application.status !== 'approved');


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
              {localStatusDisplayKoperasi[application.status] || application.status}
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
          <DetailItem label="Ditujukan Kepada" value={application.targetEntityType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Koperasi Internal'} />
          {(application.targetEntityType === 'BANK_MITRA' || application.targetEntityType === 'DINAS_TERKAIT') && application.targetEntityName && (
            <DetailItem label={`Nama ${application.targetEntityType === 'BANK_MITRA' ? 'Bank' : 'Dinas'}`} value={application.targetEntityName} />
          )}
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
      
      {/* Koperasi Admin Decision Section */}
      <Card>
        <CardHeader><CardTitle className="text-xl font-headline text-accent flex items-center"><MessageSquare className="mr-2 h-5 w-5" /> Keputusan & Komentar Admin Koperasi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {application.status !== 'pending_review' && application.status !== 'pending_approval' && (
            <Alert variant={application.status === 'approved' || application.status === 'completed' ? 'default' : 'destructive'} className="bg-opacity-10">
              <AlertTitle className="font-semibold">
                Keputusan Koperasi: {localStatusDisplayKoperasi[application.status]}
                {application.decisionMaker && ` oleh ${application.decisionMaker}`}
                {koperasiDecisionDateFormatted && ` pada ${koperasiDecisionDateFormatted}`}
              </AlertTitle>
              {application.adminComments && <AlertDescription>Komentar Koperasi: {application.adminComments}</AlertDescription>}
            </Alert>
          )}

          {(application.status === 'pending_review' || application.status === 'pending_approval' || application.status === 'requires_correction') && canKoperasiAdminMakeDecision && (
            <>
              <div>
                <Label htmlFor="adminDecisionComment">Komentar / Alasan Keputusan Koperasi (Wajib jika ditolak/minta perbaikan)</Label>
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
                  <CheckSquare className="mr-2 h-4 w-4" /> Setujui Pengajuan (Koperasi)
                </Button>
                <Button onClick={() => handleDecision('rejected')} variant="destructive" disabled={isSubmittingDecision}>
                  <XSquare className="mr-2 h-4 w-4" /> Tolak Pengajuan (Koperasi)
                </Button>
                <Button onClick={() => handleDecision('requires_correction')} variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" disabled={isSubmittingDecision}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Minta Perbaikan Data (Koperasi)
                </Button>
                 {isSubmittingDecision && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>
            </>
          )}
           {(!canKoperasiAdminMakeDecision && (application.status === 'pending_review' || application.status === 'pending_approval' || application.status === 'requires_correction')) && (
            <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertTitle>Mode Tampilan (Keputusan Koperasi)</AlertTitle>
                <AlertDescription>
                   Peran Anda ({user?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}) tidak memiliki wewenang untuk mengubah status pengajuan dari sisi koperasi ini. Anda hanya dapat melihat detailnya.
                </AlertDescription>
             </Alert>
           )}
           {(application.status === 'approved' && user?.role === 'admin_utama') && ( 
            <Button onClick={() => handleDecision('completed')} variant="secondary" disabled={isSubmittingDecision}>
              Tandai Selesai
              {isSubmittingDecision && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Bank Partner Admin Decision Section */}
      {showBankDecisionForm && (
          <Card>
            <CardHeader>
                <CardTitle className="text-xl font-headline text-accent flex items-center">
                <Building className="mr-2 h-5 w-5" /> Keputusan Anda (Bank Mitra)
                </CardTitle>
                <CardDescription>Pengajuan ini telah disetujui koperasi dan ditujukan ke bank Anda. Mohon berikan keputusan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                <Label htmlFor="bankAdminDecisionComment">Komentar / Alasan Keputusan Bank (Wajib jika ditolak)</Label>
                <Textarea
                    id="bankAdminDecisionComment"
                    value={bankAdminDecisionComment}
                    onChange={(e) => setBankAdminDecisionComment(e.target.value)}
                    placeholder="Tuliskan komentar atau alasan keputusan bank di sini..."
                    rows={4}
                    className="mt-1"
                    disabled={isSubmittingBankDecision}
                />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => handleBankDecision('approved')} variant="default" className="bg-green-600 hover:bg-green-700 text-white" disabled={isSubmittingBankDecision}>
                    <CheckSquare className="mr-2 h-4 w-4" /> Setujui dari Bank
                </Button>
                <Button onClick={() => handleBankDecision('rejected')} variant="destructive" disabled={isSubmittingBankDecision}>
                    <XSquare className="mr-2 h-4 w-4" /> Tolak dari Bank
                </Button>
                {isSubmittingBankDecision && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                </div>
            </CardContent>
          </Card>
      )}

      {/* Display existing bank decision if any AND bank is not currently able to make a new decision via the form */}
      {application.bankDecisionStatus && application.bankDecisionStatus !== 'pending' && application.targetEntityType === 'BANK_MITRA' && (
        <Card className="mt-6">
        <CardHeader>
            <CardTitle className="text-xl font-headline text-accent flex items-center">
            <Building className="mr-2 h-5 w-5" /> Keputusan dari Bank Mitra
            </CardTitle>
        </CardHeader>
        <CardContent>
            <Alert variant={application.bankDecisionStatus === 'approved' ? 'default' : 'destructive'} className={application.bankDecisionStatus === 'approved' ? "bg-green-50 border-green-300" : ""}>
            <AlertTitle className="font-semibold">
                Keputusan Bank: {application.bankDecisionStatus === 'approved' ? 'Disetujui oleh Bank' : 'Ditolak oleh Bank'}
                {application.bankDecisionMaker && ` oleh ${application.bankDecisionMaker}`}
                {bankDecisionTimestampFormatted && ` pada ${bankDecisionTimestampFormatted}`}
            </AlertTitle>
            {application.bankComments && <AlertDescription>Komentar Bank: {application.bankComments}</AlertDescription>}
            </Alert>
        </CardContent>
        </Card>
      )}
      
      {/* Informative message for bank_partner_admin if they cannot act */}
      {bankCannotActYet && !showBankDecisionForm && (
        <Alert variant="default" className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Informasi untuk Bank Mitra</AlertTitle>
            <AlertDescription>
                Pengajuan ini tidak (atau belum) memenuhi syarat untuk keputusan bank Anda. Pastikan pengajuan ditujukan ke 'BANK_MITRA' dan telah disetujui oleh koperasi.
            </AlertDescription>
        </Alert>
      )}

      {bankDecisionAlreadyMade && !showBankDecisionForm && (
         <Alert variant="default" className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Keputusan Bank Telah Dibuat</AlertTitle>
            <AlertDescription>
                Anda telah membuat keputusan untuk pengajuan ini. Status saat ini: {application.bankDecisionStatus === 'approved' ? 'Disetujui oleh Bank' : 'Ditolak oleh Bank'}.
            </AlertDescription>
        </Alert>
      )}

    </div>
  );
}

