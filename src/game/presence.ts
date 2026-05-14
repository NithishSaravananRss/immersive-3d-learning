import { create } from "zustand";

export type RemotePresence = {
  displayName: string;
  role: string;
  sessionId: string;
  speed: number;
  userId: string;
  username: string;
  x: number;
  y: number;
  yaw: number;
  z: number;
};

type PresenceState = {
  isConnected: boolean;
  remotePlayers: RemotePresence[];
  setConnection: (value: boolean) => void;
  setRemotePlayers: (players: RemotePresence[]) => void;
};

export const usePresence = create<PresenceState>((set) => ({
  isConnected: false,
  remotePlayers: [],
  setConnection: (isConnected) => set({ isConnected }),
  setRemotePlayers: (remotePlayers) => set({ remotePlayers })
}));
