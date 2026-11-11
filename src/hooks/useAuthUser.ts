import { useState, useEffect, useCallback } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export const ADMIN_STATS_EMAIL = '1tim.manti777@gmail.com';
const STORAGE_USER_NAME_KEY = 'library_user';
const STORAGE_USER_EMAIL_KEY = 'library_user_email';
const AUTH_CHANGE_EVENT = 'library_auth_change';

export interface AuthUserState {
  userName: string | null;
  userEmail: string | null;
  isStatsAdmin: boolean;
  loginWithEmail: (name: string, email: string) => void;
  loginWithGoogle: () => Promise<{ name: string; email: string }>;
  logout: () => Promise<void>;
}

function isVerifiedFirebaseAdmin(): boolean {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.email || !fbUser.emailVerified) {
    return false;
  }
  return fbUser.email.trim().toLowerCase() === ADMIN_STATS_EMAIL;
}

function readStoredAuth(): {
  userName: string | null;
  userEmail: string | null;
  isVerifiedAdmin: boolean;
} {
  try {
    const rawName = localStorage.getItem(STORAGE_USER_NAME_KEY);
    const rawEmail = localStorage.getItem(STORAGE_USER_EMAIL_KEY);
    const fbEmail = auth.currentUser?.email || null;
    const fbName = auth.currentUser?.displayName || null;
    const verifiedAdmin = isVerifiedFirebaseAdmin();

    // Если в localStorage записан email администратора без реальной сессии Google Auth — игнорируем его
    const safeStoredEmail =
      rawEmail && rawEmail.trim().toLowerCase() === ADMIN_STATS_EMAIL && !verifiedAdmin
        ? null
        : rawEmail;

    const effectiveEmail =
      (fbEmail || safeStoredEmail || '').trim().toLowerCase() || null;

    const fallbackEmailFromName =
      !effectiveEmail &&
      rawName &&
      rawName.includes('@') &&
      rawName.trim().toLowerCase() !== ADMIN_STATS_EMAIL
        ? rawName.trim().toLowerCase()
        : null;

    const finalEmail = effectiveEmail || fallbackEmailFromName;
    const finalName =
      fbName || rawName || (finalEmail ? finalEmail.split('@')[0] : null);

    return {
      userName: finalName,
      userEmail: finalEmail,
      isVerifiedAdmin: verifiedAdmin,
    };
  } catch {
    return { userName: null, userEmail: null, isVerifiedAdmin: false };
  }
}

export function isAdminStatsEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_STATS_EMAIL && isVerifiedFirebaseAdmin();
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
    const syncState = () => {
      setState(readStoredAuth());
    };

    const unsubscribeFirebase = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser?.email) {
        try {
          const normalizedEmail = fbUser.email.trim().toLowerCase();
          const displayName =
            fbUser.displayName?.trim() ||
            normalizedEmail.split('@')[0] ||
            'Читатель';
          localStorage.setItem(STORAGE_USER_NAME_KEY, displayName);
          localStorage.setItem(STORAGE_USER_EMAIL_KEY, normalizedEmail);
        } catch {
          // ignore storage errors
        }
      }
      syncState();
    });

    window.addEventListener(AUTH_CHANGE_EVENT, syncState);
    window.addEventListener('storage', syncState);

    return () => {
      unsubscribeFirebase();
      window.removeEventListener(AUTH_CHANGE_EVENT, syncState);
      window.removeEventListener('storage', syncState);
    };
  }, []);

  const loginWithEmail = useCallback((name: string, email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    // Запрещаем подмену email администратора через неавторизованную локальную форму
    const safeEmail =
      normalizedEmail === ADMIN_STATS_EMAIL ? '' : normalizedEmail;
    const finalName =
      name.trim() || (safeEmail ? safeEmail.split('@')[0] : 'Читатель');
    try {
      localStorage.setItem(STORAGE_USER_NAME_KEY, finalName);
      if (safeEmail) {
        localStorage.setItem(STORAGE_USER_EMAIL_KEY, safeEmail);
      } else {
        localStorage.removeItem(STORAGE_USER_EMAIL_KEY);
      }
    } catch {
      // ignore storage errors
    }
    setState({
      userName: finalName,
      userEmail: safeEmail || null,
      isVerifiedAdmin: isVerifiedFirebaseAdmin(),
    });
    notifyAuthChange();
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const fbUser = credential.user;
    const normalizedEmail = (fbUser.email || '').trim().toLowerCase();
    const displayName =
      fbUser.displayName?.trim() || normalizedEmail.split('@')[0] || 'Читатель';

    try {
      localStorage.setItem(STORAGE_USER_NAME_KEY, displayName);
      if (normalizedEmail) {
        localStorage.setItem(STORAGE_USER_EMAIL_KEY, normalizedEmail);
      }
    } catch {
      // ignore storage errors
    }

    setState({
      userName: displayName,
      userEmail: normalizedEmail || null,
      isVerifiedAdmin: isVerifiedFirebaseAdmin(),
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
