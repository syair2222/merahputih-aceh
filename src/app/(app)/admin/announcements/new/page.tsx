
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ShieldAlert, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function NewAnnouncementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas' || user.role === 'bank_partner_admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Input Tidak Lengkap",
        description: "Judul dan isi pengumuman tidak boleh kosong.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
        toast({ title: "Error", description: "Pengguna tidak terautentikasi.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'announcements'), { 
         title, 
         content, 
         authorId: user.uid, 
         authorName: user.displayName || user.email,
         createdAt: serverTimestamp(),
         status: 'published'
      });
      toast({ title: "Pengumuman Diterbitkan", description: "Pengumuman Anda berhasil dibuat." });
      router.push('/admin/announcements');
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast({ title: "Gagal Membuat Pengumuman", description: "Terjadi kesalahan saat menyimpan pengumuman.", variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat halaman...</p>
      </div>
    );
  }

  if (!user || !(user.role === 'admin_utama' || user.role === 'sekertaris' || user.role === 'bendahara' || user.role === 'dinas' || user.role === 'bank_partner_admin')) {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda tidak memiliki izin untuk membuat pengumuman.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-4">Kembali ke Beranda</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold text-primary">Buat Pengumuman Baru</h1>
        <Button onClick={() => router.push('/admin/announcements')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Manajemen Pengumuman
        </Button>
      </div>

      <Card className="shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-xl font-headline text-accent">Detail Pengumuman</CardTitle>
            <CardDescription>Tulis judul dan isi pengumuman yang akan ditampilkan kepada anggota.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Judul Pengumuman</Label>
              <Input 
                id="announcement-title" 
                placeholder="Masukkan judul pengumuman..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-content">Isi Pengumuman</Label>
              <Textarea 
                id="announcement-content" 
                placeholder="Tulis isi pengumuman di sini..." 
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-3">
             <Button type="button" variant="outline" onClick={() => router.push('/admin/announcements')} disabled={isSubmitting}>
                Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" /> }
              Simpan & Terbitkan
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

    