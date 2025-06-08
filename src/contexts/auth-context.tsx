
'use client';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { ReactNode } from 'react';
import React, { createContext, useEffect, useState } from 'react';

export interface UserProfile extends FirebaseUser {
  role?: 'admin_utama' | 'sekertaris' | 'bendahara' | 'dinas' | 'member' | 'prospective_member' | 'bank_partner_admin' | 'related_agency_admin';
  status?: 'pending' | 'approved' | 'rejected' | 'verified' | 'requires_correction';
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
      try {
        setLoading(true); // Set loading true at the start of processing each auth state change
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
            }, { merge: true });
          
          } else { 
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              
              let currentRole = userData.role;
              if (!currentRole || typeof currentRole !== 'string' || currentRole.trim() === '') {
                currentRole = 'prospective_member';
              }
              if (currentRole === 'bank_partner_admin' || currentRole === 'related_agency_admin') {
                  userProfileData.role = currentRole;
              } else {
                  userProfileData.role = currentRole as Exclude<UserProfile['role'], 'bank_partner_admin' | 'related_agency_admin'>;
              }
              
              let currentStatus = userData.status;
              if (!currentStatus || typeof currentStatus !== 'string' || currentStatus.trim() === '') {
                currentStatus = 'pending';
              }
              userProfileData.status = currentStatus as UserProfile['status'];
              
              userProfileData.displayName = userData.displayName || firebaseUser.displayName;
              userProfileData.memberIdNumber = userData.memberIdNumber;

              if (userProfileData.role === 'prospective_member' && userData.role !== 'prospective_member' || 
                  userProfileData.status === 'pending' && userData.status !== 'pending' ||
                  !userData.role || userData.role.trim() === '' || 
                  !userData.status || userData.status.trim() === '') {
                await setDoc(userDocRef, { 
                  role: userProfileData.role,
                  status: userProfileData.status,
                  lastLogin: serverTimestamp() 
                }, { merge: true });
              } else {
                await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
              }
            } else {
              userProfileData.role = 'prospective_member';
              userProfileData.status = 'pending';
              userProfileData.displayName = firebaseUser.displayName || 'Calon Anggota';
              
              await setDoc(userDocRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: 'prospective_member',
                status: 'pending',
                displayName: userProfileData.displayName,
                photoURL: firebaseUser.photoURL || null,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
              });
            }
          }
          
          if (userProfileData.role === 'member' || userProfileData.role === 'prospective_member') {
              const memberDocRef = doc(db, 'members', firebaseUser.uid);
              const memberDocSnap = await getDoc(memberDocRef);
              if (memberDocSnap.exists()) {
                  const memberSpecificData = memberDocSnap.data();
                  userProfileData.status = memberSpecificData?.status || userProfileData.status;
                  userProfileData.memberIdNumber = memberSpecificData?.memberIdNumber || userProfileData.memberIdNumber;
                   if (!userProfileData.displayName && memberSpecificData?.fullName) {
                      userProfileData.displayName = memberSpecificData?.fullName;
                  }
              }
          }
          setUser(userProfileData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error processing auth state change:", error);
        // Consider setting user to null or a specific error state if critical
        setUser(null); 
      } finally {
        setLoading(false); // Ensure loading is always set to false
      }
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
      // Optionally inform the user via toast or other UI element
    } finally {
      setLoading(false);
    }
  };
  
  const value = { user, loading, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
