
// src/app/(app)/admin/members/[memberId]/page.tsx
'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import type { MemberRegistrationData } from '@/types';
import { cn } from '@/lib/utils'; // Added import for cn

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Eye, Loader2, ShieldAlert, UserCircle, Home, Briefcase, FileBadge, CheckSquare, Coins } from 'lucide-react';

const DetailItem: React.FC<{ label: string; value?: string | ReactNode; fullWidth?: boolean }> = ({ label, value, fullWidth }) => (
  <div className={cn("mb-3", fullWidth ? "col-span-2" : "")}>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    {typeof value === 'string' ? <p className="text-md text-foreground">{value || '-'}</p> : value || '-'}
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

  const isPdf = url.toLowerCase().includes('.pdf');
  // More robust image check
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const isImage = imageExtensions.some(ext => url.toLowerCase().endsWith(ext));


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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const memberId = params.memberId as string;

  const [memberData, setMemberData] = useState<MemberRegistrationData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas')) {
      router.push('/'); 
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (memberId) {
      const fetchMemberData = async () => {
        setPageLoading(true);
        setError(null);
        try {
          const memberDocRef = doc(db, 'members', memberId);
          const memberDocSnap = await getDoc(memberDocRef);

          if (memberDocSnap.exists()) {
            setMemberData(memberDocSnap.data() as MemberRegistrationData);
          } else {
            setError('Data anggota tidak ditemukan.');
          }
        } catch (err) {
          console.error("Error fetching member data:", err);
          setError('Gagal memuat data anggota.');
        } finally {
          setPageLoading(false);
        }
      };
      fetchMemberData();
    }
  }, [memberId]);

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat detail anggota...</p>
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
    new Date(memberData.birthDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric'}) :
    'Tidak diketahui';

  const getStatusBadge = (status: MemberRegistrationData['status']) => {
    switch (status) {
      case 'approved': return <Badge variant="default" className="bg-green-500 text-white">Disetujui</Badge>;
      case 'pending': return <Badge variant="secondary" className="bg-yellow-500 text-white">Menunggu Persetujuan</Badge>;
      case 'rejected': return <Badge variant="destructive">Ditolak</Badge>;
      case 'verified': return <Badge variant="default" className="bg-blue-500 text-white">Terverifikasi</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold text-primary">Detail Anggota: {memberData.fullName}</h1>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Anggota
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30">
            <UserCircle className="h-10 w-10 text-primary" />
            <div>
                <CardTitle className="text-2xl font-headline text-accent">Informasi Pribadi & Akun</CardTitle>
                <CardDescription>Data personal dan akun pendaftar.</CardDescription>
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
                <CardTitle className="text-2xl font-headline text-accent">Komitmen & Status</CardTitle>
                 <CardDescription>Komitmen keuangan dan status pendaftaran.</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailItem label="Setuju Komitmen Keuangan (Simpanan Pokok & Wajib)" value={memberData.agreedToCommitment ? "Ya" : "Tidak"} />
            <DetailItem label="Setuju Syarat & Ketentuan" value={memberData.agreedToTerms ? "Ya" : "Tidak"} />
            <DetailItem label="Setuju Menjadi Anggota" value={memberData.agreedToBecomeMember ? "Ya" : "Tidak"} />
            <DetailItem label="Tanggal Registrasi" value={registrationDate} />
            <DetailItem label="Status Pendaftaran" value={getStatusBadge(memberData.status)} />
             {memberData.adminComments && (
                <DetailItem label="Komentar Admin" value={memberData.adminComments} fullWidth />
             )}
        </CardContent>
      </Card>

      <Card>
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
      
      {/* Placeholder for Actions: Approve, Reject, Edit, etc. */}
      <Card>
        <CardHeader>
            <CardTitle>Aksi Admin</CardTitle>
        </CardHeader>
        <CardContent className="flex space-x-2">
            <Button variant="default" disabled>Setujui Pendaftaran (Segera Hadir)</Button>
            <Button variant="destructive" disabled>Tolak Pendaftaran (Segera Hadir)</Button>
            <Button variant="outline" disabled>Minta Perbaikan Data (Segera Hadir)</Button>
        </CardContent>
      </Card>

    </div>
  );
}

    
