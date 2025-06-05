
// Use client for potential interactions or data fetching hooks
'use client'; 

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, FileText, MessageSquare, UserCircle, CheckCircle, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MemberRegistrationData } from "@/types";

// Dummy data for member stats/info
const memberInfoExample = {
  status: "Aktif", // "Aktif", "Pending Verifikasi", "Ditolak"
  joinDate: "15 Januari 2024",
  activeLoans: 1,
  totalSavings: "Rp 1.250.000",
};

const quickActionsMember = [
  { label: "Ajukan Fasilitas Baru", href: "/member/facilities/apply", icon: DollarSign },
  { label: "Lapor Perkembangan Usaha", href: "/member/facilities/reports", icon: FileText },
  { label: "Lihat Pengumuman Koperasi", href: "/member/announcements", icon: MessageSquare },
  { label: "Profil Saya", href: "/profile", icon: UserCircle },
];

export default function MemberDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [memberData, setMemberData] = useState<MemberRegistrationData | null>(null);
  const [memberLoading, setMemberLoading] = useState(true);

  useEffect(() => {
    if (!loading && user && user.role !== 'member') {
      // If user is logged in but not a 'member', redirect (e.g. admin to admin dash)
      if (user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas') {
        router.push('/admin/dashboard');
      } else {
        router.push('/'); // Or a page for prospective members
      }
    } else if (!loading && user && user.role === 'member') {
      // Fetch detailed member data
      const fetchMemberData = async () => {
        setMemberLoading(true);
        if (user.uid) {
          const memberDocRef = doc(db, "members", user.uid);
          const memberDocSnap = await getDoc(memberDocRef);
          if (memberDocSnap.exists()) {
            setMemberData(memberDocSnap.data() as MemberRegistrationData);
          } else {
            console.warn("Member data not found in Firestore for UID:", user.uid);
            // This case should ideally not happen for an approved member
          }
        }
        setMemberLoading(false);
      };
      fetchMemberData();
    }
  }, [user, loading, router]);

  if (loading || memberLoading) {
    return <div className="text-center p-10">Memuat dasbor anggota...</div>;
  }

  if (!user || user.role !== 'member') {
     return <div className="text-center p-10">Anda tidak memiliki akses ke halaman ini atau sesi Anda telah berakhir. Silakan login kembali.</div>;
  }
  
  const memberName = user.displayName || user.email;
  const memberStatus = memberData?.status || 'Tidak Diketahui';
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
      statusText = "Status Tidak Diketahui";
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

