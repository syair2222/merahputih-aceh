
'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { LayoutDashboard, UserCircle, Settings, LogOut, FileText, DollarSign, BarChart3, Megaphone, ShieldAlert, History, Send, MessageSquare, Briefcase, Building, UserCog } from 'lucide-react'; // Changed UsersCog to UserCog
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
  const isMember = user?.role === 'member';
  const isBankAdmin = user?.role === 'bank_partner_admin'; // This variable remains, but isAdmin will take precedence for menu items if bank_partner_admin is in isAdmin.
  const isAgencyAdmin = user?.role === 'related_agency_admin';

  const adminMenuItems = [
    { href: '/admin/dashboard', label: 'Dasbor Admin', icon: LayoutDashboard },
    { href: '/admin/members', label: 'Manajemen Anggota', icon: UserCircle },
    { href: '/admin/applications', label: 'Verifikasi Pendaftaran', icon: FileText },
    { href: '/admin/facilities', label: 'Pengajuan Fasilitas', icon: DollarSign },
    { href: '/admin/reports', label: 'Laporan Keuangan', icon: BarChart3 },
    { href: '/admin/announcements', label: 'Pengumuman', icon: Megaphone },
  ];

  if (isAdminUtama) {
    adminMenuItems.push({ href: '/admin/user-management', label: 'Manajemen Pengguna', icon: UserCog }); // Changed UsersCog to UserCog
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
    // { href: '/bank-admin/applications', label: 'Tinjau Pengajuan', icon: FileText }, // Example for future
    { href: '/profile', label: 'Profil Saya', icon: UserCircle },
    { href: '/settings', label: 'Pengaturan Akun', icon: Settings },
  ];

  const agencyAdminMenuItems = [
    { href: '/agency-admin/dashboard', label: 'Dasbor Dinas', icon: Briefcase },
    // { href: '/agency-admin/programs', label: 'Program Bantuan', icon: FileText }, // Example for future
    { href: '/profile', label: 'Profil Saya', icon: UserCircle },
    { href: '/settings', label: 'Pengaturan Akun', icon: Settings },
  ];

  let currentMenuItems = [];
  if (isAdmin) {
    currentMenuItems = adminMenuItems;
  } else if (isMember) {
    currentMenuItems = memberMenuItems;
  } else if (isBankAdmin) { // This condition will now likely not be met if bank_partner_admin is part of isAdmin
    currentMenuItems = bankAdminMenuItems;
  } else if (isAgencyAdmin) {
    currentMenuItems = agencyAdminMenuItems;
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

