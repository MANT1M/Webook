import { useState, useEffect, useCallback } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

// SHA-256 хэш почты администратора (почта в открытом виде в коде не хранится)
export const ADMIN_EMAIL_SHA256 =
  '712fbce72d059dc36d7d69a1c6ef9ae82b5a0f4e240cc9c94b49ea146cb6ce2f';

// SHA-256 хэш связки "email:password" администратора (пароль в открытом виде в коде не хранится)
const ADMIN_CREDENTIALS_SHA256 =
  '3b9a6932377b8b8f1ba10abf665754c5f3f7a9312fc85d7d0239c4375d23d549';

const STORAGE_USER_NAME_KEY = 'library_user';
const STORAGE_USER_EMAIL_KEY = 'library_user_email';
const STORAGE_ADMIN_TOKEN_KEY = 'library_admin_verified_hash';
const AUTH_CHANGE_EVENT = 'library_auth_change';

export interface AuthUserState {
  userName: string | null;
  userEmail: string | null;
  isStatsAdmin: boolean;
  loginWithEmail: (
    name: string,
    email: string,
    password?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ name: string; email: string }>;
  logout: () => Promise<void>;
}

/**
 * Вычисление SHA-256 хэша строки в браузере (с приведением к нижнему регистру для email)
 */
export async function sha256Hex(input: string): Promise<string> {
  return sha256RawHex(input.trim().toLowerCase());
}

/**
 * Вычисление SHA-256 хэша строки с сохранением регистра символов (для пароля)
 */
export async function sha256RawHex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return '';
}

function readStoredAuth(): {
  userName: string | null;
  userEmail: string | null;
  isVerifiedAdmin: boolean;
} {
  try {
    const rawName = localStorage.getItem(STORAGE_USER_NAME_KEY);
    const rawEmail = localStorage.getItem(STORAGE_USER_EMAIL_KEY);
    const storedAdminHash = localStorage.getItem(STORAGE_ADMIN_TOKEN_KEY);
    const fbEmail = auth.currentUser?.email || null;
    const fbName = auth.currentUser?.displayName || null;

    const effectiveEmail =
      (fbEmail || rawEmail || '').trim().toLowerCase() || null;
    const finalName =
      fbName || rawName || (effectiveEmail ? effectiveEmail.split('@')[0] : null);

    const isVerifiedByPassword = storedAdminHash === ADMIN_CREDENTIALS_SHA256;
    const isVerifiedByGoogle =
      storedAdminHash === ADMIN_EMAIL_SHA256 &&
      Boolean(auth.currentUser?.emailVerified);

    return {
      userName: finalName,
      userEmail: effectiveEmail,
      isVerifiedAdmin: isVerifiedByPassword || isVerifiedByGoogle,
    };
  } catch {
    return { userName: null, userEmail: null, isVerifiedAdmin: false };
  }
}

