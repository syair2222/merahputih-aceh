
'use client';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
        let userProfileData: UserProfile = { ...firebaseUser } as UserProfile;
        
        const predefinedAdminEmails: Record<string, { role: UserProfile['role'], displayName: string }> = {
          'muhammad.nazir.syair@example.com': { role: 'admin_utama', displayName: 'Muhammad Nazir Syair (Admin)' },
          'sekertaris@example.com': { role: 'sekertaris', displayName: 'Sekertaris Koperasi' },
          'bendahara@example.com': { role: 'bendahara', displayName: 'Bendahara Koperasi' },
          'dinas.koperasi@example.com': { role: 'dinas', displayName: 'Dinas Koperasi' },
        };

        const adminConfig = firebaseUser.email ? predefinedAdminEmails[firebaseUser.email] : undefined;

        if (adminConfig) {
          // This is a predefined admin email
          userProfileData.role = adminConfig.role;
          userProfileData.displayName = adminConfig.displayName;

          await setDoc(userDocRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: adminConfig.role,
            displayName: adminConfig.displayName,
            photoURL: firebaseUser.photoURL || null,
            createdAt: serverTimestamp(),
          }, { merge: true });
          // Predefined admins do not fill member registration data, so no 'members' document is created/expected here.
        
        } else {
          // Not a predefined admin, handle as a regular user/member
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            userProfileData.role = userData.role;
            // Use displayName from Firestore if available, otherwise from Firebase Auth
            userProfileData.displayName = userData.displayName || firebaseUser.displayName;
          } else {
            // New user (not a predefined admin) who doesn't have a 'users' document yet.
            // This typically means they are a prospective member who needs to complete registration.
            // The registration form itself is responsible for creating the 'members' document
            // and fully populating the 'users' document.
            // Here, we set a default 'prospective_member' role for the context.
            userProfileData.role = 'prospective_member';
            userProfileData.displayName = firebaseUser.displayName || 'Calon Anggota'; // Or "Anggota Baru"
            
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'prospective_member',
              displayName: userProfileData.displayName,
              photoURL: firebaseUser.photoURL || null,
              createdAt: serverTimestamp(),
            }, { merge: true });
          }
        }
        setUser(userProfileData);
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
