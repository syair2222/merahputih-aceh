
// Use client for potential interactions or data fetching hooks
'use client'; 

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Users, FileText, MessageSquare, DollarSign, Settings, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Dummy data for dashboard stats
const dashboardStats = [
  { title: "Total Pendaftar", value: "150", icon: Users, color: "text-blue-500", link: "/admin/members?status=pending" },
  { title: "Anggota Terverifikasi", value: "120", icon: Users, color: "text-green-500", link: "/admin/members?status=approved" },
  { title: "Pengajuan Fasilitas", value: "15", icon: DollarSign, color: "text-yellow-500", link: "/admin/facilities?status=pending" },
  { title: "Pengumuman Aktif", value: "5", icon: MessageSquare, color: "text-purple-500", link: "/admin/announcements" },
];

const quickActions = [
  { label: "Verifikasi Anggota Baru", href: "/admin/applications", icon: FileText },
  { label: "Buat Pengumuman", href: "/admin/announcements/new", icon: MessageSquare }, // Placeholder for new announcement
  { label: "Lihat Laporan Keuangan", href: "/admin/reports", icon: BarChart },
  { label: "Pengaturan Koperasi", href: "/admin/settings", icon: Settings }, // Should link to /settings or a specific /admin/settings page
];

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) {
      return; // Tunggu otentikasi selesai
    }

    if (!user) {
      router.push('/login'); // Arahkan jika tidak login
      return;
    }

    if (!(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas')) {
      router.push('/'); // Arahkan jika bukan admin
      return;
    }
    // Jika semua pemeriksaan lolos, halaman dapat dirender.
  }, [user, authLoading, router]);


  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat dasbor admin...</p>
      </div>
    );
  }

  // Pada titik ini, authLoading false.
  // useEffect menangani redirect. Jika kita sampai di sini dan kondisi di useEffect
  // untuk redirect terpenuhi, redirect akan terjadi.
  // Kita hanya merender dasbor jika pengguna ADALAH admin.

  if (!user || !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas')) {
    // State ini bersifat transisi sementara useEffect melakukan redirect.
    // Atau jika useEffect gagal, ini adalah fallback.
     return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Mempersiapkan halaman...</p>
        </div>
     );
  }
  
  // Pengguna terotentikasi dan adalah admin. Render dasbor.
  const adminName = user.displayName || user.email;


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline font-bold text-primary">Dasbor Admin</h1>
        <span className="text-sm text-muted-foreground">Selamat datang, {adminName}!</span>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <Link href={stat.link || '#'} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Lihat Detail &rarr;
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Aksi Cepat</CardTitle>
          <CardDescription>Akses cepat ke fitur-fitur penting admin.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
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

      {/* Recent Activity / Pending Tasks (Placeholder) */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Aktivitas Terbaru & Tugas Tertunda</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Belum ada data aktivitas terbaru atau tugas tertunda.</p>
          {/* Example item:
          <div className="flex items-center justify-between py-2 border-b last:border-b-0">
            <div>
              <p className="font-medium">Pendaftar baru: Budi Santoso</p>
              <p className="text-xs text-muted-foreground">2 jam yang lalu</p>
            </div>
            <Button variant="ghost" size="sm" asChild><Link href="/admin/members/xxx">Verifikasi</Link></Button>
          </div> 
          */}
        </CardContent>
      </Card>
      
      {/* Data Export Section (Placeholder) */}
       {(user.role === 'admin_utama' || user.role === 'dinas') && ( 
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-accent">Ekspor Data Anggota</CardTitle>
            <CardDescription>Unduh data anggota dalam format Excel atau PDF.</CardDescription>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Button variant="secondary" disabled>
              <FileText className="mr-2 h-4 w-4" /> Ekspor ke Excel (Segera Hadir)
            </Button>
            <Button variant="secondary" disabled>
              <FileText className="mr-2 h-4 w-4" /> Ekspor ke PDF (Segera Hadir)
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
