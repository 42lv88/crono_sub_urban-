import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

// Environment-configured Firebase settings loaded from .env
export const ENV_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

export const DEFAULT_FIREBASE_CONFIG = ENV_FIREBASE_CONFIG;

const LOCAL_STORAGE_KEY = "custom_firebase_config_v1";

// Read saved config from localStorage or fallback to ENV / Default
export function getSavedConfig() {
  if (isConfigValid(ENV_FIREBASE_CONFIG)) {
    return ENV_FIREBASE_CONFIG;
  }

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (isConfigValid(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not load stored Firebase config", e);
  }
  return ENV_FIREBASE_CONFIG;
}

let currentConfig = getSavedConfig();
let app = null;
let databaseInstance = null;
let isRealtimeConnected = false;

function isConfigValid(cfg) {
  return (
    cfg &&
    cfg.apiKey &&
    cfg.databaseURL &&
    !cfg.apiKey.includes("YOUR_") &&
    !cfg.databaseURL.includes("YOUR_")
  );
}

function initFirebase(cfg) {
  try {
    if (getApps().length > 0) {
      const existingApp = getApps()[0];
      deleteApp(existingApp);
    }
  } catch (err) {
    console.warn("Resetting firebase app...", err);
  }

  if (isConfigValid(cfg)) {
    try {
      app = initializeApp(cfg);
      databaseInstance = getDatabase(app);
      isRealtimeConnected = true;
      console.log("Firebase Realtime Database initialized successfully with databaseURL:", cfg.databaseURL);
    } catch (e) {
      console.error("Firebase init error:", e);
      databaseInstance = null;
      isRealtimeConnected = false;
    }
  } else {
    databaseInstance = null;
    isRealtimeConnected = false;
    console.warn("Using local broadcast mode until valid Firebase credentials are provided.");
  }
}

// Initial setup
initFirebase(currentConfig);

// Export db instance for Svelte component compatibility as requested in user prompt
export const db = databaseInstance;

export function updateFirebaseCredentials(newConfig) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newConfig));
    currentConfig = newConfig;
    initFirebase(newConfig);
    return { success: true, isConnected: isRealtimeConnected };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function isUsingFirebase() {
  return isRealtimeConnected && databaseInstance !== null;
}

export function getCurrentFirebaseConfig() {
  return { ...currentConfig };
}

// --- LOCAL BROADCAST SYNC FALLBACK ---
const broadcastChannel = typeof window !== "undefined" && window.BroadcastChannel 
  ? new BroadcastChannel("synchronized_timer_channel") 
  : null;

const localRoomStateCache = {};

// --- ROOM SYNC FUNCTIONS ---

/**
 * Save timer state to Firebase (or BroadcastChannel fallback)
 */
export async function updateRoomState(roomId, timerData) {
  const roomPath = `shared-timers/${roomId}`;
  const payload = {
    ...timerData,
    updatedAt: Date.now()
  };

  if (isUsingFirebase() && databaseInstance) {
    try {
      const timerRef = ref(databaseInstance, roomPath);
      await set(timerRef, payload);
      return;
    } catch (err) {
      console.error("Error setting Firebase state:", err);
    }
  }

  // Fallback broadcast sync
  localRoomStateCache[roomId] = payload;
  try {
    localStorage.setItem(`timer_room_${roomId}`, JSON.stringify(payload));
  } catch (e) {}

  if (broadcastChannel) {
    broadcastChannel.postMessage({ roomId, payload });
  }
}

/**
 * Listen to real-time updates for a specific room
 */
export function subscribeToRoom(roomId, callback) {
  let unsubscribeFirebase = null;

  if (isUsingFirebase() && databaseInstance) {
    try {
      const timerRef = ref(databaseInstance, `shared-timers/${roomId}`);
      unsubscribeFirebase = onValue(timerRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          callback(val);
        }
      });
    } catch (e) {
      console.error("Firebase subscription error:", e);
    }
  }

  // Broadcast channel listener fallback
  const handleBroadcast = (event) => {
    if (event.data && event.data.roomId === roomId) {
      callback(event.data.payload);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener("message", handleBroadcast);
  }

  // Check local storage initial state
  try {
    const cached = localStorage.getItem(`timer_room_${roomId}`);
    if (cached) {
      callback(JSON.parse(cached));
    }
  } catch (e) {}

  return () => {
    if (unsubscribeFirebase) unsubscribeFirebase();
    if (broadcastChannel) {
      broadcastChannel.removeEventListener("message", handleBroadcast);
    }
  };
}
