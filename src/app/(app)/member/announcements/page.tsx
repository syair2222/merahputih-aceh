
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, ShieldAlert, Loader2, Megaphone, MessageSquare, CalendarDays } from 'lucide-react';
import type { Announcement } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

export default function MemberAnnouncementsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'announcements'),
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc')
      );
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
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'member') {
        router.push('/');
      } else {
        fetchAnnouncements();
      }
    }
  }, [user, authLoading, router, fetchAnnouncements]);

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat pengumuman...</p>
      </div>
    );
  }

  if (!user || user.role !== 'member') {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda harus menjadi anggota untuk mengakses halaman ini.</AlertDescription>
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
          <h1 className="text-3xl font-headline font-bold text-primary">Pengumuman Koperasi</h1>
        </div>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Anggota
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && announcements.length === 0 && !pageLoading && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-accent">Tidak Ada Pengumuman</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Saat ini belum ada pengumuman terbaru dari koperasi.</p>
            <div className="mt-6 flex justify-center">
              <Megaphone className="h-32 w-32 text-muted opacity-20" />
            </div>
          </CardContent>
        </Card>
      )}

      {!error && announcements.length > 0 && (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {announcements.map((ann, index) => (
            <AccordionItem value={`item-${index}`} key={ann.id} className="bg-card border border-border rounded-lg shadow-lg">
              <AccordionTrigger className="p-6 hover:no-underline">
                <div className="flex-1 text-left">
                  <h2 className="text-xl font-headline text-accent">{ann.title}</h2>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <CalendarDays className="h-3 w-3 mr-1.5" />
                    Diterbitkan pada: {ann.createdAt instanceof Date ? format(ann.createdAt, 'PPP', { locale: localeID }) : 'N/A'} oleh {ann.authorName}
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-6 pt-0">
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {ann.content}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold flex items-center text-primary">
                    <MessageSquare className="h-4 w-4 mr-2" /> Komentar & Diskusi
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Fitur komentar akan segera tersedia.</p>
                  {/* Placeholder for comments section */}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
