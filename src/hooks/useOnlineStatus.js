import { useEffect, useState } from "react";

export function useOnlineStatus() {
  // 1. Read navigator.onLine in the initialiser, so an app opened offline
  //    never paints a frame of "online".
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    // 2. navigator.onLine is a snapshot, so subscribe to the changes.
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);


    // 3. Remove both listeners, or StrictMode's double mount and every
    //    component using the hook will pile them up.
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}