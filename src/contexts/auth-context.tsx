
'use client';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { ReactNode } from 'react';
import React, { createContext, useEffect, useState } from 'react';

export interface UserProfile extends FirebaseUser {
  role?: 'admin_utama' | 'sekertaris' | 'bendahara' | 'dinas' | 'member' | 'prospective_member';
  // Add other custom user properties here if needed
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  // Add login and register functions when implemented
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({ ...firebaseUser, role: userData.role } as UserProfile);

          // Predefined admin role setup (example - should be done securely)
          if (firebaseUser.email === 'muhammad.nazir.syair@example.com' && !userData.role) {
             await setDoc(userDocRef, { role: 'admin_utama', email: firebaseUser.email, displayName: 'Muhammad Nazir Syair (Admin)' }, { merge: true });
             setUser({ ...firebaseUser, role: 'admin_utama' } as UserProfile);
          } else if (firebaseUser.email === 'sekertaris@example.com' && !userData.role) {
            await setDoc(userDocRef, { role: 'sekertaris', email: firebaseUser.email, displayName: 'Sekertaris Koperasi' }, { merge: true });
            setUser({ ...firebaseUser, role: 'sekertaris' } as UserProfile);
          } else if (firebaseUser.email === 'bendahara@example.com' && !userData.role) {
            await setDoc(userDocRef, { role: 'bendahara', email: firebaseUser.email, displayName: 'Bendahara Koperasi' }, { merge: true });
            setUser({ ...firebaseUser, role: 'bendahara' } as UserProfile);
          } else if (firebaseUser.email === 'dinas.koperasi@example.com' && !userData.role) {
            await setDoc(userDocRef, { role: 'dinas', email: firebaseUser.email, displayName: 'Dinas Koperasi' }, { merge: true });
            setUser({ ...firebaseUser, role: 'dinas' } as UserProfile);
          }

        } else {
          // New user or user data not in Firestore yet.
          // For registration, role will be set to 'prospective_member'.
          // For existing Firebase Auth users without a Firestore profile, treat as basic user or prompt to complete profile.
          // For now, if no doc, set role to prospective or default.
           await setDoc(userDocRef, { role: 'prospective_member', email: firebaseUser.email, displayName: firebaseUser.displayName || 'Anggota Baru' }, { merge: true });
          setUser({ ...firebaseUser, role: 'prospective_member' } as UserProfile);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out: ", error);
      // Handle error (e.g., show toast)
    } finally {
      setLoading(false);
    }
  };
  
  const value = { user, loading, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
