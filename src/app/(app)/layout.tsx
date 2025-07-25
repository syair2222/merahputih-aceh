
'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { LayoutDashboard, UserCircle, Settings, LogOut, FileText, DollarSign, BarChart3, Megaphone, ShieldAlert, History, Send, MessageSquare, Briefcase, Building, UserCog, BookText, FilePlus, ListChecks, SearchCheck, Settings2, BarChartHorizontalBig, Award } from 'lucide-react'; // Added Award
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// Loader component
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);


export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat data pengguna...</p>
      </div>
    );
  }

  if (!user) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Alert variant="destructive" className="max-w-md">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Sesi Tidak Ditemukan</AlertTitle>
              <AlertDescription>
                Anda tidak terautentikasi. Mengalihkan ke halaman login...
              </AlertDescription>
            </Alert>
            <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  const isAdmin = user?.role === 'admin_utama' || user?.role === 'sekertaris' || user?.role === 'bendahara' || user?.role === 'dinas' || user?.role === 'bank_partner_admin';
  const isAdminUtama = user?.role === 'admin_utama';
  const isFinanceAdmin = user?.role === 'admin_utama' || user?.role === 'sekertaris' || user?.role === 'bendahara';
  const isMember = user?.role === 'member';
  const isBankAdmin = user?.role === 'bank_partner_admin'; 
  const isAgencyAdmin = user?.role === 'related_agency_admin';

  const baseAdminMenuItems = [
    { href: '/admin/dashboard', label: 'Dasbor Admin', icon: LayoutDashboard },
    { href: '/admin/members', label: 'Manajemen Anggota', icon: UserCircle },
    { href: '/admin/applications', label: 'Verifikasi Pendaftaran', icon: FileText },
    { href: '/admin/facilities', label: 'Pengajuan Fasilitas', icon: DollarSign },
    { href: '/admin/reports', label: 'Laporan Keuangan', icon: BarChart3 },
  ];

  if (isFinanceAdmin) {
    baseAdminMenuItems.push({ href: '/admin/finance/coa', label: 'Manajemen CoA', icon: BookText });
    baseAdminMenuItems.push({ href: '/admin/finance/transactions/new', label: 'Catat Transaksi Baru', icon: FilePlus });
    baseAdminMenuItems.push({ href: '/admin/finance/transactions', label: 'Daftar Transaksi', icon: ListChecks });
    baseAdminMenuItems.push({ href: '/admin/finance/anomaly-detection', label: 'Deteksi Anomali', icon: SearchCheck });
    baseAdminMenuItems.push({ href: '/admin/finance/shu-allocation', label: 'Alokasi SHU', icon: Settings2 });
    baseAdminMenuItems.push({ href: '/admin/finance/expenditure-summary', label: 'Ringkasan Pengeluaran', icon: BarChartHorizontalBig }); // New Menu Item
    if (isAdminUtama) { // Only admin_utama can process worker salaries
      baseAdminMenuItems.push({ href: '/admin/finance/worker-salary-processing', label: 'Proses Gaji Poin Pekerja', icon: Award });
    }
  }
  
  baseAdminMenuItems.push({ href: '/admin/announcements', label: 'Pengumuman', icon: Megaphone });


  const adminMenuItems = [...baseAdminMenuItems];


  if (isAdminUtama) {
    adminMenuItems.push({ href: '/admin/user-management', label: 'Manajemen Pengguna', icon: UserCog }); 
  }
  
  adminMenuItems.push(
    { href: '/profile', label: 'Profil Saya', icon: UserCircle },
    { href: '/settings', label: 'Pengaturan Akun', icon: Settings }
  );


  const memberMenuItems = [
    { href: '/member/dashboard', label: 'Dasbor Anggota', icon: LayoutDashboard },
    { href: '/member/messages', label: 'Pesan & Notifikasi', icon: MessageSquare },
    { href: '/member/facilities/apply', label: 'Ajukan Fasilitas', icon: Send },
    { href: '/member/facilities/history', label: 'Riwayat Pengajuan', icon: History },
    { href: '/member/facilities/reports', label: 'Laporan Usaha', icon: FileText },
    { href: '/member/announcements', label: 'Pengumuman Koperasi', icon: Megaphone },
    { href: '/profile', label: 'Profil Saya', icon: UserCircle },
    { href: '/settings', label: 'Pengaturan Akun', icon: Settings },
  ];

  const bankAdminMenuItems = [
    { href: '/bank-admin/dashboard', label: 'Dasbor Bank', icon: Building },
    // Bank admin also sees general admin facility list, filtered by targetEntityType
    { href: '/admin/facilities', label: 'Tinjau Pengajuan', icon: FileText },
    { href: '/profile', label: 'Profil Saya', icon: UserCircle },
    { href: '/settings', label: 'Pengaturan Akun', icon: Settings },
  ];

  const agencyAdminMenuItems = [
    { href: '/agency-admin/dashboard', label: 'Dasbor Dinas', icon: Briefcase },
    // Agency admin also sees general admin facility list, filtered by targetEntityType
    { href: '/admin/facilities', label: 'Tinjau Pengajuan', icon: FileText },
    { href: '/profile', label: 'Profil Saya', icon: UserCircle },
    { href: '/settings', label: 'Pengaturan Akun', icon: Settings },
  ];

  let currentMenuItems = [];
  if (isAdmin) {
    // For bank_partner_admin and related_agency_admin, we want a more specific menu
    // which is covered by their own dashboards.
    // The general admin menu is for admin_utama, sekertaris, bendahara, dinas (general).
    if (isBankAdmin && !isFinanceAdmin && !isAdminUtama && user.role !== 'dinas') { // bank_partner_admin is not a finance admin or admin_utama or general dinas
        currentMenuItems = bankAdminMenuItems;
    } else if (isAgencyAdmin && !isFinanceAdmin && !isAdminUtama && user.role !== 'dinas') { // related_agency_admin is not a finance admin or admin_utama or general dinas
        currentMenuItems = agencyAdminMenuItems;
    }
    else {
        currentMenuItems = adminMenuItems;
    }
  } else if (isMember) {
    currentMenuItems = memberMenuItems;
  }
   else {
    // Fallback untuk prospective_member atau peran lain/tidak terdefinisi
    currentMenuItems = [
      { href: '/profile', label: 'Profil Saya', icon: UserCircle },
      { href: '/settings', label: 'Pengaturan Akun', icon: Settings },
    ];
  }


  return (
    <SidebarProvider defaultOpen>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
             <img src="https://placehold.co/40x40.png" alt="Koperasi Logo" className="rounded-full" data-ai-hint="cooperative logo"/>
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="font-headline text-lg font-semibold text-sidebar-primary">Koperasi Digital</p>
              <p className="text-xs text-sidebar-foreground/80">{user?.displayName || user?.email}</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {currentMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/' && (item.href.endsWith('dashboard') ? pathname === item.href : !item.href.endsWith('dashboard') && pathname.startsWith(item.href)  ) )}
                  tooltip={{children: item.label, className: "bg-primary text-primary-foreground"}}
                >
                  <Link href={item.href} >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout} tooltip={{children: "Keluar", className: "bg-primary text-primary-foreground"}}>
                <LogOut className="h-5 w-5" />
                <span>Keluar</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
         <header className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10 md:hidden">
            <div className="font-headline text-xl text-primary">Koperasi Digital</div>
            <SidebarTrigger />
        </header>
        <div className="p-4 sm:p-6 md:p-8">
         {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
