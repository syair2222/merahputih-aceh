
'use client';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { ReactNode } from 'react';
import React, { createContext, useEffect, useState } from 'react';

export interface UserProfile extends FirebaseUser {
  role?: 'admin_utama' | 'sekertaris' | 'bendahara' | 'dinas' | 'member' | 'prospective_member';
  status?: 'pending' | 'approved' | 'rejected' | 'verified'; // Added status from MemberRegistrationData
  memberIdNumber?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
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
      setLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        let userProfileData: UserProfile = { ...firebaseUser } as UserProfile;
        
        const predefinedAdminEmails: Record<string, { role: UserProfile['role'], displayName: string, status: UserProfile['status'] }> = {
          'muhammad.nazir.syair@example.com': { role: 'admin_utama', displayName: 'Muhammad Nazir Syair (Admin)', status: 'approved' },
          'sekertaris@example.com': { role: 'sekertaris', displayName: 'Sekertaris Koperasi', status: 'approved' },
          'bendahara@example.com': { role: 'bendahara', displayName: 'Bendahara Koperasi', status: 'approved' },
          'dinas.koperasi@example.com': { role: 'dinas', displayName: 'Dinas Koperasi', status: 'approved' },
        };

        const adminConfig = firebaseUser.email ? predefinedAdminEmails[firebaseUser.email] : undefined;

        if (adminConfig) {
          userProfileData.role = adminConfig.role;
          userProfileData.displayName = adminConfig.displayName;
          userProfileData.status = adminConfig.status;

          await setDoc(userDocRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: adminConfig.role,
            displayName: adminConfig.displayName,
            status: adminConfig.status,
            photoURL: firebaseUser.photoURL || null,
            lastLogin: serverTimestamp(),
            createdAt: serverTimestamp(), // Should only be set once, consider onFirstLogin
          }, { merge: true });
        
        } else {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            userProfileData.role = userData.role || 'prospective_member'; // Default if role is missing
            userProfileData.displayName = userData.displayName || firebaseUser.displayName;
            userProfileData.status = userData.status || 'pending'; // Default status if missing
            userProfileData.memberIdNumber = userData.memberIdNumber;


            // If role or status was missing and defaulted, update Firestore
            if (!userData.role || !userData.status) {
              await setDoc(userDocRef, { 
                role: userProfileData.role,
                status: userProfileData.status,
                lastLogin: serverTimestamp() 
              }, { merge: true });
            } else {
              await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
            }
          } else {
            // New user not in admin list - create prospective member document
            userProfileData.role = 'prospective_member';
            userProfileData.displayName = firebaseUser.displayName || 'Calon Anggota';
            userProfileData.status = 'pending';
            
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'prospective_member',
              displayName: userProfileData.displayName,
              status: 'pending',
              photoURL: firebaseUser.photoURL || null,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
            }, { merge: true });
          }
        }
        // Attempt to fetch member-specific status from 'members' collection if role is 'member'
        // This is crucial because `users.status` might not be the same as `members.status`
        if (userProfileData.role === 'member') {
            const memberDocRef = doc(db, 'members', firebaseUser.uid);
            const memberDocSnap = await getDoc(memberDocRef);
            if (memberDocSnap.exists()) {
                userProfileData.status = memberDocSnap.data()?.status || userProfileData.status;
                userProfileData.memberIdNumber = memberDocSnap.data()?.memberIdNumber || userProfileData.memberIdNumber;
                 if (!userProfileData.displayName && memberDocSnap.data()?.fullName) {
                    userProfileData.displayName = memberDocSnap.data()?.fullName;
                }
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
      setUser(null); // Clear user from context
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
      setLoading(false);
    }
  };
  
  const value = { user, loading, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
