import { useEffect } from "react";
import { usePresenceStore } from "../store/presenceStore";
import { getSocket } from "../services/socket";

export function useAstrologerPresence(astrologerId) {
  const status = usePresenceStore((state) => state.presences[astrologerId]) || "OFFLINE";
  const setPresence = usePresenceStore((state) => state.setPresence);

  useEffect(() => {
    if (!astrologerId) return;

    const socket = getSocket();
    if (socket) {
      // Join/subscribe to target astrologer presence channel
      socket.emit("presence:subscribe", { astrologerId });

      return () => {
        // Leave/unsubscribe from target astrologer channel when component unmounts
        socket.emit("presence:unsubscribe", { astrologerId });
      };
    }
  }, [astrologerId, setPresence]);

  return status;
}
