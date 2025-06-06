
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, Loader2, MessageSquare, Info, CalendarDays } from 'lucide-react';
import type { FacilityApplicationData } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

interface Message {
  id: string;
  title: string;
  content: string;
  date: Date | string;
  relatedTo: string; // e.g., Facility Application ID or "General"
  isRead?: boolean; // Future use
}

export default function MemberMessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    setPageLoading(true);
    setError(null);
    const fetchedMessages: Message[] = [];
    try {
      // Fetch admin comments from facility applications
      const facilityAppsQuery = query(
        collection(db, 'facilityApplications'),
        where('userId', '==', user.uid),
        where('adminComments', '!=', null) // Only those with admin comments
      );
      const facilityAppsSnapshot = await getDocs(facilityAppsQuery);
      facilityAppsSnapshot.forEach(docSnap => {
        const app = docSnap.data() as FacilityApplicationData;
        if (app.adminComments && (app.status === 'rejected' || app.status === 'requires_correction' || app.status === 'approved')) {
          let title = `Pembaruan Pengajuan: ${app.facilityType}`;
          if (app.specificProductName) title += ` (${app.specificProductName})`;
          
          let content = `Status: ${app.status === 'approved' ? 'Disetujui' : app.status === 'rejected' ? 'Ditolak' : 'Membutuhkan Perbaikan'}.\nKomentar Admin: ${app.adminComments}`;

          fetchedMessages.push({
            id: `facility-${docSnap.id}`,
            title: title,
            content: content,
            date: (app.decisionDate as Timestamp)?.toDate() || (app.lastUpdated as Timestamp)?.toDate() || new Date(),
            relatedTo: `Pengajuan ID: ${docSnap.id.substring(0,6)}...`,
          });
        }
      });

      // TODO: Fetch general announcements or direct messages if that system is built
      // For now, we sort by date descending
      fetchedMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMessages(fetchedMessages);

    } catch (err) {
      console.error("Error fetching messages:", err);
      setError('Gagal memuat pesan dan notifikasi.');
    } finally {
      setPageLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'member') {
        router.push('/');
      } else {
        fetchMessages();
      }
    }
  }, [user, authLoading, router, fetchMessages]);


  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat pesan...</p>
      </div>
    );
  }

  if (!user || user.role !== 'member') {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Akses Ditolak</AlertTitle><AlertDescription>Anda harus menjadi anggota untuk mengakses halaman ini.</AlertDescription></Alert>
        <Button onClick={() => router.push('/')} className="mt-4">Kembali ke Beranda</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Pesan & Notifikasi</h1>
        </div>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor</Button>
      </div>

      {error && (
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      )}

      {!error && messages.length === 0 && !pageLoading && (
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="text-xl font-headline text-accent flex items-center"><Info className="mr-2 h-5 w-5" />Tidak Ada Pesan Baru</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Saat ini tidak ada pesan atau notifikasi baru untuk Anda.</p>
            <div className="mt-6 flex justify-center">
              <MessageSquare className="h-32 w-32 text-muted opacity-20" />
            </div>
          </CardContent>
        </Card>
      )}

      {!error && messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((msg) => (
            <Card key={msg.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-headline text-accent">{msg.title}</CardTitle>
                <CardDescription className="text-xs flex items-center">
                  <CalendarDays className="h-3 w-3 mr-1.5" /> 
                  {msg.date instanceof Date ? format(msg.date, 'PPP p', { locale: localeID }) : msg.date.toString()}
                  <span className="mx-1">|</span> Terkait: {msg.relatedTo}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
              </CardContent>
              {/* <CardFooter className="text-xs">
                <Button variant="link" size="sm" className="p-0 h-auto">Tandai sudah dibaca</Button>
              </CardFooter> */}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
