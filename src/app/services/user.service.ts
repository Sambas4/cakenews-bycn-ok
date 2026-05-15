import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserProfile, PublicProfile } from '../types';
import { AuditLogService } from './audit-log.service';
import { Logger } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private supabaseService = inject(SupabaseService);
  private audit = inject(AuditLogService);
  private logger = inject(Logger);

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
      this.logger.error('user.fetchProfile', e);
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
      this.logger.error('user.fetchPublicProfile', e);
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
      // Always seed new accounts as USER. Privileged roles are granted
      // out-of-band (via the BOOTSTRAP_SUPER_ADMIN_UIDS bootstrap path,
      // or by an existing admin through the admin console). Hard-coding
      // email-based escalation here would be a backdoor.
      role: 'USER',
      status: 'ACTIVE',
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
       this.logger.error('user.createProfile', e);
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

      // Privileged actions leave a trail. Role / status changes are
      // the high-impact ones — audit them with the before/after value
      // so we can answer "who promoted whom and when?".
      if (data.role !== undefined || data.status !== undefined) {
        void this.audit.record({
          action: data.role !== undefined ? 'user.role.update' : 'user.status.update',
          targetType: 'USER',
          targetId: uid,
          payload: {
            role: data.role,
            status: data.status,
            moderationNote: data.moderationNote,
          },
        });
      }
    } catch (e) {
      this.logger.error('user.updateProfile', e);
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
      this.logger.error('user.delete', e);
      throw e;
    }
  }
}
