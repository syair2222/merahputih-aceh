
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldAlert, Loader2, Megaphone, Edit, List, Eye, Trash2 } from 'lucide-react';
import type { Announcement } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminAnnouncementsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    if (!user || !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas')) {
      setPageLoading(false);
      return;
    }
    setPageLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const announcementsData = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Announcement, 'id'>),
        createdAt: (docSnap.data().createdAt as Timestamp)?.toDate(),
      })) as Announcement[];
      setAnnouncements(announcementsData);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      setError('Gagal memuat data pengumuman.');
    } finally {
      setPageLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas')) {
        router.push('/');
      } else {
        fetchAnnouncements();
      }
    }
  }, [user, authLoading, router, fetchAnnouncements]);

  const handleDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    try {
      await deleteDoc(doc(db, 'announcements', announcementToDelete.id));
      toast({ title: "Pengumuman Dihapus", description: `Pengumuman "${announcementToDelete.title}" berhasil dihapus.` });
      setAnnouncements(prev => prev.filter(ann => ann.id !== announcementToDelete.id));
      setAnnouncementToDelete(null);
    } catch (err) {
      console.error("Error deleting announcement:", err);
      toast({ title: "Gagal Menghapus", description: "Terjadi kesalahan saat menghapus pengumuman.", variant: "destructive" });
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat data pengumuman...</p>
      </div>
    );
  }

  if (!user || !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas')) {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-4">Kembali ke Beranda</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Megaphone className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Manajemen Pengumuman</h1>
        </div>
        <div className='space-x-2'>
          <Button onClick={() => router.push('/admin/announcements/new')}>
            <Edit className="mr-2 h-4 w-4" /> Buat Pengumuman Baru
          </Button>
          <Button onClick={() => router.push('/admin/dashboard')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Admin
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent flex items-center">
            <List className="mr-2 h-5 w-5" />Daftar Pengumuman
          </CardTitle>
          <CardDescription>Kelola pengumuman yang akan ditampilkan kepada anggota koperasi.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!error && announcements.length === 0 && !pageLoading && (
            <div className="text-center py-10">
              <Megaphone className="h-24 w-24 text-muted opacity-30 mx-auto" />
              <p className="mt-4 text-lg text-muted-foreground">Belum ada pengumuman.</p>
              <p className="text-sm text-muted-foreground">Anda dapat membuat pengumuman baru menggunakan tombol di atas.</p>
            </div>
          )}
          {!error && announcements.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead className="hidden md:table-cell">Penulis</TableHead>
                  <TableHead className="hidden lg:table-cell">Tgl. Dibuat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((ann) => (
                  <TableRow key={ann.id}>
                    <TableCell className="font-medium">{ann.title}</TableCell>
                    <TableCell className="hidden md:table-cell">{ann.authorName}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {ann.createdAt instanceof Date ? ann.createdAt.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ann.status === 'published' ? 'default' : 'secondary'} className={ann.status === 'published' ? 'bg-green-500 text-white' : ''}>
                        {ann.status === 'published' ? 'Diterbitkan' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => toast({ title: "Segera Hadir", description: "Fitur edit pengumuman akan segera tersedia."})}>
                        <Edit className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" onClick={() => setAnnouncementToDelete(ann)}>
                            <Trash2 className="mr-1 h-3 w-3" /> Hapus
                          </Button>
                        </AlertDialogTrigger>
                        {announcementToDelete && announcementToDelete.id === ann.id && (
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tindakan ini tidak dapat dibatalkan. Ini akan menghapus pengumuman berjudul "{announcementToDelete.title}" secara permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setAnnouncementToDelete(null)}>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteAnnouncement} className="bg-destructive hover:bg-destructive/90">
                                Ya, Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        )}
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
