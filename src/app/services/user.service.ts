import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserProfile, PublicProfile } from '../types';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private supabaseService = inject(SupabaseService);

  currentUserProfile = signal<UserProfile | null>(null);
  currentPublicProfile = signal<PublicProfile | null>(null);

  // Load both private and public profile
  async fetchUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('users')
        .select('*')
        .eq('uid', uid)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data as UserProfile;
    } catch (e: any) {
      console.error('Error fetching user profile:', e);
      return null;
    }
  }

  async fetchPublicProfile(uid: string): Promise<PublicProfile | null> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('public_profiles')
        .select('*')
        .eq('uid', uid)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as PublicProfile;
    } catch (e: any) {
      console.error('Error fetching public profile:', e);
      return null;
    }
  }

  async createUserProfile(uid: string, displayName: string, email: string, photoURL?: string, username?: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const joinDateStr = timestamp.split('T')[0];

    const privateProfile = {
      uid,
      displayName,
      email,
      photoURL: photoURL || '',
      username: username || displayName.replace(/\s+/g, '').toLowerCase(),
      bio: '',
      joinDate: joinDateStr,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const publicProfile = {
      uid,
      displayName,
      photoURL: photoURL || '',
      username: username || displayName.replace(/\s+/g, '').toLowerCase(),
      bio: '',
      updatedAt: timestamp
    };

    try {
      // Create user records
      await this.supabaseService.client.from('users').upsert(privateProfile);
      await this.supabaseService.client.from('public_profiles').upsert(publicProfile);
      
      this.currentUserProfile.set(privateProfile as unknown as UserProfile);
      this.currentPublicProfile.set(publicProfile as unknown as PublicProfile);
    } catch(e: any) {
       console.error('Error creating profile:', e);
    }
  }

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    if (Object.keys(data).length === 0) return;
    
    const updateData: any = { ...data, updatedAt: new Date().toISOString() };

    try {
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();
      
      if (uid === sessionData.session?.user?.id) {
        await this.supabaseService.client.from('users').update(updateData).eq('uid', uid);
        
        // Reflect allowed changes to public profile
        const publicData: any = { updatedAt: updateData.updatedAt };
        if (data.displayName !== undefined) publicData.displayName = data.displayName;
        if (data.photoURL !== undefined) publicData.photoURL = data.photoURL;
        if (data.bio !== undefined) publicData.bio = data.bio;
        if (data.username !== undefined) publicData.username = data.username;

        if (Object.keys(publicData).length > 1) {
          await this.supabaseService.client.from('public_profiles').update(publicData).eq('uid', uid);
        }
      } else {
        // Admin update
        await this.supabaseService.client.from('users').update(updateData).eq('uid', uid);
      }

      this.currentUserProfile.update(current => {
        if (current && current.uid === uid) return { ...current, ...data };
        return current;
      });
    } catch(e: any) {
      console.error('Error updating user profile:', e);
    }
  }

  async deleteUserProfile(uid: string): Promise<void> {
    try {
      await this.supabaseService.client.from('users').delete().eq('uid', uid);
      await this.supabaseService.client.from('public_profiles').delete().eq('uid', uid);
      
      const { data } = await this.supabaseService.client.auth.getSession();
      if (uid === data.session?.user?.id) {
        this.currentUserProfile.set(null);
        this.currentPublicProfile.set(null);
      }
    } catch (e: any) {
      console.error('Error deleting user:', e);
      throw e;
    }
  }
}
