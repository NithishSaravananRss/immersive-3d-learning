import { create } from "zustand";

type ControlsState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  setPressed: (code: string, pressed: boolean) => void;
};

const controlMap: Record<string, keyof Omit<ControlsState, "setPressed">> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "sprint",
  ShiftRight: "sprint"
};

export const useControls = create<ControlsState>((set) => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  setPressed: (code, pressed) => {
    const key = controlMap[code];

    if (!key) {
      return;
    }

    set({ [key]: pressed } as Pick<
      ControlsState,
      "forward" | "backward" | "left" | "right" | "sprint"
    >);
  }
}));
