import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { YouTubeChannelInfo } from '../types/video';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider configured with YouTube scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/youtube.upload');
provider.addScope('https://www.googleapis.com/auth/youtube.readonly');
// Request offline/prompt if needed so user can pick their YouTube channel brand account
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to track ongoing sign in flow
let isSigningIn = false;

// In-memory token cache (NEVER saved to localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not in memory; user will need to sign in again to obtain fresh OAuth bearer token
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain YouTube OAuth access token.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setManualAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const fetchYouTubeChannelInfo = async (
  token: string
): Promise<YouTubeChannelInfo | null> => {
  try {
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('YouTube channel fetch response not OK:', res.status, errData);
      return null;
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    const snippet = item.snippet || {};
    const stats = item.statistics || {};

    return {
      id: item.id,
      title: snippet.title || 'My YouTube Channel',
      description: snippet.description || '',
      customUrl: snippet.customUrl,
      thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
      subscriberCount: stats.subscriberCount,
      videoCount: stats.videoCount,
    };
  } catch (error) {
    console.error('Error fetching YouTube channel:', error);
    return null;
  }
};
