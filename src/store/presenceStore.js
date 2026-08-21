import { create } from "zustand";

export const usePresenceStore = create((set, get) => ({
  presences: {}, // { [astrologerId]: "ONLINE" | "OFFLINE" | "BUSY" }
  versions: {},  // { [astrologerId]: versionNumber }

  setPresence: (astroId, status, version = 0) => {
    const currentVersion = get().versions[astroId] || 0;
    
    // Out-of-order stale event protection using version numbers
    if (version > 0 && version < currentVersion) {
      console.log(`⚠️ Ignored stale presence update for ${astroId}. Current v${currentVersion}, event v${version}`);
      return;
    }

    set((state) => ({
      presences: {
        ...state.presences,
        [astroId]: status
      },
      versions: {
        ...state.versions,
        [astroId]: version
      }
    }));
  },

  setInitialState: (presenceMap) => {
    set((state) => {
      const newPresences = { ...state.presences };
      const newVersions = { ...state.versions };
      
      Object.keys(presenceMap).forEach((astroId) => {
        // Initial state doesn't overwrite newer real-time events if already set
        if (newPresences[astroId] === undefined) {
          newPresences[astroId] = presenceMap[astroId];
          newVersions[astroId] = 0;
        }
      });

      return {
        presences: newPresences,
        versions: newVersions
      };
    });
  }
}));
