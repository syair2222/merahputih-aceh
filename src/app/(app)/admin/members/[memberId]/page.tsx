
// src/app/(app)/admin/members/[memberId]/page.tsx
'use client';

import type { ReactNode } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import type { MemberRegistrationData } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Eye, Loader2, ShieldAlert, UserCircle, Home, Briefcase, FileBadge, CheckSquare, Coins, XSquare, MessageSquareIcon, ThumbsUp, ThumbsDown, Edit3, Star, Printer, Users as UsersIcon, Handshake } from 'lucide-react';
import MemberBadges from '@/components/member/member-badges'; // Import MemberBadges

const DetailItem: React.FC<{ label: string; value?: string | ReactNode; fullWidth?: boolean }> = ({ label, value, fullWidth }) => (
  <div className={cn("mb-3", fullWidth ? "col-span-2" : "")}>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    {typeof value === 'string' ? <p className="text-md text-foreground whitespace-pre-wrap">{value || '-'}</p> : value || '-'}
  </div>
);

const RenderDocument: React.FC<{ url?: string; alt: string; fileName?: string; dataAiHint?: string; title: string }> = ({ url, alt, fileName, dataAiHint, title }) => {
  if (!url) {
    return (
        <Card className="w-full">
            <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Dokumen tidak diunggah.</p>
            </CardContent>
        </Card>
    );
  }

  const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('?alt=media'); // Handle Firebase Storage PDF URLs
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const isImage = imageExtensions.some(ext => url.toLowerCase().includes(ext)) && !isPdf;


  return (
    <Card className="w-full">
        <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center space-y-2">
            {isImage ? (
                <Image src={url} alt={alt} width={300} height={200} className="rounded-md object-contain border max-h-[200px]" data-ai-hint={dataAiHint || 'document image'} />
            ) : isPdf ? (
                <FileText className="w-16 h-16 text-primary" />
            ) : (
                 <ShieldAlert className="w-16 h-16 text-yellow-500" />
            )}
             <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href={url} target="_blank" rel="noopener noreferrer">
                <Eye className="mr-2 h-4 w-4" /> {isPdf ? `Lihat/Unduh ${fileName || 'PDF'}` : 'Lihat Dokumen'}
                </Link>
            </Button>
            {!isImage && !isPdf && <p className="text-xs text-muted-foreground">Format tidak didukung untuk pratinjau langsung.</p>}
        </CardContent>
    </Card>
  );
};


