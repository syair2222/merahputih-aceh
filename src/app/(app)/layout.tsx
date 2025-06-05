
'use client'; // This layout might use client-side hooks for auth checks or sidebar state

import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'; // Assuming sidebar components exist
import AppNavbar from '@/components/layout/app-navbar'; // Re-using AppNavbar, or create a specific dashboard navbar
import AppFooter from '@/components/layout/app-footer';
import { LayoutDashboard, UserCircle, Settings, LogOut, FileText, DollarSign, BarChart3, Annoyed } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
    // This should ideally not be reached if useEffect redirects, but as a fallback
    return null; 
  }

  const isAdmin = user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas';
  const isMember = user.role === 'member';
  
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
    { href: '/admin/announcements', label: 'Pengumuman', icon: Annoyed },
    ...commonMenuItems,
  ];

  const memberMenuItems = [
    { href: '/member/dashboard', label: 'Dasbor Anggota', icon: LayoutDashboard },
    { href: '/member/facilities/apply', label: 'Ajukan Fasilitas', icon: DollarSign },
    { href: '/member/facilities/reports', label: 'Laporan Usaha', icon: FileText },
    { href: '/member/announcements', label: 'Pengumuman Koperasi', icon: Annoyed },
    ...commonMenuItems,
  ];
  
  const currentMenuItems = isAdmin ? adminMenuItems : (isMember ? memberMenuItems : commonMenuItems);


  return (
    <SidebarProvider defaultOpen>
       {/* AppNavbar can be here if you want a global top bar even with sidebar */}
       {/* <AppNavbar />  */}
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
             <img src="https://placehold.co/40x40.png" alt="Koperasi Logo" className="rounded-full" data-ai-hint="cooperative logo" />
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="font-headline text-lg font-semibold text-sidebar-primary">Koperasi Digital</p>
              <p className="text-xs text-sidebar-foreground/80">{user.displayName || user.email}</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {currentMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.href || (item.href !== '/admin/dashboard' && item.href !== '/member/dashboard' && pathname.startsWith(item.href))}
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

