
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth'; // Will create this hook
import { Home, UserPlus, LogIn, LayoutDashboard, LogOut, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AppNavbar() {
  const { user, logout, loading } = useAuth();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "AU"; // Anonymous User
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <nav className="bg-primary shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-headline text-primary-foreground hover:text-accent transition-colors">
          Koperasi Merah Putih
        </Link>
        <div className="space-x-2 flex items-center">
          <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
            <Link href="/"><Home className="mr-2 h-4 w-4" />Beranda</Link>
          </Button>
          <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
            <Link href="/info"><Info className="mr-2 h-4 w-4" />Info Koperasi</Link>
          </Button>
          
          {loading ? (
            <div className="text-primary-foreground">Memuat...</div>
          ) : user ? (
            <>
              <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                <Link href={user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas' ? '/admin/dashboard' : '/member/dashboard'}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />Dasbor
                </Link>
              </Button>
              <Button variant="outline" onClick={logout} className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <LogOut className="mr-2 h-4 w-4" />Keluar
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
            </>
          ) : (
            <>
              <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                <Link href="/register"><UserPlus className="mr-2 h-4 w-4" />Daftar</Link>
              </Button>
              <Button variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                <Link href="/login"><LogIn className="mr-2 h-4 w-4" />Masuk</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
