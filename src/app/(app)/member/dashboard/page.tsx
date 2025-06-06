
// Use client for potential interactions or data fetching hooks
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, FileText, MessageSquare, UserCircle, CheckCircle, AlertCircle, Clock, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MemberRegistrationData } from "@/types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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
    if (!authLoading) {
      if (user) {
        if (user.role !== 'member') {
          if (user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas') {
            router.push('/admin/dashboard');
          } else {
            router.push('/');
          }
          return; // Important: stop further execution in this effect if redirecting
        }

        // User is a 'member', proceed to fetch their specific data
        setMemberLoading(true); // Ensure loading state is true before fetch
        const fetchMemberData = async () => {
          if (user.uid) { // Ensure UID exists
            try {
              const memberDocRef = doc(db, "members", user.uid);
              const memberDocSnap = await getDoc(memberDocRef);
              if (memberDocSnap.exists()) {
                setMemberData(memberDocSnap.data() as MemberRegistrationData);
              } else {
                console.warn("Member data not found in Firestore for UID:", user.uid);
                setMemberData(null); // Explicitly set to null if document not found
              }
            } catch (err) {
              console.error("Error fetching member data:", err);
              setMemberData(null); // Set to null on error to indicate failure
            } finally {
              setMemberLoading(false);
            }
          } else {
            console.warn("User object present, but UID is missing for member data fetch.");
            setMemberData(null);
            setMemberLoading(false);
          }
        };
        fetchMemberData();

      } else {
        // No user after authLoading is false, redirect to login
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  // Primary loading state from AuthContext
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat dasbor anggota...</p>
      </div>
    );
  }

  // If user is not loaded or not a member after authLoading is false,
  // useEffect is handling redirection. Show a generic loader.
  if (!user || user.role !== 'member') {
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
           <Loader2 className="h-12 w-12 animate-spin text-primary" />
           <p className="ml-4 text-lg text-muted-foreground">Mempersiapkan halaman...</p>
       </div>
    );
  }

  // At this point, user is authenticated, role is 'member', and authLoading is false.
  const memberName = user.displayName || user.email || "Anggota Koperasi";

  // Prepare status card variables if memberData exists
  let statusIcon, statusColorClass, statusText, registrationDateFormatted, adminCommentsMessage, pendingMessage, approvedMessage;
  if (memberData) {
    const memberStatus = memberData.status || 'Tidak Diketahui';
    registrationDateFormatted = memberData.registrationTimestamp ?
      new Date((memberData.registrationTimestamp as any).seconds * 1000).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) :
      'Tidak diketahui';

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
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline font-bold text-primary">Dasbor Anggota</h1>
      </div>

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

      {memberLoading && (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Memuat detail keanggotaan...</p>
        </div>
      )}

      {!memberLoading && !memberData && (
        <Alert variant="destructive" className="shadow-lg">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle className="font-semibold text-xl">Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
                Saat ini kami mengalami kendala dalam mengambil data keanggotaan Anda dari server. Tim kami sedang berupaya memperbaikinya. Mohon coba beberapa saat lagi atau hubungi dukungan.
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
              <div className={`flex items-center p-3 rounded-md border ${statusColorClass}`}>
                {statusIcon}
                <p className="ml-2 font-semibold">{statusText}</p>
              </div>
              <p><strong>Tanggal Pendaftaran:</strong> {registrationDateFormatted}</p>
              {adminCommentsMessage}
              {pendingMessage && <p className="text-sm text-yellow-700">{pendingMessage}</p>}
              {approvedMessage && <p className="text-sm text-green-700">{approvedMessage}</p>}
            </CardContent>
          </Card>

          {/* Quick Actions & Notifications (Only if member is approved) */}
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
                </Header>
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
