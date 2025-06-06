
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
  const { user, loading: authLoading } = useAuth(); // Renamed loading to authLoading
  const router = useRouter();
  const [memberData, setMemberData] = useState<MemberRegistrationData | null>(null);
  const [memberLoading, setMemberLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) { // Only proceed if auth state is resolved
      if (user) {
        if (user.role !== 'member') {
          // If user is logged in but not a 'member', redirect (e.g. admin to admin dash)
          if (user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas') {
            router.push('/admin/dashboard');
          } else {
            router.push('/'); // Or a page for prospective members, or login if role is unexpected
          }
        } else {
          // User is a 'member', fetch detailed member data
          const fetchMemberData = async () => {
            setMemberLoading(true);
            if (user.uid) {
              const memberDocRef = doc(db, "members", user.uid);
              const memberDocSnap = await getDoc(memberDocRef);
              if (memberDocSnap.exists()) {
                setMemberData(memberDocSnap.data() as MemberRegistrationData);
              } else {
                console.warn("Member data not found in Firestore for UID:", user.uid);
                // This case could happen if member doc creation failed or was deleted
                // User might be stuck if their 'users' doc says 'member' but 'members' doc is missing.
                // Consider redirecting to an error page or logout.
                setMemberData(null); // Ensure memberData is null if not found
              }
            }
            setMemberLoading(false);
          };
          fetchMemberData();
        }
      } else {
        // No user, and auth is not loading, redirect to login
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || memberLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat dasbor anggota...</p>
      </div>
    );
  }

  // This check is important AFTER loading states are false.
  // It handles cases where user becomes null after loading, or role is still incorrect.
  if (!user || user.role !== 'member') {
     return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
            <Alert variant="destructive" className="max-w-md">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Akses Ditolak</AlertTitle>
                <AlertDescription>Anda tidak memiliki izin untuk mengakses halaman ini atau sesi Anda telah berakhir. Pastikan Anda login sebagai anggota.</AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/login')} className="mt-6">
              Ke Halaman Login
            </Button>
        </div>
     );
  }
  
  // At this point, user is definitely a 'member' and memberData might be loaded or still loading if fetch is slow
  // However, memberLoading should be false if we reach here due to the loading check above.
  // So, if memberData is null here, it means it wasn't found.

  if (!memberData && !memberLoading) { // Check memberData only if memberLoading is also false
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
            <Alert variant="destructive" className="max-w-md">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Data Anggota Tidak Ditemukan</AlertTitle>
                <AlertDescription>
                    Tidak dapat memuat detail keanggotaan Anda. Ini mungkin terjadi jika pendaftaran Anda belum lengkap atau ada masalah dengan data Anda.
                    Silakan hubungi admin koperasi jika masalah berlanjut.
                </AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/')} className="mt-6">
              Kembali ke Beranda
            </Button>
        </div>
    );
  }


  const memberName = user.displayName || user.email;
  const memberStatus = memberData?.status || 'Tidak Diketahui'; // Use memberData status
  const registrationDate = memberData?.registrationTimestamp ? 
    new Date( (memberData.registrationTimestamp as any).seconds * 1000).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric'}) :
    'Tidak diketahui';

  let statusIcon;
  let statusColorClass;
  let statusText;

  switch (memberStatus) {
    case 'approved':
      statusIcon = <CheckCircle className="h-5 w-5 text-green-500" />;
      statusColorClass = "text-green-600 bg-green-100";
      statusText = "Aktif Terverifikasi";
      break;
    case 'pending':
      statusIcon = <Clock className="h-5 w-5 text-yellow-500" />;
      statusColorClass = "text-yellow-600 bg-yellow-100";
      statusText = "Menunggu Verifikasi Admin";
      break;
    case 'rejected':
      statusIcon = <AlertCircle className="h-5 w-5 text-red-500" />;
      statusColorClass = "text-red-600 bg-red-100";
      statusText = "Pendaftaran Ditolak";
      break;
    default:
      statusIcon = <AlertCircle className="h-5 w-5 text-gray-500" />;
      statusColorClass = "text-gray-600 bg-gray-100";
      statusText = `Status: ${memberStatus}`; // More generic for unknown or new statuses
  }


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline font-bold text-primary">Dasbor Anggota</h1>
        <span className="text-sm text-muted-foreground">Selamat datang, {memberName}!</span>
      </div>

      {/* Member Status Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Status Keanggotaan Anda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={`flex items-center p-3 rounded-md ${statusColorClass}`}>
            {statusIcon}
            <p className="ml-2 font-semibold">{statusText}</p>
          </div>
          <p><strong>Tanggal Pendaftaran:</strong> {registrationDate}</p>
          {memberData?.adminComments && memberStatus === 'rejected' && (
            <div className="p-3 border-l-4 border-red-500 bg-red-50 rounded">
              <p className="font-semibold text-red-700">Komentar Admin:</p>
              <p className="text-sm text-red-600">{memberData.adminComments}</p>
            </div>
          )}
           {memberStatus === 'pending' && (
            <p className="text-sm text-yellow-700">Pendaftaran Anda sedang ditinjau oleh admin. Anda akan dihubungi jika ada pembaruan.</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions - only if approved */}
      {memberStatus === 'approved' && (
        <Card className="shadow-lg">
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
      )}

      {/* Recent Activity / Notifications (Placeholder) */}
      {memberStatus === 'approved' && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-accent">Notifikasi & Aktivitas Terkini</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Belum ada notifikasi atau aktivitas terbaru.</p>
            {/* Example:
            <div className="py-2 border-b last:border-b-0">
              <p className="font-medium">Pengajuan pinjaman Anda telah disetujui!</p>
              <p className="text-xs text-muted-foreground">1 hari yang lalu</p>
            </div>
            */}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
