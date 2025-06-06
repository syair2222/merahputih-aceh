
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
import { ArrowLeft, ShieldAlert, Loader2, UserCircle, ThumbsUp, ThumbsDown, MessageSquare, Send, CheckCircle, XCircle, Info } from 'lucide-react';
import type { FacilityApplicationData, RequestedRecommendation } from '@/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

const DetailItem: React.FC<{ label: string; value?: string | React.ReactNode }> = ({ label, value }) => (
  <div className="mb-3">
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-md text-foreground whitespace-pre-wrap">{typeof value === 'string' ? (value || '-') : value}</p>
  </div>
);

export default function MemberProvideRecommendationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const applicationId = params.applicationId as string;
  const { toast } = useToast();

  const [application, setApplication] = useState<FacilityApplicationData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommenderComment, setRecommenderComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRecommendationStatus, setUserRecommendationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  const fetchApplicationAndVerify = useCallback(async () => {
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
        const appData = appDocSnap.data() as FacilityApplicationData;
        const userRecRequest = appData.requestedRecommendations?.find(rec => rec.memberId === user.uid);

        if (userRecRequest) {
          setApplication({ id: appDocSnap.id, ...appData });
          setUserRecommendationStatus(userRecRequest.status);
          setRecommenderComment(userRecRequest.comment || '');
        } else {
          setError('Anda tidak diminta untuk memberikan rekomendasi untuk pengajuan ini, atau permintaan sudah tidak valid.');
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
  }, [applicationId, user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'member') {
        router.push('/');
      } else {
        fetchApplicationAndVerify();
      }
    }
  }, [user, authLoading, router, fetchApplicationAndVerify]);

  const handleRecommendationDecision = async (decision: 'approved' | 'rejected') => {
    if (!application || !user || userRecommendationStatus !== 'pending') {
      toast({ title: "Tidak Dapat Memproses", description: "Status rekomendasi sudah final atau ada kesalahan.", variant: "destructive" });
      return;
    }
    if (decision === 'rejected' && !recommenderComment.trim()) {
        toast({ title: "Komentar Wajib", description: "Mohon isi alasan jika Anda tidak merekomendasikan.", variant: "destructive"});
        return;
    }

    setIsSubmitting(true);
    try {
      const appDocRef = doc(db, 'facilityApplications', application.id!);
      const currentRequestedRecommendations = application.requestedRecommendations || [];
      
      const updatedRecommendations = currentRequestedRecommendations.map(rec => {
        if (rec.memberId === user.uid) {
          return {
            ...rec,
            status: decision,
            comment: recommenderComment.trim(),
            decisionDate: serverTimestamp(),
          };
        }
        return rec;
      });

      const updatePayload: any = {
        requestedRecommendations: updatedRecommendations,
        lastUpdated: serverTimestamp(),
      };

      if (decision === 'approved') {
        updatePayload.recommendationCount = increment(1);
      }
      
      await updateDoc(appDocRef, updatePayload);
      
      toast({ title: "Rekomendasi Terkirim", description: `Anda telah ${decision === 'approved' ? 'menyetujui' : 'menolak'} rekomendasi ini.` });
      setUserRecommendationStatus(decision); // Update local status
      // Optionally, refresh data from server: fetchApplicationAndVerify();
    } catch (err) {
      console.error("Error submitting recommendation:", err);
      toast({ title: "Gagal Mengirim Rekomendasi", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat detail permintaan rekomendasi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor</Button>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center p-10">
        <Alert><AlertTitle>Informasi</AlertTitle><AlertDescription>Tidak ada data pengajuan untuk ditampilkan.</AlertDescription></Alert>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor</Button>
      </div>
    );
  }

  const appDateFormatted = application.applicationDate instanceof Timestamp 
    ? application.applicationDate.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) 
    : 'Tidak diketahui';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold text-primary">Berikan Rekomendasi</h1>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor</Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-2xl font-headline text-accent">Permintaan Rekomendasi dari: {application.memberFullName}</CardTitle>
          <CardDescription>Nomor Anggota Pemohon: {application.memberIdNumber || 'N/A'} | Tanggal Pengajuan: {appDateFormatted}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <DetailItem label="Jenis Fasilitas Diajukan" value={application.facilityType === 'Lainnya' && application.specificProductName ? `${application.facilityType} (${application.specificProductName})` : application.facilityType} />
          <DetailItem label="Jumlah/Kuantitas Diajukan" value={application.quantityOrAmount} />
          <DetailItem label="Tujuan Penggunaan Fasilitas" value={application.purpose} />
           {application.memberBusinessArea && <DetailItem label="Bidang Usaha Pemohon" value={application.memberBusinessArea === 'Lainnya' && application.otherMemberBusinessArea ? `${application.memberBusinessArea} (${application.otherMemberBusinessArea})` : application.memberBusinessArea} />}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" /> Keputusan Rekomendasi Anda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userRecommendationStatus === 'pending' ? (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Pertimbangkan dengan Baik</AlertTitle>
                <AlertDescription>
                  Rekomendasi Anda akan menjadi salah satu pertimbangan penting bagi admin dalam menyetujui pengajuan ini.
                  Berikan keputusan yang jujur dan bertanggung jawab.
                </AlertDescription>
              </Alert>
              <div>
                <Label htmlFor="recommenderComment">Komentar/Alasan (Wajib jika tidak merekomendasikan)</Label>
                <Textarea
                  id="recommenderComment"
                  value={recommenderComment}
                  onChange={(e) => setRecommenderComment(e.target.value)}
                  placeholder="Tuliskan komentar atau alasan Anda di sini..."
                  rows={3}
                  className="mt-1"
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={() => handleRecommendationDecision('approved')} variant="default" className="bg-green-600 hover:bg-green-700 text-white" disabled={isSubmitting}>
                  <ThumbsUp className="mr-2 h-4 w-4" /> Rekomendasikan / Setujui
                </Button>
                <Button onClick={() => handleRecommendationDecision('rejected')} variant="destructive" disabled={isSubmitting}>
                  <ThumbsDown className="mr-2 h-4 w-4" /> Tidak Rekomendasikan / Tolak
                </Button>
                {isSubmitting && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>
            </>
          ) : userRecommendationStatus === 'approved' ? (
            <Alert variant="default" className="bg-green-50 border-green-300">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-700 font-semibold">Anda Telah Merekomendasikan</AlertTitle>
              <AlertDescription className="text-green-600">
                Terima kasih atas partisipasi Anda. Keputusan Anda: Disetujui.
                {application.requestedRecommendations?.find(r => r.memberId === user?.uid)?.comment && (
                  <p className="mt-1 text-xs">Komentar Anda: {application.requestedRecommendations?.find(r => r.memberId === user?.uid)?.comment}</p>
                )}
              </AlertDescription>
            </Alert>
          ) : userRecommendationStatus === 'rejected' ? (
            <Alert variant="destructive">
              <XCircle className="h-5 w-5" />
              <AlertTitle className="font-semibold">Anda Telah Menolak Rekomendasi</AlertTitle>
              <AlertDescription>
                Keputusan Anda: Ditolak.
                {application.requestedRecommendations?.find(r => r.memberId === user?.uid)?.comment && (
                  <p className="mt-1 text-xs">Komentar Anda: {application.requestedRecommendations?.find(r => r.memberId === user?.uid)?.comment}</p>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Status Tidak Valid</AlertTitle>
                <AlertDescription>Tidak dapat memproses permintaan rekomendasi ini.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
