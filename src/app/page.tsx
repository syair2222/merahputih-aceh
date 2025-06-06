
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { cooperativeInfo } from "@/lib/site-data"; 
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { CheckCircle, LogIn, UserPlus, Megaphone, Sparkles, MessageCircleQuestion, Star, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cooperativeAssistantFlow } from "@/ai/flows/cooperative-assistant-flow";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";


export default function Home() {
  const { toast } = useToast();
  const { user } = useAuth(); 

  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [latestAnnouncements, setLatestAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  const [surveyRating, setSurveyRating] = useState(0);
  const [hoverSurveyRating, setHoverSurveyRating] = useState(0);
  const [surveyComment, setSurveyComment] = useState('');
  const [surveySubmitterName, setSurveySubmitterName] = useState('');
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);

  const cooperativeLogoUrl = "https://res.cloudinary.com/dj0g9plk8/image/upload/v1716276900/koperasi_indonesia_logo.png";


  useEffect(() => {
    const fetchAnnouncements = async () => {
      setAnnouncementsLoading(true);
      try {
        const { getDocs, query, collection, orderBy, limit, where } = await import('firebase/firestore');
        const announcementsCol = collection(db, "announcements");
        const q = query(announcementsCol, where("status", "==", "published"), orderBy("createdAt", "desc"), limit(3));
        const snapshot = await getDocs(q);
        const fetchedAnnouncements = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() 
        }));
        setLatestAnnouncements(fetchedAnnouncements);
      } catch (error) {
        console.error("Error fetching announcements:", error);
        toast({ title: "Gagal Memuat Pengumuman", description: "Tidak dapat mengambil pengumuman terbaru.", variant: "destructive" });
      } finally {
        setAnnouncementsLoading(false);
      }
    };
    fetchAnnouncements();
  }, [toast]);

  const handleAiQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    try {
      const result = await cooperativeAssistantFlow({ query: aiQuestion });
      setAiResponse(result.response);
    } catch (error) {
      console.error("Error getting AI response:", error);
      setAiResponse("Maaf, terjadi kesalahan saat menghubungi asisten AI. Silakan coba lagi nanti.");
      toast({ title: "Error AI", description: "Gagal mendapatkan respon dari asisten AI.", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (surveyRating === 0 && !surveyComment.trim()) {
      toast({ title: "Input Tidak Lengkap", description: "Mohon berikan rating atau tulis komentar.", variant: "destructive" });
      return;
    }
    setIsSubmittingSurvey(true);
    try {
      const surveyData: any = {
        rating: surveyRating,
        comment: surveyComment.trim(),
        timestamp: serverTimestamp(),
      };
      if (user) {
        surveyData.userId = user.uid;
        surveyData.userName = user.displayName || user.email;
      } else if (surveySubmitterName.trim()) {
        surveyData.submitterName = surveySubmitterName.trim();
      }

      await addDoc(collection(db, "surveyResponses"), surveyData);
      toast({ title: "Terima Kasih!", description: "Masukan Anda telah berhasil dikirim." });
      setSurveyRating(0);
      setSurveyComment('');
      setSurveySubmitterName('');
    } catch (error) {
      console.error("Error submitting survey:", error);
      toast({ title: "Gagal Mengirim Survei", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSubmittingSurvey(false);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12">
      <section className="relative text-center py-8 sm:py-12 rounded-lg shadow-xl overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-no-repeat bg-cover bg-center"
          style={{ backgroundImage: `url(${cooperativeLogoUrl})` }}
          aria-hidden="true"
        ></div>
        {/* Gradient Overlay for text readability */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/70 to-accent/80"
          aria-hidden="true"
        ></div>

        {/* Content */}
        <div className="relative container mx-auto px-4 z-10">
          <Image 
            src="https://placehold.co/100x100.png" // This is the smaller foreground logo
            alt="Logo Koperasi Merah Putih Sejahtera" 
            width={100} 
            height={100} 
            className="mx-auto mb-4 sm:mb-6 rounded-full shadow-2xl border-4 border-white w-24 h-24 sm:w-32 sm:h-32" 
            data-ai-hint="cooperative logo" 
          />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-bold text-primary-foreground drop-shadow-md mb-2 sm:mb-4">{cooperativeInfo.name}</h1>
          <p className="text-base sm:text-lg text-primary-foreground/90 mb-1 sm:mb-2">{cooperativeInfo.location}</p>
          <p className="text-sm sm:text-base text-primary-foreground/90">{cooperativeInfo.established}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
            <Button size="lg" asChild className="w-full sm:w-auto bg-primary-foreground text-primary hover:bg-gray-200 shadow-lg transform hover:scale-105 transition-transform">
              <Link href="/register"><UserPlus className="mr-2" /> Daftar Anggota</Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto text-primary-foreground border-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-lg transform hover:scale-105 transition-transform">
              <Link href="/login"><LogIn className="mr-2" /> Masuk</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="info-koperasi" className="container mx-auto px-4">
        <Card className="shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl font-headline text-primary">Selamat Datang di {cooperativeInfo.name}</CardTitle>
            <CardDescription className="text-base sm:text-lg">{cooperativeInfo.introduction}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 text-foreground/90">
            <div>
              <h2 className="text-xl sm:text-2xl font-headline font-semibold mb-2 sm:mb-3 text-accent flex items-center"><Sparkles className="mr-2 text-yellow-400" />Maksud Pendirian</h2>
              <ul className="list-disc list-inside space-y-1 pl-4 text-sm sm:text-base">
                {cooperativeInfo.purpose.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-headline font-semibold mb-2 sm:mb-3 text-accent flex items-center"><Sparkles className="mr-2 text-yellow-400" />Tujuan Pendirian</h2>
              <ul className="list-disc list-inside space-y-1 pl-4 text-sm sm:text-base">
                {cooperativeInfo.objectives.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
            <div className="pt-3 sm:pt-4 border-t border-border">
              <p className="text-base sm:text-lg italic">{cooperativeInfo.closingStatement}</p>
              <p className="text-xl sm:text-2xl font-headline font-semibold text-center mt-4 sm:mt-6 text-primary">{cooperativeInfo.motto}</p>
            </div>
             <div className="text-center mt-4 sm:mt-6">
                <Button asChild variant="link" className="text-base sm:text-lg">
                    <Link href="/info">Pelajari Lebih Lanjut Tentang Koperasi &rarr;</Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="announcements" className="container mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-headline font-semibold mb-4 sm:mb-6 text-center text-primary flex items-center justify-center"><Megaphone className="mr-3 h-7 w-7 sm:h-8 sm:w-8" />Pengumuman Terbaru</h2>
        {announcementsLoading ? (
          <div className="text-center text-muted-foreground py-10">
            <Loader2 className="inline-block animate-spin h-8 w-8 text-primary" />
            <p>Memuat pengumuman...</p>
          </div>
        ) : latestAnnouncements.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {latestAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="shadow-lg hover:shadow-xl transition-shadow bg-card/80 backdrop-blur-sm flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl font-headline text-accent">{announcement.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {announcement.createdAt instanceof Date ? announcement.createdAt.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Tanggal tidak tersedia'} - Oleh: {announcement.authorName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm sm:text-base text-foreground/80 line-clamp-4 whitespace-pre-wrap">{announcement.content}</p>
                </CardContent>
                <CardFooter>
                  <Button variant="link" className="text-primary hover:text-accent p-0 text-sm sm:text-base" disabled>Baca Selengkapnya & Komentar &rarr;</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-10">Belum ada pengumuman terbaru.</p>
        )}
      </section>

      <section id="ai-assistant" className="container mx-auto px-4">
        <Card className="shadow-xl bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl font-headline text-primary flex items-center"><MessageCircleQuestion className="mr-3 h-7 w-7 sm:h-8 sm:w-8" />Tanya Asisten AI Koperasi</CardTitle>
            <CardDescription className="text-sm sm:text-base">Punya pertanyaan seputar koperasi? Tanyakan di sini untuk jawaban cepat!</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAiQuestionSubmit} className="space-y-4">
              <Textarea
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ketik pertanyaan Anda di sini... (Contoh: Apa saja syarat menjadi anggota?)"
                rows={3}
                className="bg-background/70 text-sm sm:text-base"
              />
              <Button type="submit" disabled={isAiLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm sm:text-base">
                {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Tanya AI
              </Button>
            </form>
            {isAiLoading && (
                <div className="mt-6 p-4 border rounded-md bg-muted/30 text-center">
                    <Loader2 className="inline-block animate-spin h-6 w-6 text-primary" />
                    <p className="text-muted-foreground text-sm sm:text-base">Asisten AI sedang berpikir...</p>
                </div>
            )}
            {aiResponse && !isAiLoading && (
              <div className="mt-6 p-4 border rounded-md bg-muted/50">
                <h4 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Jawaban AI:</h4>
                <p className="text-foreground/90 whitespace-pre-wrap text-sm sm:text-base">{aiResponse}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      
      <section id="interactive-survey" className="container mx-auto px-4 py-8">
        <Card className="shadow-xl bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl font-headline text-primary flex items-center">
              <CheckCircle className="mr-3 h-7 w-7 sm:h-8 sm:w-8 text-green-500" /> Berikan Masukan Anda!
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">Kami menghargai setiap masukan untuk {cooperativeInfo.name} yang lebih baik.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSurveySubmit} className="space-y-6">
              <div>
                <Label htmlFor="surveyRating" className="text-base sm:text-lg font-medium text-foreground">Rating Anda Tentang Koperasi Kami:</Label>
                <div className="flex items-center space-x-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-7 w-7 sm:h-8 sm:w-8 cursor-pointer transition-colors",
                        (hoverSurveyRating || surveyRating) >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300 hover:text-yellow-300"
                      )}
                      onMouseEnter={() => setHoverSurveyRating(star)}
                      onMouseLeave={() => setHoverSurveyRating(0)}
                      onClick={() => setSurveyRating(star)}
                      aria-label={`Beri ${star} bintang`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="surveyComment" className="text-base sm:text-lg font-medium text-foreground">Komentar atau Masukan:</Label>
                <Textarea
                  id="surveyComment"
                  value={surveyComment}
                  onChange={(e) => setSurveyComment(e.target.value)}
                  placeholder="Tuliskan komentar, saran, atau kritik Anda di sini..."
                  rows={4}
                  className="mt-2 bg-background/70 text-sm sm:text-base"
                  aria-label="Komentar Survei"
                />
              </div>

              {!user && (
                <div>
                  <Label htmlFor="surveySubmitterName" className="text-base sm:text-lg font-medium text-foreground">Nama Anda (Opsional):</Label>
                  <Input
                    id="surveySubmitterName"
                    value={surveySubmitterName}
                    onChange={(e) => setSurveySubmitterName(e.target.value)}
                    placeholder="Nama Anda"
                    className="mt-2 bg-background/70 text-sm sm:text-base"
                    aria-label="Nama Pengirim Survei"
                  />
                </div>
              )}

              <Button type="submit" disabled={isSubmittingSurvey} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base">
                {isSubmittingSurvey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Kirim Masukan
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

    </div>
  );
}

