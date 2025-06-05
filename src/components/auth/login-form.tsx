
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/contexts/auth-context';
import { useAuth } from '@/hooks/use-auth';


const loginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid.' }),
  password: z.string().min(6, { message: 'Password minimal 6 karakter.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // This is to trigger re-fetch of user in AuthContext after login
  // const { user, loading: authLoading } = useAuth(); // This line is problematic for re-render, context updates itself


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      // Fetch role from Firestore, this part is crucial for redirection
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      let userRole: UserProfile['role'] = 'prospective_member'; // Default role
      if (userDoc.exists()) {
        userRole = userDoc.data()?.role;
      }
      
      toast({
        title: 'Login Berhasil!',
        description: 'Selamat datang kembali.',
      });

      // Redirect based on role
      if (userRole === 'admin_utama' || userRole === 'sekertaris' || userRole === 'bendahara' || userRole === 'dinas') {
        router.push('/admin/dashboard');
      } else if (userRole === 'member') {
        router.push('/member/dashboard');
      } else {
        // Prospective members might be redirected to a status page or home
        router.push('/'); 
      }
      // The AuthContext will update itself via onAuthStateChanged
      // No need to manually call a login function from AuthContext if it primarily listens to onAuthStateChanged
      
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Terjadi kesalahan saat login.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Email atau password salah.';
      }
      toast({
        title: 'Login Gagal',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="contoh@email.com" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="******" 
                    {...field} 
                    value={field.value ?? ''}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Masuk
        </Button>
      </form>
      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">
          Belum punya akun?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Daftar di sini
          </Link>
        </p>
        <p className="mt-2 text-muted-foreground">
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Lupa password?
          </Link>
        </p>
      </div>
    </Form>
  );
}
