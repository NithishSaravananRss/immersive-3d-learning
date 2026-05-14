import { create } from "zustand";

export type KnowledgeNode = {
  id: string;
  category: string;
  title: string;
  summary: string;
  prompt: string;
  details: string[];
  position: [number, number, number];
  color: string;
  relatedNodeIds: string[];
  slug: string;
};

export const activationRadius = 6;

export const fallbackKnowledgeNodes: KnowledgeNode[] = [
  {
    id: "html",
    category: "Web Foundations",
    title: "HTML",
    summary: "Learn how web pages are structured with tags, semantic layout, forms, and accessibility.",
    prompt: "Click to enter the HTML mission world.",
    details: [
      "Understand document structure and semantic elements.",
      "Build forms with proper labels and validation basics.",
      "Ship small page challenges in a mission path."
    ],
    position: [-12, 1.4, -10],
    color: "#61d9ff",
    relatedNodeIds: ["css"],
    slug: "html"
  },
  {
    id: "css",
    category: "Design Systems",
    title: "CSS",
    summary: "Style interfaces with layout systems, responsive design, animations, and component patterns.",
    prompt: "Click to enter the CSS mission world.",
    details: [
      "Practice box model, positioning, and flex/grid layouts.",
      "Build responsive sections with reusable utility patterns.",
      "Learn transitions and animations through mini missions."
    ],
    position: [10, 1.7, -4],
    color: "#8e7dff",
    relatedNodeIds: ["javascript"],
    slug: "css"
  },
  {
    id: "javascript",
    category: "Programming",
    title: "JavaScript",
    summary: "Build interaction using variables, control flow, functions, arrays, and DOM logic.",
    prompt: "Click to enter the JavaScript mission world.",
    details: [
      "Master fundamentals with practical code challenges.",
      "Use DOM events to create dynamic UI behavior.",
      "Complete sequential missions and unlock progress."
    ],
    position: [0, 1.5, -18],
    color: "#3cffb3",
    relatedNodeIds: ["html"],
    slug: "javascript"
  }
];

type WorldState = {
  activeNodeId: string | null;
  nodeSyncStatus: "error" | "live" | "local" | "syncing";
  nodes: KnowledgeNode[];
  playerPosition: [number, number, number];
  playerSpeed: number;
  playerYaw: number;
  syncMessage: string | null;
  setActiveNodeId: (nodeId: string | null) => void;
  setPlayerMotion: (speed: number, yaw: number) => void;
  setPlayerPosition: (position: [number, number, number]) => void;
  setNodes: (nodes: KnowledgeNode[]) => void;
  setNodeSyncStatus: (
    status: WorldState["nodeSyncStatus"],
    message?: string | null
  ) => void;
};

export const useWorld = create<WorldState>((set) => ({
  activeNodeId: null,
  nodeSyncStatus: "local",
  nodes: fallbackKnowledgeNodes,
  playerPosition: [0, 1.25, 12],
  playerSpeed: 0,
  playerYaw: Math.PI,
  syncMessage: null,
  setActiveNodeId: (activeNodeId) => set({ activeNodeId }),
  setNodes: (nodes) =>
    set(({ activeNodeId }) => ({
      activeNodeId: nodes.some((node) => node.id === activeNodeId) ? activeNodeId : null,
      nodes
    })),
  setNodeSyncStatus: (nodeSyncStatus, syncMessage = null) => set({ nodeSyncStatus, syncMessage }),
  setPlayerMotion: (playerSpeed, playerYaw) => set({ playerSpeed, playerYaw }),
  setPlayerPosition: (playerPosition) => set({ playerPosition })
}));
