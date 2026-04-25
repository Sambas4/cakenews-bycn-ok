import { Injectable, signal } from '@angular/core';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase.service';
import { handleFirestoreError } from '../utils/firestore-error-handler';

export interface UserProfile {
  uid: string;
  username: string;
  avatarUrl: string;
  avatarBg?: string;
  isAdmin?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  currentUserProfile = signal<UserProfile | null>(null);

  async fetchUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        return profile;
      }
      return null;
    } catch (e) {
      console.error('Error fetching user profile:', e);
      return null;
    }
  }

  async createUserProfile(uid: string, username: string, avatarUrl: string, avatarBg: string = 'transparent'): Promise<void> {
    const profile: UserProfile = { uid, username, avatarUrl, avatarBg };
    try {
      await setDoc(doc(db, 'users', uid), profile);
      this.currentUserProfile.set(profile);
    } catch(e: any) {
      handleFirestoreError(e, 'create', `users/${uid}`);
    }
  }

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), data);
      this.currentUserProfile.update(current => {
        if (current && current.uid === uid) return { ...current, ...data };
        return current;
      });
    } catch(e: any) {
      handleFirestoreError(e, 'update', `users/${uid}`);
    }
  }

  async deleteUserProfile(uid: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', uid));
      this.currentUserProfile.set(null);
    } catch (e) {
      console.error('Error deleting user profile:', e);
      throw e;
    }
  }
}
