
'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import AppFooter from '@/components/layout/app-footer';
import { LayoutDashboard, UserCircle, Settings, LogOut, FileText, DollarSign, BarChart3, Megaphone, ShieldAlert } from 'lucide-react';
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
    // This effect handles the redirect if user is not authenticated AFTER loading is complete.
    if (!loading && !user) {
      // AppLayout is for the (app) group, which is protected.
      // If we're in AppLayout and !user, it's always a redirect to login.
      router.push('/login');
    }
  }, [user, loading, router]); // Removed pathname as it's not strictly needed for this redirect logic

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat data pengguna...</p>
      </div>
    );
  }

  // If auth is resolved (not loading) but there's no user,
  // we should not render the main layout/children.
  // The useEffect above will handle the redirect.
  // Display a message or a minimal loader while redirecting.
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

  // If we reach here, user is authenticated (!loading && user is not null).
  // Now, render the actual layout.
  const isAdmin = user?.role === 'admin_utama' || user?.role === 'sekertaris' || user?.role === 'bendahara' || user?.role === 'dinas';
  const isMember = user?.role === 'member';

  const commonMenuItems = [
    { href: '/profile', label: 'Profil Saya', icon: UserCircle },
    { href: '/settings', label: 'Pengaturan Akun', icon: Settings },
  ];

  const adminMenuItems = [
    { href: '/admin/dashboard', label: 'Dasbor Admin', icon: LayoutDashboard },
    { href: '/admin/members', label: 'Manajemen Anggota', icon: UserCircle },
    { href: '/admin/applications', label: 'Verifikasi Pendaftaran', icon: FileText },
    { href: '/admin/facilities', label: 'Manajemen Fasilitas', icon: DollarSign },
    { href: '/admin/reports', label: 'Laporan Keuangan', icon: BarChart3 },
    { href: '/admin/announcements', label: 'Pengumuman', icon: Megaphone },
    ...commonMenuItems,
  ];

  const memberMenuItems = [
    { href: '/member/dashboard', label: 'Dasbor Anggota', icon: LayoutDashboard },
    { href: '/member/facilities/apply', label: 'Ajukan Fasilitas', icon: DollarSign },
    { href: '/member/facilities/reports', label: 'Laporan Usaha', icon: FileText },
    { href: '/member/announcements', label: 'Pengumuman Koperasi', icon: Megaphone },
    ...commonMenuItems,
  ];

  let currentMenuItems = commonMenuItems;
  if (user) { // Ensure user exists before checking role
    if (isAdmin) {
      currentMenuItems = adminMenuItems;
    } else if (isMember) {
      currentMenuItems = memberMenuItems;
    }
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
                  isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/' && (item.href.endsWith('dashboard') ? pathname === item.href : true) )}
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
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
