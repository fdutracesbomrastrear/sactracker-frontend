'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { deleteProfileAvatar, fetchMe, uploadProfileAvatar } from '@/modules/core/lib/api';
import { getUser, isAuthenticated, updateStoredUser } from '@/modules/core/lib/auth';
import { resolveAvatarApiUrl } from '@/modules/core/lib/profile';

type ProfileContextValue = {
  avatarUrl: string | null;
  isUploading: boolean;
  statusMessage: string | null;
  refreshProfile: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    () => resolveAvatarApiUrl(getUser()?.avatarUrl)
  );
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated()) return;
    const me = await fetchMe();
    updateStoredUser({
      name: me.name,
      email: me.email,
      permissions: me.permissions,
      avatarUrl: me.avatarUrl ?? null,
    });
    setAvatarUrl(resolveAvatarApiUrl(me.avatarUrl));
  }, []);

  const syncFromStorage = useCallback(() => {
    if (!isAuthenticated()) {
      setAvatarUrl(null);
      return;
    }
    setAvatarUrl(resolveAvatarApiUrl(getUser()?.avatarUrl));
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;
    refreshProfile().catch(syncFromStorage);
  }, [refreshProfile, syncFromStorage]);

  useEffect(() => {
    const onProfileUpdated = () => syncFromStorage();
    window.addEventListener('sactracker-profile-updated', onProfileUpdated);
    return () => window.removeEventListener('sactracker-profile-updated', onProfileUpdated);
  }, [syncFromStorage]);

  const uploadAvatar = useCallback(async (file: File) => {
    setIsUploading(true);
    setStatusMessage(null);
    try {
      const path = await uploadProfileAvatar(file);
      updateStoredUser({ avatarUrl: path });
      setAvatarUrl(resolveAvatarApiUrl(path));
      setStatusMessage('Foto sincronizada com a conta');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar foto';
      setStatusMessage(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const removeAvatar = useCallback(async () => {
    setIsUploading(true);
    setStatusMessage(null);
    try {
      await deleteProfileAvatar();
      updateStoredUser({ avatarUrl: null });
      setAvatarUrl(null);
      setStatusMessage('Foto removida');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao remover foto';
      setStatusMessage(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      avatarUrl,
      isUploading,
      statusMessage,
      refreshProfile,
      uploadAvatar,
      removeAvatar,
    }),
    [avatarUrl, isUploading, statusMessage, refreshProfile, uploadAvatar, removeAvatar]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile deve ser usado dentro de ProfileProvider');
  }
  return ctx;
}