function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export function useAuthUser(): AuthUserState {
  const [state, setState] = useState<{
    userName: string | null;
    userEmail: string | null;
    isVerifiedAdmin: boolean;
  }>(() => readStoredAuth());

  useEffect(() => {
    const syncState = async () => {
      const fbUser = auth.currentUser;
      if (fbUser?.email && fbUser.emailVerified) {
        const emailHash = await sha256Hex(fbUser.email);
        if (emailHash === ADMIN_EMAIL_SHA256) {
          try {
            localStorage.setItem(STORAGE_ADMIN_TOKEN_KEY, ADMIN_EMAIL_SHA256);
          } catch {
            // ignore
          }
          setState({
            userName:
              fbUser.displayName?.trim() ||
              fbUser.email.split('@')[0] ||
              'Администратор',
            userEmail: fbUser.email.trim().toLowerCase(),
            isVerifiedAdmin: true,
          });
          return;
        }
      }
      setState(readStoredAuth());
    };

    const unsubscribeFirebase = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser?.email) {
        try {
          const normalizedEmail = fbUser.email.trim().toLowerCase();
          const displayName =
            fbUser.displayName?.trim() ||
            normalizedEmail.split('@')[0] ||
            'Читатель';
          localStorage.setItem(STORAGE_USER_NAME_KEY, displayName);
          localStorage.setItem(STORAGE_USER_EMAIL_KEY, normalizedEmail);

          const emailHash = await sha256Hex(normalizedEmail);
          if (fbUser.emailVerified && emailHash === ADMIN_EMAIL_SHA256) {
            localStorage.setItem(STORAGE_ADMIN_TOKEN_KEY, ADMIN_EMAIL_SHA256);
          }
        } catch {
          // ignore storage errors
        }
      }
      await syncState();
    });

    const handleSync = () => {
      void syncState();
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      unsubscribeFirebase();
      window.removeEventListener(AUTH_CHANGE_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const loginWithEmail = useCallback(
    async (
      name: string,
      email: string,
      password?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const normalizedEmail = email.trim().toLowerCase();
      const emailHash = await sha256Hex(normalizedEmail);

      // Если введена почта администратора — проверяем SHA-256 хэш связки email:password
      if (emailHash === ADMIN_EMAIL_SHA256) {
        const cleanPassword = (password || '').trim();
        const comboHash = await sha256RawHex(
          `${normalizedEmail}:${cleanPassword}`
        );

        if (comboHash !== ADMIN_CREDENTIALS_SHA256) {
          return {
            ok: false,
            error: 'Неверный пароль для аккаунта администратора.',
          };
        }

        const adminName =
          name.trim() || normalizedEmail.split('@')[0] || 'Администратор';
        try {
          localStorage.setItem(STORAGE_USER_NAME_KEY, adminName);
          localStorage.setItem(STORAGE_USER_EMAIL_KEY, normalizedEmail);
          localStorage.setItem(
            STORAGE_ADMIN_TOKEN_KEY,
            ADMIN_CREDENTIALS_SHA256
          );
        } catch {
          // ignore storage errors
        }
        setState({
          userName: adminName,
          userEmail: normalizedEmail,
          isVerifiedAdmin: true,
        });
        notifyAuthChange();
        return { ok: true };
      }

      // Обычный вход читателя (не администратора)
      const finalName =
        name.trim() ||
        (normalizedEmail ? normalizedEmail.split('@')[0] : 'Читатель');
      try {
        localStorage.setItem(STORAGE_USER_NAME_KEY, finalName);
        localStorage.removeItem(STORAGE_ADMIN_TOKEN_KEY);
        if (normalizedEmail) {
          localStorage.setItem(STORAGE_USER_EMAIL_KEY, normalizedEmail);
        } else {
          localStorage.removeItem(STORAGE_USER_EMAIL_KEY);
        }
      } catch {
        // ignore storage errors
      }
      setState({
        userName: finalName,
        userEmail: normalizedEmail || null,
        isVerifiedAdmin: false,
      });
      notifyAuthChange();
      return { ok: true };
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const fbUser = credential.user;
    const normalizedEmail = (fbUser.email || '').trim().toLowerCase();
    const displayName =
      fbUser.displayName?.trim() || normalizedEmail.split('@')[0] || 'Читатель';
    const emailHash = await sha256Hex(normalizedEmail);
    const isAdmin =
      Boolean(fbUser.emailVerified) && emailHash === ADMIN_EMAIL_SHA256;

    try {
      localStorage.setItem(STORAGE_USER_NAME_KEY, displayName);
      if (normalizedEmail) {
        localStorage.setItem(STORAGE_USER_EMAIL_KEY, normalizedEmail);
      }
      if (isAdmin) {
        localStorage.setItem(STORAGE_ADMIN_TOKEN_KEY, ADMIN_EMAIL_SHA256);
      } else {
        localStorage.removeItem(STORAGE_ADMIN_TOKEN_KEY);
      }
    } catch {
      // ignore storage errors
    }

    setState({
      userName: displayName,
      userEmail: normalizedEmail || null,
      isVerifiedAdmin: isAdmin,
    });
    notifyAuthChange();

    return { name: displayName, email: normalizedEmail };
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore signOut errors
    }
    try {
      localStorage.removeItem(STORAGE_USER_NAME_KEY);
      localStorage.removeItem(STORAGE_USER_EMAIL_KEY);
      localStorage.removeItem(STORAGE_ADMIN_TOKEN_KEY);
    } catch {
      // ignore storage errors
    }
    setState({ userName: null, userEmail: null, isVerifiedAdmin: false });
    notifyAuthChange();
  }, []);

  return {
    userName: state.userName,
    userEmail: state.userEmail,
    isStatsAdmin: state.isVerifiedAdmin,
    loginWithEmail,
    loginWithGoogle,
    logout,
  };
}
