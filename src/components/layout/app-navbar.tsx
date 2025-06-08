
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Home, UserPlus, LogIn, LayoutDashboard, LogOut, Info, Menu, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import React, { useState, useEffect } from 'react';

export default function AppNavbar() {
  const { user, logout, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "AU"; // Anonymous User
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const commonLinks = (
    <>
      <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground hover:text-primary justify-start w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
        <Link href="/"><Home className="mr-2 h-4 w-4" />Beranda</Link>
      </Button>
      <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground hover:text-primary justify-start w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
        <Link href="/info"><Info className="mr-2 h-4 w-4" />Info Koperasi</Link>
      </Button>
    </>
  );

  const getDashboardLink = () => {
    if (!user) return null;
    switch (user.role) {
      case 'admin_utama':
      case 'sekertaris':
      case 'bendahara':
      case 'dinas':
        return '/admin/dashboard';
      case 'bank_partner_admin':
        return '/bank-admin/dashboard';
      case 'related_agency_admin':
        return '/agency-admin/dashboard';
      case 'member':
        return '/member/dashboard';
      default:
        return null; // No dashboard link for prospective_member or other roles
    }
  };

  const dashboardLink = getDashboardLink();

  const authLinks = loading ? (
    <div className="text-primary-foreground px-3 py-2">Memuat...</div>
  ) : user ? (
    <>
      {dashboardLink && (
        <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground hover:text-primary justify-start w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
          <Link href={dashboardLink}>
            <LayoutDashboard className="mr-2 h-4 w-4" />Dasbor
          </Link>
        </Button>
      )}
      <Button variant="outline" onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary justify-start w-full">
        <LogOut className="mr-2 h-4 w-4" />Keluar
      </Button>
      <div className="flex items-center p-3 border-t border-primary-foreground/20 mt-auto">
        <Avatar className="h-9 w-9 mr-3">
          <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
          <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
        </Avatar>
        <span className="text-primary-foreground text-sm truncate">{user.displayName || user.email}</span>
      </div>
    </>
  ) : (
    <>
      <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground hover:text-primary justify-start w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
        <Link href="/register"><UserPlus className="mr-2 h-4 w-4" />Daftar</Link>
      </Button>
      <Button variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary justify-start w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
        <Link href="/login"><LogIn className="mr-2 h-4 w-4" />Masuk</Link>
      </Button>
    </>
  );

  return (
    <nav className="bg-primary shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" legacyBehavior passHref>
          <a className="text-primary-foreground hover:text-accent transition-colors">
            {isClient ? (
              <div className="flex flex-col leading-tight">
                <span className="text-xl sm:text-2xl font-headline">Koperasi</span>
                <span className="text-xs sm:text-sm font-headline">Merah Putih Online</span>
              </div>
            ) : (
              <div className="flex flex-col leading-tight" style={{ visibility: 'hidden' }}>
                 <span className="text-xl sm:text-2xl font-headline">Koperasi</span>
                 <span className="text-xs sm:text-sm font-headline">Merah Putih Online</span>
              </div>
            )}
          </a>
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-1 items-center">
          {commonLinks}
          {authLinks}
        </div>

        {/* Mobile Menu Trigger */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Buka menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-primary text-primary-foreground p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-primary-foreground/20">
                <SheetTitle className="text-primary-foreground font-headline text-xl">Menu Navigasi</SheetTitle>
                <SheetClose className="text-primary-foreground hover:bg-primary-foreground/20 absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Tutup</span>
                </SheetClose>
              </SheetHeader>
              <div className="p-4 space-y-2 flex-grow">
                {commonLinks}
                <hr className="my-2 border-primary-foreground/20"/>
                {authLinks}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
