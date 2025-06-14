
'use client';

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, collection, query, where, orderBy, getDocs, Timestamp, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { MemberRegistrationData, FacilityApplicationData, RequestedRecommendation } from "@/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCircle, CheckCircle, AlertCircle, Clock, ShieldAlert, DollarSign, FileText, MessageSquare, History, ListChecks, Send, Eye, MailQuestion, Edit3, Star, Handshake, BellRing, Wallet } from "lucide-react"; // Added Wallet
import ApplyFacilityForm from "@/components/member/apply-facility-form";
import MemberBadges from "@/components/member/member-badges"; // Import MemberBadges

// Re-define statusDisplay if not exported from types (or ensure it is exported)
const statusDisplayMemberFacility: Record<FacilityApplicationData['status'], string> = {
  pending_review: 'Sedang Direview',
  pending_approval: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled_by_member: 'Dibatalkan',
  requires_correction: 'Perlu Perbaikan Data'
};

const getStatusBadgeColorFacility = (status: FacilityApplicationData['status']) => {
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

const statusDisplayMemberRegistration: Record<MemberRegistrationData['status'], string> = {
  pending: 'Menunggu Verifikasi Admin',
  approved: 'Aktif Terverifikasi',
  rejected: 'Pendaftaran Ditolak',
  verified: 'Terverifikasi (Menunggu Persetujuan Akhir)',
  requires_correction: 'Data Perlu Diperbaiki',
};

interface PendingRecommendationRequest {
  applicationId: string;
  applicantName: string;
  facilityType: string;
  applicantUserId: string;
  applicationDate: Date;
}


export default function MemberDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [memberData, setMemberData] = useState<MemberRegistrationData | null>(null);
  const [memberLoading, setMemberLoading] = useState(true);
  const [recentApplications, setRecentApplications] = useState<FacilityApplicationData[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [isApplyFacilityModalOpen, setIsApplyFacilityModalOpen] = useState(false);
  const [pendingRecommendationRequests, setPendingRecommendationRequests] = useState<PendingRecommendationRequest[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);


  const fetchMemberData = useCallback(async () => {
    if (!user || !user.uid) {
      setMemberLoading(false);
      return;
    }
    setMemberLoading(true);
    try {
      const memberDocRef = doc(db, "members", user.uid);
      const memberDocSnap = await getDoc(memberDocRef);
      if (memberDocSnap.exists()) {
        const data = memberDocSnap.data() as MemberRegistrationData;
        let registrationDate: Date | string | undefined = data.registrationTimestamp;
        if (data.registrationTimestamp && typeof (data.registrationTimestamp as any).seconds === 'number') {
            registrationDate = new Date((data.registrationTimestamp as any).seconds * 1000);
        }
        setMemberData({ ...data, registrationTimestamp: registrationDate, adminRating: data.adminRating, recommendationsGivenCount: data.recommendationsGivenCount, currentPointsBalance: data.currentPointsBalance });
      } else {
        console.warn("Data anggota tidak ditemukan di Firestore untuk UID:", user.uid);
        setMemberData(null);
      }
    } catch (err) {
      console.error("Error memuat data anggota:", err);
      setMemberData(null);
    } finally {
      setMemberLoading(false);
    }
  }, [user]);

  const fetchRecentApplications = useCallback(async () => {
    if (!user || !user.uid || user.status !== 'approved') {
      setApplicationsLoading(false);
      return;
    }
    setApplicationsLoading(true);
    try {
      const q = query(
        collection(db, "facilityApplications"),
        where("userId", "==", user.uid),
        orderBy("applicationDate", "desc"),
        limit(3)
      );
      const querySnapshot = await getDocs(q);
      const apps = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<FacilityApplicationData, 'id'>),
        applicationDate: (docSnap.data().applicationDate as Timestamp)?.toDate(),
      })) as FacilityApplicationData[];
      setRecentApplications(apps);
    } catch (error) {
      console.error("Error fetching recent applications:", error);
      setRecentApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  }, [user]);

  const fetchPendingRecommendations = useCallback(async () => {
    if (!user || !user.uid) {
        setRecsLoading(false);
        return;
    }
    setRecsLoading(true);
    try {
        const applicationsRef = collection(db, 'facilityApplications');
        // Query for applications that might have pending recommendations
        const q = query(
            applicationsRef, 
            where('status', 'in', ['pending_review', 'pending_approval'])
        );

        const querySnapshot = await getDocs(q);
        const pendingRequests: PendingRecommendationRequest[] = [];
        
        querySnapshot.forEach(docSnap => {
            const app = docSnap.data() as FacilityApplicationData;
            
            // Ensure the current user is not the applicant for this specific list
            if (app.userId === user.uid) {
                return;
            }

            if (app.requestedRecommendations) {
                const userRecRequest = app.requestedRecommendations.find(
                    rec => rec.memberId === user.uid && rec.status === 'pending'
                );
                if (userRecRequest) {
                    pendingRequests.push({
                        applicationId: docSnap.id,
                        applicantName: app.memberFullName,
                        facilityType: app.specificProductName ? `${app.facilityType} (${app.specificProductName})` : app.facilityType,
                        applicantUserId: app.userId,
                        applicationDate: (app.applicationDate as Timestamp)?.toDate() || new Date(),
                    });
                }
            }
        });
         // Sort by application date, most recent first
        pendingRequests.sort((a, b) => b.applicationDate.getTime() - a.applicationDate.getTime());
        setPendingRecommendationRequests(pendingRequests);
    } catch (error) {
        console.error("Error fetching pending recommendations:", error);
    } finally {
        setRecsLoading(false);
    }
  }, [user]);


  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'member') {
      if (user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
      return;
    }

    fetchMemberData();
    if (user.status === 'approved') {
        fetchRecentApplications();
        fetchPendingRecommendations();
    } else {
        setApplicationsLoading(false);
        setRecsLoading(false);
    }

  }, [user, authLoading, router, fetchMemberData, fetchRecentApplications, fetchPendingRecommendations]);

  const handleFormSubmitSuccess = () => {
    setIsApplyFacilityModalOpen(false);
    fetchRecentApplications();
  };


  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat dasbor anggota...</p>
      </div>
    );
  }

  if (!user || user.role !== 'member') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Mempersiapkan halaman...</p>
      </div>
    );
  }

  const memberName = user.displayName || user.email || "Anggota Koperasi";

  const welcomeSection = (
    <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Dasbor Anggota</h1>
          {memberData && <MemberBadges memberData={memberData} className="mt-1" />}
        </div>
        <Alert variant="default" className="shadow max-w-md">
          <UserCircle className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-lg text-accent">Selamat Datang, {memberName}!</AlertTitle>
          <AlertDescription>
            {memberLoading
              ? "Kami sedang menyiapkan detail keanggotaan Anda..."
              : memberData
                ? "Berikut adalah ringkasan informasi dan layanan untuk Anda."
                : "Gagal memuat detail akun Anda."
            }
          </AlertDescription>
        </Alert>
    </div>
  );

  return (
    <div className="space-y-8">
      {welcomeSection}

      {memberLoading && (
        <Card className="shadow-lg border">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-md text-muted-foreground">Memuat detail keanggotaan...</p>
          </CardContent>
        </Card>
      )}

      {!memberLoading && !memberData && (
        <Alert variant="destructive" className="shadow-lg">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle className="font-semibold text-xl">Terjadi Kesalahan Server</AlertTitle>
            <AlertDescription>
                Saat ini kami mengalami kendala dalam mengambil data keanggotaan Anda. Tim kami sedang berupaya memperbaikinya. Mohon coba beberapa saat lagi atau hubungi dukungan.
            </AlertDescription>
        </Alert>
      )}

      {!memberLoading && memberData && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-lg border">
              <CardHeader>
                <CardTitle className="text-xl font-headline text-accent">Status Keanggotaan Anda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  let statusIcon: React.ReactNode = null;
                  let statusColorClass = "";
                  let registrationDateFormatted = 'Tidak diketahui';
                  let adminCommentsMessage: React.ReactNode = null;
                  let pendingMessage: string | null = null;
                  let approvedMessage: string | null = null;
                  let requiresCorrectionMessage: string | null = null;

                  const memberStatus = memberData.status || 'Tidak Diketahui';
                  const memberStatusText = statusDisplayMemberRegistration[memberStatus] || `Status: ${memberStatus}`;

                  try {
                      if (memberData.registrationTimestamp) {
                          let dateValue: Date | null = null;
                          if (memberData.registrationTimestamp instanceof Date) {
                              dateValue = memberData.registrationTimestamp;
                          } else if (typeof memberData.registrationTimestamp === 'string') {
                              dateValue = new Date(memberData.registrationTimestamp);
                          } else if (typeof memberData.registrationTimestamp === 'object' &&
                                    memberData.registrationTimestamp !== null &&
                                    'seconds' in (memberData.registrationTimestamp as any) &&
                                    typeof (memberData.registrationTimestamp as any).seconds === 'number') {
                              dateValue = new Date((memberData.registrationTimestamp as any).seconds * 1000);
                          }

                          if (dateValue && !isNaN(dateValue.getTime())) {
                              registrationDateFormatted = dateValue.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
                          } else {
                              registrationDateFormatted = 'Format tanggal tidak valid';
                          }
                      } else {
                        registrationDateFormatted = 'Tanggal tidak tersedia';
                      }
                  } catch (e) {
                      console.error("Error memformat tanggal registrasi:", e);
                      registrationDateFormatted = 'Error format tanggal';
                  }

                  switch (memberStatus) {
                    case 'approved':
                      statusIcon = <CheckCircle className="h-5 w-5 text-green-500" />;
                      statusColorClass = "text-green-700 bg-green-100 border-green-300";
                      approvedMessage = "Anda dapat mengakses semua fasilitas koperasi yang tersedia.";
                      if (memberData.businessFields && memberData.businessFields.length > 0) {
                        approvedMessage += ` Anda terdaftar pada bidang usaha: ${memberData.businessFields.join(', ')}.` +
                                          `${memberData.businessFields.includes('Lainnya') && memberData.otherBusinessField ? ` (${memberData.otherBusinessField})` : ''}`;
                      }
                      break;
                    case 'pending':
                      statusIcon = <Clock className="h-5 w-5 text-yellow-500" />;
                      statusColorClass = "text-yellow-700 bg-yellow-100 border-yellow-300";
                      pendingMessage = "Pendaftaran Anda sedang ditinjau. Fitur pengajuan fasilitas akan aktif setelah disetujui.";
                      break;
                    case 'rejected':
                      statusIcon = <AlertCircle className="h-5 w-5 text-red-500" />;
                      statusColorClass = "text-red-700 bg-red-100 border-red-300";
                      if (memberData.adminComments) {
                        adminCommentsMessage = (
                          <div className="p-3 border-l-4 border-red-500 bg-red-50 rounded mt-2">
                            <p className="font-semibold text-red-700">Komentar Admin:</p>
                            <p className="text-sm text-red-600">{memberData.adminComments}</p>
                          </div>
                        );
                      }
                      break;
                    case 'verified':
                      statusIcon = <CheckCircle className="h-5 w-5 text-blue-500" />;
                      statusColorClass = "text-blue-700 bg-blue-100 border-blue-300";
                      pendingMessage = "Akun Anda terverifikasi, menunggu persetujuan akhir dari admin untuk fasilitas.";
                      break;
                    case 'requires_correction':
                      statusIcon = <Edit3 className="h-5 w-5 text-orange-500" />;
                      statusColorClass = "text-orange-700 bg-orange-100 border-orange-300";
                      requiresCorrectionMessage = "Admin meminta Anda untuk memperbaiki data pendaftaran.";
                      if (memberData.adminComments) {
                        adminCommentsMessage = (
                          <div className="p-3 border-l-4 border-orange-500 bg-orange-50 rounded mt-2">
                            <p className="font-semibold text-orange-700">Komentar Admin:</p>
                            <p className="text-sm text-orange-600">{memberData.adminComments}</p>
                            <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-orange-600" asChild>
                              <Link href="/profile/edit">Perbaiki Data Sekarang</Link>
                            </Button>
                          </div>
                        );
                      }
                      break;
                    default:
                      statusIcon = <AlertCircle className="h-5 w-5 text-gray-500" />;
                      statusColorClass = "text-gray-700 bg-gray-100 border-gray-300";
                  }

                  return (
                    <>
                      <div className={`flex items-center p-3 rounded-md border ${statusColorClass}`}>
                        {statusIcon}
                        <p className="ml-2 font-semibold">{memberStatusText}</p>
                      </div>
                      <p><strong>Nomor Anggota:</strong> {memberData.memberIdNumber || 'Belum Ditetapkan'}</p>
                      <p><strong>Tanggal Pendaftaran:</strong> {registrationDateFormatted}</p>
                      {memberData.adminRating && memberData.adminRating > 0 && (
                          <div className="pt-2">
                              <p className="font-semibold text-sm">Rating dari Koperasi:</p>
                              <div className="flex items-center">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                      key={i}
                                      className={`h-5 w-5 ${i < memberData.adminRating! ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                                      />
                                  ))}
                                  <span className="ml-2 text-xs text-muted-foreground">({memberData.adminRating} dari 5 bintang)</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Ini adalah penilaian umum dari koperasi. Jaga terus kepercayaan dan partisipasi Anda!</p>
                          </div>
                      )}
                      {(memberData.recommendationsGivenCount !== undefined && memberData.recommendationsGivenCount >= 0) && (
                        <div className="pt-2">
                          <p className="font-semibold text-sm flex items-center">
                            <Handshake className="mr-2 h-4 w-4 text-primary" /> Rekomendasi Diberikan:
                          </p>
                          <p className="text-md">{memberData.recommendationsGivenCount} kali</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Terima kasih atas kontribusi Anda dalam memberikan rekomendasi!
                          </p>
                        </div>
                      )}
                      {adminCommentsMessage}
                      {pendingMessage && <p className="text-sm text-yellow-700">{pendingMessage}</p>}
                      {approvedMessage && <p className="text-sm text-green-700">{approvedMessage}</p>}
                      {requiresCorrectionMessage && !adminCommentsMessage && <p className="text-sm text-orange-700">{requiresCorrectionMessage}</p>}
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            <Card className="shadow-lg border">
              <CardHeader>
                <CardTitle className="text-xl font-headline text-accent flex items-center">
                    <Wallet className="mr-2 h-6 w-6"/> Dompet Poin Saya
                </CardTitle>
                <CardDescription>Lihat saldo poin Anda dan riwayat transaksi poin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Saldo Poin Saat Ini:</p>
                    <p className="text-4xl font-bold text-primary">
                        {(memberData.currentPointsBalance || 0).toLocaleString('id-ID')} Poin
                    </p>
                </div>
                <Alert variant="default" className="bg-blue-50 border-blue-300 text-blue-700">
                    <ShieldAlert className="h-4 w-4 text-blue-600"/>
                    <AlertTitle className="text-blue-800 font-semibold">Segera Hadir</AlertTitle>
                    <AlertDescription>
                        Fitur riwayat transaksi poin dan penukaran poin akan segera tersedia di sini.
                    </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>


          {memberData.status === 'approved' && (
            <>
              <Card className="shadow-lg border">
                <CardHeader>
                  <CardTitle className="text-xl font-headline text-accent">Menu Anggota</CardTitle>
                  <CardDescription>Akses cepat ke layanan dan informasi koperasi.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Dialog open={isApplyFacilityModalOpen} onOpenChange={setIsApplyFacilityModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full justify-start p-4 h-auto text-left border-primary/30 hover:bg-primary/10">
                                <Send className="h-6 w-6 mr-3 text-primary" />
                                <span className="flex flex-col"><span className="font-semibold">Ajukan Fasilitas Baru</span></span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-headline text-primary">Formulir Pengajuan Produk Koperasi</DialogTitle>
                                <DialogDescription>Isi semua data yang diperlukan dengan benar dan lengkap.</DialogDescription>
                            </DialogHeader>
                            <ApplyFacilityForm onFormSubmitSuccess={handleFormSubmitSuccess} className="py-4"/>
                            <DialogFooter>
                               <DialogClose asChild><Button variant="outline">Tutup</Button></DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" className="w-full justify-start p-4 h-auto text-left border-primary/30 hover:bg-primary/10" asChild>
                      <Link href="/member/facilities/history">
                        <History className="h-6 w-6 mr-3 text-primary" />
                        <span className="flex flex-col"><span className="font-semibold">Riwayat Pengajuan Fasilitas</span></span>
                      </Link>
                    </Button>
                     <Button variant="outline" className="w-full justify-start p-4 h-auto text-left border-primary/30 hover:bg-primary/10" asChild>
                      <Link href="/member/facilities/reports">
                        <FileText className="h-6 w-6 mr-3 text-primary" />
                        <span className="flex flex-col"><span className="font-semibold">Lapor Perkembangan Usaha</span></span>
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start p-4 h-auto text-left border-primary/30 hover:bg-primary/10" asChild>
                      <Link href="/member/announcements">
                        <MessageSquare className="h-6 w-6 mr-3 text-primary" />
                        <span className="flex flex-col"><span className="font-semibold">Lihat Pengumuman Koperasi</span></span>
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start p-4 h-auto text-left border-primary/30 hover:bg-primary/10" asChild>
                      <Link href="/profile">
                        <UserCircle className="h-6 w-6 mr-3 text-primary" />
                        <span className="flex flex-col"><span className="font-semibold">Profil Saya</span></span>
                      </Link>
                    </Button>
                </CardContent>
              </Card>

              <Card className="shadow-lg border">
                <CardHeader>
                  <CardTitle className="text-xl font-headline text-accent flex items-center">
                    <BellRing className="mr-2 h-6 w-6" /> Permintaan Rekomendasi untuk Anda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recsLoading ? (
                    <div className="flex items-center justify-center py-6"><Loader2 className="h-8 w-8 animate-spin mr-2 text-primary" /> Memuat permintaan...</div>
                  ) : pendingRecommendationRequests.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Pemohon</TableHead>
                          <TableHead className="hidden sm:table-cell">Jenis Fasilitas</TableHead>
                          <TableHead className="hidden md:table-cell">Tgl. Pengajuan</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRecommendationRequests.map(req => (
                          <TableRow key={req.applicationId}>
                            <TableCell className="font-medium">{req.applicantName}</TableCell>
                            <TableCell className="hidden sm:table-cell">{req.facilityType}</TableCell>
                            <TableCell className="hidden md:table-cell">{req.applicationDate.toLocaleDateString('id-ID')}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/member/recommendations/${req.applicationId}`}>
                                  <Handshake className="mr-1 h-4 w-4" /> Beri Rekomendasi
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Alert>
                      <BellRing className="h-4 w-4"/>
                      <AlertTitle>Tidak Ada Permintaan</AlertTitle>
                      <AlertDescription>Saat ini tidak ada anggota lain yang meminta rekomendasi dari Anda.</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg border">
                  <CardHeader>
                      <CardTitle className="text-xl font-headline text-accent flex items-center">
                          <ListChecks className="mr-2 h-6 w-6" /> Riwayat Pengajuan Fasilitas Terbaru
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      {applicationsLoading ? (
                          <div className="flex items-center justify-center py-6"><Loader2 className="h-8 w-8 animate-spin mr-2 text-primary" /> Memuat data pengajuan...</div>
                      ) : recentApplications.length > 0 ? (
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Jenis Fasilitas</TableHead>
                                      <TableHead className="hidden sm:table-cell">Tgl. Pengajuan</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead className="text-right">Aksi</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {recentApplications.map(app => (
                                      <TableRow key={app.id}>
                                          <TableCell className="font-medium">{app.facilityType}{app.facilityType === 'Lainnya' && app.specificProductName ? ` (${app.specificProductName})` : ''}</TableCell>
                                          <TableCell className="hidden sm:table-cell">{app.applicationDate instanceof Date ? app.applicationDate.toLocaleDateString('id-ID') : 'N/A'}</TableCell>
                                          <TableCell>
                                              <Badge className={`text-white ${getStatusBadgeColorFacility(app.status)}`}>
                                                  {statusDisplayMemberFacility[app.status] || app.status}
                                              </Badge>
                                          </TableCell>
                                          <TableCell className="text-right">
                                              <Button variant="outline" size="sm" asChild>
                                                <Link href={`/member/facilities/history#${app.id}`}>
                                                  <Eye className="mr-1 h-4 w-4" /> Detail
                                                </Link>
                                              </Button>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      ) : (
                          <Alert>
                            <History className="h-4 w-4"/>
                            <AlertTitle>Belum Ada Pengajuan</AlertTitle>
                            <AlertDescription>Anda belum memiliki pengajuan fasilitas terbaru.</AlertDescription>
                          </Alert>
                      )}
                       <Button variant="link" asChild className="mt-4 p-0 h-auto text-sm">
                            <Link href="/member/facilities/history">Lihat Semua Riwayat Pengajuan &rarr;</Link>
                        </Button>
                  </CardContent>
              </Card>

              <Card className="shadow-lg border">
                  <CardHeader>
                      <CardTitle className="text-xl font-headline text-accent flex items-center">
                          <MailQuestion className="mr-2 h-6 w-6" /> Pesan & Notifikasi
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <Alert>
                          <MessageSquare className="h-4 w-4" />
                          <AlertTitle>Segera Hadir</AlertTitle>
                          <AlertDescription>Fitur pesan dan notifikasi dari admin akan segera tersedia di sini.</AlertDescription>
                      </Alert>
                  </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