export default function MemberDetailPage() {
  const { user: adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const memberId = params.memberId as string;
  const { toast } = useToast();

  const [memberData, setMemberData] = useState<MemberRegistrationData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminComments, setAdminComments] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [currentAdminRating, setCurrentAdminRating] = useState<number>(0);


  const fetchMemberData = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      const memberDocRef = doc(db, 'members', memberId);
      const memberDocSnap = await getDoc(memberDocRef);

      if (memberDocSnap.exists()) {
        const data = memberDocSnap.data() as MemberRegistrationData;
        setMemberData(data);
        setAdminComments(data.adminComments || ''); 
        setCurrentAdminRating(data.adminRating || 0);
      } else {
        setError('Data anggota tidak ditemukan.');
      }
    } catch (err) {
      console.error("Error fetching member data:", err);
      setError('Gagal memuat data anggota.');
    } finally {
      setPageLoading(false);
    }
  }, [memberId]);


  useEffect(() => {
    if (!authLoading && adminUser && !(adminUser.role === 'admin_utama' || adminUser.role === 'sekertaris' || adminUser.role === 'bendahara' || adminUser.role === 'dinas')) {
      router.push('/'); 
    }
  }, [adminUser, authLoading, router]);

  useEffect(() => {
    if (memberId) {
      fetchMemberData();
    }
  }, [memberId, fetchMemberData]);

  const generateMemberIdNumber = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `KMP-${year}-${randomPart}`;
  };

  const handleAdminAction = async (newStatus: MemberRegistrationData['status'], newRole?: 'member' | 'prospective_member') => {
    if (!memberData || !memberId || !adminUser) return;

    if (adminUser.role === 'dinas' && (newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'requires_correction')) {
        toast({ title: "Aksi Tidak Diizinkan", description: "Admin Dinas tidak dapat mengubah status pendaftaran anggota.", variant: "destructive" });
        return;
    }

    if ((newStatus === 'rejected' || newStatus === 'requires_correction') && !adminComments.trim()) {
      toast({ title: "Komentar Wajib", description: "Mohon isi alasan penolakan atau permintaan perbaikan.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);
    try {
      const memberDocRef = doc(db, 'members', memberId);
      const userDocRef = doc(db, 'users', memberId);

      const memberUpdateData: Partial<MemberRegistrationData> = {
        status: newStatus,
        adminComments: adminComments.trim(),
        lastAdminActionTimestamp: serverTimestamp(),
        lastAdminActionBy: adminUser.uid,
        lastAdminActionByName: adminUser.displayName || adminUser.email,
      };

      const userUpdateData: any = {
        status: newStatus, // Mirror status
      };

      if (newStatus === 'approved') {
        memberUpdateData.memberIdNumber = memberData.memberIdNumber || generateMemberIdNumber();
        if (newRole) userUpdateData.role = newRole;
        userUpdateData.status = 'approved'; 
      } else if (newStatus === 'pending' || newStatus === 'verified'){ 
         if (newRole) userUpdateData.role = newRole; 
      }

      await updateDoc(memberDocRef, memberUpdateData);
      await updateDoc(userDocRef, userUpdateData);

      toast({ title: "Aksi Berhasil", description: `Status anggota telah diperbarui menjadi ${newStatus}.` });
      fetchMemberData(); 
    } catch (err) {
      console.error("Error updating member status:", err);
      toast({ title: "Aksi Gagal", description: "Terjadi kesalahan saat memproses aksi.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };
  
  const handleSaveRating = async () => {
    if (!memberData || !memberId || !adminUser) return;
    if (currentAdminRating === 0) {
        toast({title: "Pilih Rating", description: "Pilih rating antara 1 sampai 5.", variant: "destructive"});
        return;
    }
    setIsProcessingAction(true);
    try {
        const memberDocRef = doc(db, 'members', memberId);
        await updateDoc(memberDocRef, {
            adminRating: currentAdminRating,
            lastAdminActionTimestamp: serverTimestamp(),
            lastAdminActionBy: adminUser.uid,
            lastAdminActionByName: adminUser.displayName || adminUser.email,
        });
        toast({title: "Rating Disimpan", description: `Rating ${currentAdminRating} bintang berhasil disimpan untuk anggota ini.`});
        fetchMemberData(); // Refresh data
    } catch(err) {
        console.error("Error saving admin rating:", err);
        toast({title: "Gagal Simpan Rating", description: "Terjadi kesalahan.", variant: "destructive"});
    } finally {
        setIsProcessingAction(false);
    }
  };


  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat detail anggota...</p>
      </div>
    );
  }

  if (!adminUser || !(adminUser.role === 'admin_utama' || adminUser.role === 'sekertaris' || adminUser.role === 'bendahara' || adminUser.role === 'dinas')) {
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

  if (!memberData) {
    return (
      <div className="text-center p-10">
        <Alert>
          <AlertTitle>Informasi</AlertTitle>
          <AlertDescription>Tidak ada data anggota untuk ditampilkan.</AlertDescription>
        </Alert>
         <Button onClick={() => router.back()} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </div>
    );
  }

  const registrationDate = memberData.registrationTimestamp ? 
    new Date( (memberData.registrationTimestamp as any).seconds * 1000).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) :
    'Tidak diketahui';
  
  const birthDateFormatted = memberData.birthDate ?
    (typeof memberData.birthDate === 'string' ? new Date(memberData.birthDate) : memberData.birthDate as unknown as Date)
        .toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric'}) 
    : 'Tidak diketahui';
    
  const lastActionDateFormatted = memberData.lastAdminActionTimestamp ?
    new Date((memberData.lastAdminActionTimestamp as any).seconds * 1000).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})
    : null;

  const getStatusBadge = (status?: MemberRegistrationData['status']) => {
    if (!status) return <Badge variant="outline">Tidak Diketahui</Badge>;
    let statusText = status;
    switch (status) {
      case 'approved': statusText = "Disetujui"; break;
      case 'pending': statusText = "Menunggu Persetujuan"; break;
      case 'rejected': statusText = "Ditolak"; break;
      case 'verified': statusText = "Terverifikasi"; break;
      case 'requires_correction': statusText = "Perlu Perbaikan"; break;
    }
    
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
    let badgeClass = "";

    if (status === 'approved') { badgeVariant = "default"; badgeClass = "bg-green-500 text-white"; }
    else if (status === 'pending') { badgeVariant = "secondary"; badgeClass = "bg-yellow-500 text-white"; }
    else if (status === 'rejected') { badgeVariant = "destructive"; }
    else if (status === 'verified') { badgeVariant = "default"; badgeClass = "bg-blue-500 text-white"; }
    else if (status === 'requires_correction') { badgeVariant = "default"; badgeClass = "bg-orange-500 text-white"; }

    return <Badge variant={badgeVariant} className={badgeClass}>{statusText}</Badge>;
  };

  const canApprove = adminUser?.role === 'admin_utama' || adminUser?.role === 'sekertaris' || adminUser?.role === 'bendahara';
  const canRejectOrRequestCorrection = adminUser?.role === 'admin_utama' || adminUser?.role === 'sekertaris' || adminUser?.role === 'bendahara';

  const handlePrint = () => {
    window.print();
  };

  const getReferralSourceText = (source?: MemberRegistrationData['referralSource']) => {
    switch (source) {
        case 'member': return 'Anggota Koperasi';
        case 'other_source': return 'Sumber Lain';
        case 'no_referral': return 'Mendaftar Sendiri / Tidak Ada';
        default: return 'Tidak Diketahui';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-headline font-bold text-primary">Detail Anggota: {memberData.fullName}</h1>
          {memberData && <MemberBadges memberData={memberData} />}
        </div>
        <div>
          <Button onClick={handlePrint} variant="outline" className="mr-2 no-print">
            <Printer className="mr-2 h-4 w-4" /> Cetak Profil
          </Button>
          <Button onClick={() => router.push('/admin/members')} variant="outline" className="no-print">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Anggota
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30">
            <UserCircle className="h-10 w-10 text-primary" />
            <div>
                <CardTitle className="text-2xl font-headline text-accent">Informasi Pribadi & Akun</CardTitle>
                <CardDescription>Data personal dan akun pendaftar. Nomor Anggota: <strong>{memberData.memberIdNumber || "Belum Ada"}</strong></CardDescription>
            </div>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-2 gap-x-8 gap-y-4">
          <DetailItem label="Nama Lengkap" value={memberData.fullName} />
          <DetailItem label="Username" value={memberData.username} />
          <DetailItem label="Email" value={memberData.email} />
          <DetailItem label="NIK" value={memberData.nik} />
          <DetailItem label="Nomor KK" value={memberData.kk} />
          <DetailItem label="Tempat Lahir" value={memberData.birthPlace} />
          <DetailItem label="Tanggal Lahir" value={birthDateFormatted} />
          <DetailItem label="Jenis Kelamin" value={memberData.gender} />
          <DetailItem label="Nomor Telepon/WA" value={memberData.phoneNumber} />
          <DetailItem label="Pekerjaan Saat Ini" value={memberData.currentJob} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30">
            <Home className="h-10 w-10 text-primary" />
            <div>
                <CardTitle className="text-2xl font-headline text-accent">Alamat & Kependudukan</CardTitle>
                <CardDescription>Detail alamat sesuai KTP dan status kependudukan.</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-2 gap-x-8 gap-y-4">
          <DetailItem label="Dusun" value={memberData.addressDusun} fullWidth/>
          <DetailItem label="RT/RW" value={memberData.addressRtRw} />
          <DetailItem label="Desa/Kelurahan" value={memberData.addressDesa} />
          <DetailItem label="Kecamatan" value={memberData.addressKecamatan} />
          <DetailItem label="Status Kependudukan" value={memberData.isPermanentResident ? `Warga Tetap Desa ${memberData.residentDesaName || '(Tidak Disebutkan)'}` : 'Bukan Warga Tetap Desa Koperasi'} fullWidth />
        </CardContent>
      </Card>

      <Card>
         <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30">
            <Briefcase className="h-10 w-10 text-primary" />
            <div>
                <CardTitle className="text-2xl font-headline text-accent">Keanggotaan & Usaha</CardTitle>
                <CardDescription>Pilihan jenis keanggotaan dan bidang usaha yang diminati.</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-2 gap-x-8 gap-y-4">
          <DetailItem label="Jenis Keanggotaan" value={memberData.membershipType} />
          <DetailItem label="Bidang Usaha Diminati" value={(memberData.businessFields || []).join(', ')} />
          {memberData.businessFields?.includes('Lainnya') && memberData.otherBusinessField && (
            <DetailItem label="Bidang Usaha Lainnya" value={memberData.otherBusinessField} fullWidth/>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30">
            <Coins className="h-10 w-10 text-primary" />
            <div>
                <CardTitle className="text-2xl font-headline text-accent">Komitmen, Status & Aktivitas</CardTitle>
                 <CardDescription>Komitmen keuangan, status pendaftaran, rating admin, dan aktivitas rekomendasi.</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailItem label="Setuju Komitmen Keuangan" value={memberData.agreedToCommitment ? "Ya" : "Tidak"} />
            <DetailItem label="Setuju Syarat & Ketentuan" value={memberData.agreedToTerms ? "Ya" : "Tidak"} />
            <DetailItem label="Setuju Menjadi Anggota" value={memberData.agreedToBecomeMember ? "Ya" : "Tidak"} />
            <DetailItem label="Tanggal Registrasi" value={registrationDate} />
            <DetailItem label="Status Pendaftaran Saat Ini" value={getStatusBadge(memberData.status)} />
            <DetailItem label="Rating Admin" value={
                <div className="flex items-center">
                    {memberData.adminRating ? (
                        Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} className={cn("h-5 w-5", i < memberData.adminRating! ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                        ))
                    ) : (
                        <span className="text-muted-foreground">Belum ada rating</span>
                    )}
                </div>
            } />
            <DetailItem 
              label="Rekomendasi Diberikan" 
              value={
                <div className="flex items-center">
                  <Handshake className="mr-2 h-5 w-5 text-primary" />
                  {memberData.recommendationsGivenCount || 0} kali
                </div>
              } 
            />
             {memberData.adminComments && (
                <DetailItem label="Komentar Admin Sebelumnya" value={memberData.adminComments} fullWidth />
             )}
             {memberData.lastAdminActionByName && lastActionDateFormatted && (
                <DetailItem label="Aksi Admin Terakhir" value={`Oleh: ${memberData.lastAdminActionByName} pada ${lastActionDateFormatted}`} fullWidth />
             )}
        </CardContent>
      </Card>

      {(memberData.referralSource && memberData.referralSource !== 'no_referral') && (
        <Card>
            <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30">
                <UsersIcon className="h-10 w-10 text-primary" />
                <div>
                    <CardTitle className="text-2xl font-headline text-accent">Informasi Rekomendasi</CardTitle>
                    <CardDescription>Detail pendaftaran berdasarkan rekomendasi.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-6 grid md:grid-cols-2 gap-x-8 gap-y-4">
                <DetailItem label="Sumber Rekomendasi" value={getReferralSourceText(memberData.referralSource)} />
                {memberData.referralSource === 'member' && memberData.referrerMemberId && (
                    <DetailItem label="ID/Nama Anggota Perekrut" value={memberData.referrerMemberId} />
                )}
                {memberData.referralSource === 'other_source' && memberData.referrerName && (
                    <DetailItem label="Nama Perekrut / Sumber Lain" value={memberData.referrerName} />
                )}
                {memberData.referralNotes && (
                    <DetailItem label="Catatan Rekomendasi" value={memberData.referralNotes} fullWidth />
                )}
            </CardContent>
        </Card>
      )}

      <Card className="no-print">
        <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30">
            <FileBadge className="h-10 w-10 text-primary" />
            <div>
                <CardTitle className="text-2xl font-headline text-accent">Dokumen Terlampir</CardTitle>
                <CardDescription>Pratinjau dan tautan untuk dokumen yang diunggah anggota.</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RenderDocument url={memberData.ktpScanUrl} alt="Scan KTP" title="Scan/Foto KTP" dataAiHint="identity card" />
            <RenderDocument url={memberData.kkScanUrl} alt="Scan KK" title="Scan/Foto Kartu Keluarga" dataAiHint="family card" />
            <RenderDocument url={memberData.selfieKtpUrl} alt="Selfie KTP" title="Foto Selfie dengan KTP" dataAiHint="selfie id card" />
            <RenderDocument url={memberData.pasFotoUrl} alt="Pas Foto" title="Pas Foto 3x4" dataAiHint="portrait photo" />
            <RenderDocument url={memberData.domicileProofUrl} alt="Bukti Domisili" title="Bukti Domisili" fileName="BuktiDomisili" dataAiHint="address proof document" />
            <RenderDocument url={memberData.businessDocumentUrl} alt="Dokumen Usaha" title="Dokumen Pendukung Usaha" fileName="DokumenUsaha" dataAiHint="business license certificate" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="no-print">
        <CardHeader>
            <CardTitle className="text-xl font-headline text-accent">Aksi Admin</CardTitle>
            <CardDescription>Lakukan tindakan terhadap pendaftaran anggota ini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
              <Label htmlFor="adminComments">Komentar Admin (Wajib jika menolak atau minta perbaikan)</Label>
              <Textarea
                id="adminComments"
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                placeholder="Tuliskan alasan penolakan, permintaan perbaikan, atau catatan lain..."
                rows={3}
                className="mt-1"
                disabled={isProcessingAction}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2 items-center">
                {(memberData.status === 'pending' || memberData.status === 'verified' || memberData.status === 'requires_correction' || memberData.status === 'rejected') && (
                    <Button 
                        onClick={() => handleAdminAction('approved', 'member')} 
                        disabled={isProcessingAction || !canApprove}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        title={!canApprove ? "Hanya Admin Utama, Sekertaris, atau Bendahara yang dapat menyetujui." : ""}
                    >
                        {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsUp className="mr-2 h-4 w-4" />}
                        Setujui Pendaftaran
                    </Button>
                )}
                
                {(memberData.status === 'pending' || memberData.status === 'verified' || memberData.status === 'requires_correction' || memberData.status === 'approved') && (
                    <Button 
                        onClick={() => handleAdminAction('rejected')} 
                        variant="destructive" 
                        disabled={isProcessingAction || !canRejectOrRequestCorrection || ((memberData.status === 'approved' || memberData.status === 'rejected') && !adminComments.trim())}
                        title={!canRejectOrRequestCorrection ? "Admin Dinas hanya dapat memantau dan memberi komentar." : ((memberData.status === 'approved' || memberData.status === 'rejected') && !adminComments.trim()) ? "Komentar wajib diisi untuk menolak." : ""}
                    >
                        {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsDown className="mr-2 h-4 w-4" />}
                        Tolak Pendaftaran
                    </Button>
                )}

                {(memberData.status === 'pending' || memberData.status === 'verified' || memberData.status === 'requires_correction' || memberData.status === 'approved') && (
                    <Button 
                        onClick={() => handleAdminAction('requires_correction')} 
                        variant="outline" 
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                        disabled={isProcessingAction || !canRejectOrRequestCorrection || ((memberData.status === 'approved' || memberData.status === 'rejected') && !adminComments.trim())}
                        title={!canRejectOrRequestCorrection ? "Admin Dinas hanya dapat memantau dan memberi komentar." : ((memberData.status === 'approved' || memberData.status === 'rejected') && !adminComments.trim()) ? "Komentar wajib diisi untuk minta perbaikan." : ""}
                    >
                        {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
                        Minta Perbaikan Data
                    </Button>
                )}
                 {isProcessingAction && <p className="text-sm text-muted-foreground">Memproses...</p>}
            </div>
            {memberData.status === 'approved' && (
                 <Alert variant="default" className="mt-4 bg-green-50 border-green-300">
                    <CheckSquare className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-700">Anggota Telah Disetujui</AlertTitle>
                    <AlertDescription className="text-green-600">
                        Anda masih dapat mengubah statusnya menjadi "Ditolak" atau "Minta Perbaikan" jika diperlukan (memerlukan peran yang sesuai dan mengisi komentar).
                    </AlertDescription>
                </Alert>
            )}
             {memberData.status === 'rejected' && (
                 <Alert variant="destructive" className="mt-4">
                    <XSquare className="h-4 w-4" />
                    <AlertTitle>Anggota Telah Ditolak</AlertTitle>
                    <AlertDescription>
                        Anda masih dapat mengubah statusnya menjadi "Disetujui" jika ada pertimbangan baru (memerlukan peran yang sesuai).
                    </AlertDescription>
                </Alert>
            )}

            <div className="pt-4 border-t">
                <Label htmlFor="adminRating">Beri Rating Anggota (1-5)</Label>
                <div className="flex items-center gap-2 mt-1">
                    <Select 
                        value={currentAdminRating ? currentAdminRating.toString() : "0"} 
                        onValueChange={(val) => setCurrentAdminRating(parseInt(val))}
                        disabled={isProcessingAction}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Pilih Rating" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">Pilih Rating</SelectItem>
                            <SelectItem value="1">1 Bintang</SelectItem>
                            <SelectItem value="2">2 Bintang</SelectItem>
                            <SelectItem value="3">3 Bintang</SelectItem>
                            <SelectItem value="4">4 Bintang</SelectItem>
                            <SelectItem value="5">5 Bintang</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleSaveRating} disabled={isProcessingAction || currentAdminRating === (memberData.adminRating || 0) || currentAdminRating === 0}>
                         {isProcessingAction && currentAdminRating !== (memberData.adminRating || 0) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
                        Simpan Rating
                    </Button>
                </div>
                 {memberData.adminRating && <p className="text-xs text-muted-foreground mt-1">Rating saat ini: {memberData.adminRating} bintang.</p>}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

