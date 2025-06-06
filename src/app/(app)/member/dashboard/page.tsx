
'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { MemberRegistrationData } from "@/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserCircle, CheckCircle, AlertCircle, Clock, ShieldAlert, DollarSign, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";

const quickActionsMember = [
  { label: "Ajukan Fasilitas Baru", href: "/member/facilities/apply", icon: DollarSign },
  { label: "Lapor Perkembangan Usaha", href: "/member/facilities/reports", icon: FileText },
  { label: "Lihat Pengumuman Koperasi", href: "/member/announcements", icon: MessageSquare },
  { label: "Profil Saya", href: "/profile", icon: UserCircle },
];

export default function MemberDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [memberData, setMemberData] = useState<MemberRegistrationData | null>(null);
  const [memberLoading, setMemberLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return; // Tunggu otentikasi selesai
    }

    if (!user) {
      router.push('/login');
      setMemberLoading(false);
      return;
    }

    if (user.role !== 'member') {
      if (user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
      setMemberLoading(false);
      return;
    }

    // Pengguna adalah 'member', lanjutkan memuat data anggota
    if (user.uid) {
      setMemberLoading(true);
      const fetchMemberData = async () => {
        try {
          const memberDocRef = doc(db, "members", user.uid);
          const memberDocSnap = await getDoc(memberDocRef);
          if (memberDocSnap.exists()) {
            setMemberData(memberDocSnap.data() as MemberRegistrationData);
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
      };
      fetchMemberData();
    } else {
      console.warn("User UID tidak ditemukan untuk memuat data anggota.");
      setMemberData(null);
      setMemberLoading(false);
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat dasbor anggota...</p>
      </div>
    );
  }

  if (!user) {
    // Seharusnya sudah di-redirect oleh useEffect, ini fallback
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Mengalihkan ke halaman login...</p>
      </div>
    );
  }

  if (user.role !== 'member') {
    // Seharusnya sudah di-redirect oleh useEffect, ini fallback
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Mempersiapkan halaman...</p>
      </div>
    );
  }

  // Pada titik ini, user adalah 'member' dan authLoading selesai.
  const memberName = user.displayName || user.email || "Anggota Koperasi";

  const welcomeSection = (
    <Alert variant="default" className="shadow">
      <UserCircle className="h-5 w-5 text-primary" />
      <AlertTitle className="font-semibold text-lg text-accent">Selamat Datang, {memberName}!</AlertTitle>
      <AlertDescription>
        {memberLoading
          ? "Kami sedang menyiapkan detail keanggotaan Anda. Mohon tunggu sebentar..."
          : memberData
            ? "Berikut adalah ringkasan informasi dan layanan untuk Anda."
            : "Terjadi kesalahan saat memuat detail akun Anda dari server." 
        }
      </AlertDescription>
    </Alert>
  );

  // Fungsi untuk merender detail status keanggotaan
  const renderMemberStatusDetails = () => {
    if (!memberData) return null;

    let statusIcon: React.ReactNode = null;
    let statusColorClass: string = "";
    let statusText: string = "";
    let registrationDateFormatted: string = 'Tidak diketahui';
    let adminCommentsMessage: React.ReactNode = null;
    let pendingMessage: string | null = null;
    let approvedMessage: string | null = null;

    const memberStatus = memberData.status || 'Tidak Diketahui';

    try {
        if (memberData.registrationTimestamp) {
            let dateValue: Date | null = null;
            if (typeof memberData.registrationTimestamp === 'string') {
                dateValue = new Date(memberData.registrationTimestamp);
            } else if (typeof memberData.registrationTimestamp === 'object' && 
                       memberData.registrationTimestamp !== null && 
                       'seconds' in memberData.registrationTimestamp && 
                       typeof (memberData.registrationTimestamp as any).seconds === 'number') {
                dateValue = new Date((memberData.registrationTimestamp as any).seconds * 1000);
            } else if (memberData.registrationTimestamp instanceof Date) {
                 dateValue = memberData.registrationTimestamp as Date;
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
        statusText = "Aktif Terverifikasi";
        if (memberData.businessFields && memberData.businessFields.length > 0) {
           approvedMessage = `Anda terdaftar pada bidang usaha: ${memberData.businessFields.join(', ')}.` +
                             `${memberData.businessFields.includes('Lainnya') && memberData.otherBusinessField ? ` (${memberData.otherBusinessField})` : ''}`;
        }
        break;
      case 'pending':
        statusIcon = <Clock className="h-5 w-5 text-yellow-500" />;
        statusColorClass = "text-yellow-700 bg-yellow-100 border-yellow-300";
        statusText = "Menunggu Verifikasi Admin";
        pendingMessage = "Pendaftaran Anda sedang ditinjau oleh admin. Anda akan dihubungi jika ada pembaruan.";
        break;
      case 'rejected':
        statusIcon = <AlertCircle className="h-5 w-5 text-red-500" />;
        statusColorClass = "text-red-700 bg-red-100 border-red-300";
        statusText = "Pendaftaran Ditolak";
        if (memberData.adminComments) {
          adminCommentsMessage = (
            <div className="p-3 border-l-4 border-red-500 bg-red-50 rounded">
              <p className="font-semibold text-red-700">Komentar Admin:</p>
              <p className="text-sm text-red-600">{memberData.adminComments}</p>
            </div>
          );
        }
        break;
      default:
        statusIcon = <AlertCircle className="h-5 w-5 text-gray-500" />;
        statusColorClass = "text-gray-700 bg-gray-100 border-gray-300";
        statusText = `Status: ${memberStatus || 'Tidak Diketahui'}`;
    }
    
    return (
      <>
        <div className={`flex items-center p-3 rounded-md border ${statusColorClass}`}>
          {statusIcon}
          <p className="ml-2 font-semibold">{statusText}</p>
        </div>
        <p><strong>Tanggal Pendaftaran:</strong> {registrationDateFormatted}</p>
        {adminCommentsMessage}
        {pendingMessage && <p className="text-sm text-yellow-700">{pendingMessage}</p>}
        {approvedMessage && <p className="text-sm text-green-700">{approvedMessage}</p>}
      </>
    );
  };


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline font-bold text-primary">Dasbor Anggota</h1>
      </div>
      {welcomeSection}

      {memberLoading && (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Memuat detail keanggotaan...</p>
        </div>
      )}

      {!memberLoading && !memberData && (
        <Alert variant="destructive" className="shadow-lg">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle className="font-semibold text-xl">Terjadi Kesalahan Server</AlertTitle>
            <AlertDescription>
                Saat ini kami mengalami kendala dalam mengambil data keanggotaan Anda. Tim kami sedang berupaya memperbaikinya. Mohon coba beberapa saat lagi atau hubungi dukungan. Fitur ini akan segera berfungsi kembali.
            </AlertDescription>
        </Alert>
      )}

      {!memberLoading && memberData && (
        <>
          {/* Status Keanggotaan Card */}
          <Card className="shadow-lg border">
            <CardHeader>
              <CardTitle className="text-xl font-headline text-accent">Status Keanggotaan Anda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {renderMemberStatusDetails()}
            </CardContent>
          </Card>

          {/* Quick Actions & Notifications - Only if member is approved */}
          {memberData.status === 'approved' && (
            <>
              <Card className="shadow-lg border">
                <CardHeader>
                  <CardTitle className="text-xl font-headline text-accent">Menu Anggota</CardTitle>
                  <CardDescription>Akses cepat ke layanan dan informasi koperasi.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quickActionsMember.map((action) => (
                    <Button key={action.label} variant="outline" className="w-full justify-start p-4 h-auto text-left border-primary/30 hover:bg-primary/10" asChild>
                      <Link href={action.href}>
                        <action.icon className="h-6 w-6 mr-3 text-primary" />
                        <span className="flex flex-col">
                          <span className="font-semibold">{action.label}</span>
                        </span>
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-lg border">
                <CardHeader>
                  <CardTitle className="text-xl font-headline text-accent">Notifikasi & Aktivitas Terkini</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Belum ada notifikasi atau aktivitas terbaru.</p>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
