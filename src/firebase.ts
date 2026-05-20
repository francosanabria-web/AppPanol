import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCVBt-B-rWtpCaKSydwtx0SAUn89NbVUL8",
  authDomain: "sistemapanol-a1bd4.firebaseapp.com",
  databaseURL: "https://sistemapanol-a1bd4-default-rtdb.firebaseio.com",
  projectId: "sistemapanol-a1bd4",
  storageBucket: "sistemapanol-a1bd4.firebasestorage.app",
  messagingSenderId: "1049864570305",
  appId: "1:1049864570305:web:b2892e74c4ef03e0fadb40",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/** Caché local en el navegador: reabrir la app suele costar 0 lecturas hasta que se actualice desde servidor. */
export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager(),
      }),
    });
  } catch {
    return getFirestore(app);
  }
})();
