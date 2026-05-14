import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import {
  Environment,
  Float,
  Grid,
  Html,
  Sparkles,
  Stars
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  CuboidCollider,
  Physics,
  RapierRigidBody,
  RigidBody
} from "@react-three/rapier";
import {
  AdditiveBlending,
  Color,
  Group,
  IcosahedronGeometry,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  ShaderMaterial,
  TorusKnotGeometry,
  Vector3
} from "three";
import { Hud, type LearnerProfile } from "../components/Hud";
import { Avatar } from "./Avatar";
import { fetchNodes, getWebSocketEndpoint, markNodeVisited, syncCurrentUser } from "./api";
import {
  isTopicId,
  topicCurriculum,
  type LessonVisual,
  type TopicId,
  type TopicLesson
} from "./curriculum";
import { useControls } from "./controls";
import { usePresence, type RemotePresence } from "./presence";
import {
  activationRadius,
  fallbackKnowledgeNodes,
  type KnowledgeNode,
  useWorld
} from "./world";

const spawnPoint = new Vector3(0, 2.2, 12);
const introCameraPosition = new Vector3(0, 3.1, 18);
const introCameraTarget = new Vector3(0, 2.2, -8);

function getClerkProfileRole(role: unknown): LearnerProfile["role"] {
  return role === "staff" ? "staff" : "student";
}

type TopicProgressState = Record<TopicId, string[]>;
type LessonQuizAnswerState = Record<string, number | null>;
type LessonQuizResultState = Record<string, boolean>;
type LessonQuizCheckedState = Record<string, boolean>;
type LessonReference = {
  fallbackImageUrl: string;
  imageUrl: string;
  relationText: string;
  sourceLabel: string;
  sourceUrl: string;
};
type LessonGuide = {
  definition: string;
  explainedSteps: string[];
  syntax: string;
};
type Lesson3DMeaning = {
  points: string[];
  summary: string;
  title: string;
};

type AchievementId =
  | "first-quiz"
  | "first-lesson"
  | "streak-3"
  | "streak-5"
  | "css-master"
  | "html-master"
  | "javascript-master";

type AchievementDefinition = {
  label: string;
  description: string;
};

const achievementCatalog: Record<AchievementId, AchievementDefinition> = {
  "first-quiz": {
    label: "First Quiz",
    description: "Pass your first quiz checkpoint."
  },
  "first-lesson": {
    label: "First Lesson",
    description: "Complete your first lesson mission."
  },
  "streak-3": {
    label: "Streak x3",
    description: "Complete three lessons in sequence."
  },
  "streak-5": {
    label: "Streak x5",
    description: "Complete five lessons in sequence."
  },
  "css-master": {
    label: "CSS Master",
    description: "Finish every CSS mission."
  },
  "html-master": {
    label: "HTML Master",
    description: "Finish every HTML mission."
  },
  "javascript-master": {
    label: "JavaScript Master",
    description: "Finish every JavaScript mission."
  }
};

const emptyTopicProgress: TopicProgressState = {
  css: [],
  html: [],
  javascript: []
};

const topicReferenceSource: Record<TopicId, { sourceLabel: string; sourceUrl: string }> = {
  css: {
    sourceLabel: "W3Schools CSS Tutorial",
    sourceUrl: "https://www.w3schools.com/css/"
  },
  html: {
    sourceLabel: "W3Schools HTML Tutorial",
    sourceUrl: "https://www.w3schools.com/html/"
  },
  javascript: {
    sourceLabel: "W3Schools JavaScript Tutorial",
    sourceUrl: "https://www.w3schools.com/js/"
  }
};

function buildLessonReference(topicId: TopicId, lesson: TopicLesson): LessonReference {
  const missionKeywords = lesson.mission
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ",")
    .replace(/^,+|,+$/g, "");
  const objectiveKeywords = lesson.objective
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ",")
    .replace(/^,+|,+$/g, "");
  const query = `${topicId},frontend,web,development,code,${missionKeywords},${objectiveKeywords}`;

  const placeholderSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='960' height='540' viewBox='0 0 960 540'>
<defs>
  <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
    <stop offset='0%' stop-color='#061327'/>
    <stop offset='100%' stop-color='#0d2b4f'/>
  </linearGradient>
</defs>
<rect width='960' height='540' fill='url(#bg)'/>
<rect x='36' y='36' width='888' height='468' rx='24' fill='rgba(2,10,20,0.58)' stroke='rgba(132,214,255,0.4)'/>
<text x='72' y='112' fill='#83ddff' font-size='28' font-family='Segoe UI, sans-serif'>${topicId.toUpperCase()} Lesson Reference</text>
<text x='72' y='176' fill='#f2f8ff' font-size='52' font-weight='700' font-family='Segoe UI, sans-serif'>${lesson.mission}</text>
<foreignObject x='72' y='216' width='816' height='208'>
  <div xmlns='http://www.w3.org/1999/xhtml' style='color:#d2e9ff;font-size:27px;line-height:1.45;font-family:Segoe UI,sans-serif;'>${lesson.objective}</div>
</foreignObject>
<text x='72' y='474' fill='#8ec4f6' font-size='23' font-family='Segoe UI, sans-serif'>Source: ${topicReferenceSource[topicId].sourceLabel}</text>
</svg>`;

  return {
    fallbackImageUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(placeholderSvg)}`,
    imageUrl: `https://source.unsplash.com/960x540/?${query}`,
    relationText: `This reference is selected for ${lesson.mission.toLowerCase()} and highlights: ${lesson.objective}`,
    sourceLabel: topicReferenceSource[topicId].sourceLabel,
    sourceUrl: topicReferenceSource[topicId].sourceUrl
  };
}

function buildLesson3DMeaning(lesson: TopicLesson): Lesson3DMeaning {
  const meaningByLessonId: Record<string, Lesson3DMeaning> = {
    "html-1": {
      title: "Document Skeleton In 3D",
      summary: "The stacked frame shows the required top-to-bottom HTML structure.",
      points: ["Top bar is head metadata.", "Main slab is body content where user-visible elements live."]
    },
    "html-2": {
      title: "Semantic Layout In 3D",
      summary: "Separate blocks represent header, nav, main, and footer responsibilities.",
      points: ["Each block has one content role.", "Clean layout means predictable accessibility."]
    },
    "html-3": {
      title: "Links And Lists Path",
      summary: "Connected nodes show a list of links guiding navigation flow.",
      points: ["Each node is one list item.", "The path means users can travel between pages."]
    },
    "html-4": {
      title: "Media Frame",
      summary: "The media frame represents image/video with caption context.",
      points: ["Large panel is media content.", "Caption layer explains media meaning."]
    },
    "html-5": {
      title: "Table Grid",
      summary: "The matrix model mirrors rows and columns in tabular data.",
      points: ["Top row maps to table headers.", "Cell slots map to tbody data values."]
    },
    "html-6": {
      title: "Form Pipeline",
      summary: "Input lanes flow into a submit node to represent form submission.",
      points: ["Fields collect structured values.", "Submit node sends validated input."]
    },
    "html-7": {
      title: "Validation Beacon",
      summary: "Green/alert layers represent pass/fail validation states.",
      points: ["Check signal means required rules pass.", "Fail signal means user must fix input."]
    },
    "html-8": {
      title: "Accessibility Map",
      summary: "Landmark pillars represent nav/main regions for assistive navigation.",
      points: ["Landmarks give screen readers structure.", "Labels define purpose for each region."]
    },
    "css-1": {
      title: "Selector Targeting",
      summary: "One highlighted block among many shows CSS selector targeting.",
      points: ["Highlight means selected element.", "Unlit blocks are unaffected elements."]
    },
    "css-2": {
      title: "Box Model Layers",
      summary: "Nested boxes represent margin, border, padding, and content.",
      points: ["Outer shell is margin space.", "Inner core is actual content area."]
    },
    "css-3": {
      title: "Typography Rhythm",
      summary: "Line stacks model text rhythm through size and line height.",
      points: ["Spacing between bars equals line-height.", "Bar scale maps to font-size hierarchy."]
    },
    "css-4": {
      title: "Flex Alignment Rail",
      summary: "Horizontal blocks demonstrate main-axis alignment and spacing.",
      points: ["Rail is flex container.", "Blocks are flex items with gap/alignment."]
    },
    "css-5": {
      title: "Grid Matrix",
      summary: "Cell matrix represents explicit grid columns and rows.",
      points: ["Columns reflect template definition.", "Uniform gaps show grid spacing control."]
    },
    "css-6": {
      title: "Responsive Breakpoint",
      summary: "Large and small frames show layout change at screen breakpoints.",
      points: ["Wide frame is desktop layout.", "Narrow frame is mobile rule output."]
    },
    "css-7": {
      title: "Transition Motion Path",
      summary: "Ghost positions represent start and end states during transition.",
      points: ["Path length shows travel distance.", "Intermediate fades show easing over time."]
    },
    "css-8": {
      title: "Theme Token Hub",
      summary: "A central token node feeds style values to connected components.",
      points: ["Center node is CSS variable source.", "Connected cards consume shared tokens."]
    },
    "js-1": {
      title: "Variable Storage Cells",
      summary: "Storage cells represent named variables holding values.",
      points: ["Each cell maps to one variable.", "Cell updates show reassignment behavior."]
    },
    "js-2": {
      title: "Condition Fork",
      summary: "Decision fork splits execution into true/false branches.",
      points: ["Left branch is true path.", "Right branch is false path."]
    },
    "js-3": {
      title: "Loop Orbit",
      summary: "Orbiting points show repeated execution over a collection.",
      points: ["Each orbit step is one iteration.", "Loop stops when exit condition is reached."]
    },
    "js-4": {
      title: "Function Input-Output",
      summary: "A function block transforms inputs into outputs.",
      points: ["Input port receives arguments.", "Output port emits return value."]
    },
    "js-5": {
      title: "Array Transform Line",
      summary: "Source items flow through a transform node into mapped results.",
      points: ["First row is original array.", "Second row is transformed output array."]
    },
    "js-6": {
      title: "Object Key-Value Structure",
      summary: "Grouped pillars represent key-value pairs inside one object.",
      points: ["Key pillar labels the property.", "Value pillar stores associated data."]
    },
    "js-7": {
      title: "DOM Query Link",
      summary: "Selector panel beam points to the matched DOM node.",
      points: ["Query starts from selector string.", "Matched node receives update in script."]
    },
    "js-8": {
      title: "Event Trigger Pulse",
      summary: "Button trigger emits pulses when an event listener runs.",
      points: ["Button surface is event source.", "Pulse wave is callback execution."]
    }
  };

  return meaningByLessonId[lesson.id] ?? {
    title: "Lesson Concept Model",
    summary: "This 3D model mirrors the current lesson flow and key objective.",
    points: ["Observe the structure of the model.", "Map each part to the lesson logic in code."]
  };
}

function LessonConceptModel({
  accent,
  lesson
}: {
  accent: string;
  lesson: TopicLesson;
}) {
  const lessonId = lesson.id;

  if (lessonId === "html-1") {
    return (
      <group>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[2.2, 2.8, 0.22]} />
          <meshStandardMaterial color="#0a1c30" emissive="#163a60" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 1.15, 0.12]}>
          <boxGeometry args={[1.8, 0.42, 0.08]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} />
        </mesh>
        <mesh position={[0, 0.25, 0.12]}>
          <boxGeometry args={[1.8, 1.25, 0.08]} />
          <meshStandardMaterial color="#2c597f" emissive="#4c95d0" emissiveIntensity={0.3} />
        </mesh>
      </group>
    );
  }

  if (lessonId === "html-5" || lessonId === "css-5") {
    return (
      <group>
        {Array.from({ length: 3 }).map((_, row) =>
          Array.from({ length: 4 }).map((__, col) => (
            <mesh key={`grid-${row}-${col}`} position={[-1.2 + col * 0.8, 0.7 - row * 0.6, 0]}>
              <boxGeometry args={[0.62, 0.42, 0.14]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.28} />
            </mesh>
          ))
        )}
      </group>
    );
  }

  if (lessonId === "css-2") {
    return (
      <group>
        <mesh>
          <boxGeometry args={[2.4, 2.4, 0.18]} />
          <meshStandardMaterial color="#2a203f" emissive="#4f3d78" emissiveIntensity={0.32} />
        </mesh>
        <mesh position={[0, 0, 0.08]}>
          <boxGeometry args={[1.7, 1.7, 0.1]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.36} />
        </mesh>
        <mesh position={[0, 0, 0.15]}>
          <boxGeometry args={[1.0, 1.0, 0.08]} />
          <meshStandardMaterial color="#e4f2ff" emissive="#9ecbff" emissiveIntensity={0.25} />
        </mesh>
      </group>
    );
  }

  if (lessonId === "js-2") {
    return (
      <group>
        <mesh position={[0, 0.6, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.9, 0.9, 0.2]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-0.95, -0.25, 0]}>
          <boxGeometry args={[1.0, 0.35, 0.16]} />
          <meshStandardMaterial color="#1f4a35" emissive="#3b9c6f" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0.95, -0.25, 0]}>
          <boxGeometry args={[1.0, 0.35, 0.16]} />
          <meshStandardMaterial color="#472323" emissive="#a45757" emissiveIntensity={0.35} />
        </mesh>
      </group>
    );
  }

  if (lessonId === "js-3") {
    return (
      <group>
        <mesh>
          <torusGeometry args={[1.15, 0.12, 18, 70]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
        </mesh>
        {[0, 1, 2, 3].map((index) => {
          const angle = (index / 4) * Math.PI * 2;

          return (
            <mesh key={`loop-node-${index}`} position={[Math.cos(angle) * 1.15, Math.sin(angle) * 1.15, 0.04]}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial color="#d8f4ff" emissive="#9bdeff" emissiveIntensity={0.4} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (lessonId === "js-8") {
    return (
      <group>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.95, 0.95, 0.3, 32]} />
          <meshStandardMaterial color="#1e2c41" emissive="#405f8e" emissiveIntensity={0.32} />
        </mesh>
        {[1.0, 1.45, 1.9].map((radius, index) => (
          <mesh key={`event-pulse-${index}`} position={[0, -0.01 + index * 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.05, 16, 64]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.58} />
          </mesh>
        ))}
      </group>
    );
  }

  if (lessonId.startsWith("css-")) {
    return (
      <group>
        {[-0.8, 0, 0.8].map((x, index) => (
          <mesh key={`css-block-${index}`} position={[x, -0.2 + index * 0.35, 0]}>
            <boxGeometry args={[0.55, 0.55, 0.22]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.42} />
          </mesh>
        ))}
      </group>
    );
  }

  if (lessonId.startsWith("html-")) {
    return (
      <group>
        {[0.9, 0.5, 0.1, -0.3].map((y, index) => (
          <mesh key={`html-layer-${index}`} position={[0, y, 0]}>
            <boxGeometry args={[2.0 - index * 0.2, 0.28, 0.18]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.34} />
          </mesh>
        ))}
      </group>
    );
  }

  if (lessonId.startsWith("js-")) {
    return (
      <group>
        <mesh>
          <torusKnotGeometry args={[0.82, 0.18, 128, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
        </mesh>
      </group>
    );
  }

  return <LessonArtifact color={accent} visual={lesson.visual} />;
}

function buildHtmlPreviewDocument(code: string): string {
  const trimmed = code.trim();

  if (!trimmed) {
    return "<!doctype html><html><body><p>Add HTML in the editor to see output.</p></body></html>";
  }

  if (/<!doctype|<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: "Segoe UI", sans-serif;
        background: #f5f8ff;
        color: #0d1e33;
      }
    </style>
  </head>
  <body>
    ${trimmed}
  </body>
</html>`;
}

function buildCssPreviewDocument(code: string): string {
  const safeCss = code.replace(/<\/style/gi, "<\\/style");

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
      }

      body {
        margin: 0;
        padding: 18px;
        font-family: "Segoe UI", sans-serif;
        background: #f2f6ff;
        color: #0f1e34;
      }

      .preview-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .preview-card {
        border: 1px solid #c8d9ff;
        border-radius: 12px;
        padding: 12px;
        background: white;
      }

      .preview-button {
        border: 0;
        border-radius: 999px;
        padding: 8px 12px;
        background: #2c8fff;
        color: white;
      }

      ${safeCss}
    </style>
  </head>
  <body>
    <main class="preview-grid">
      <article class="preview-card">
        <h2>CSS Mission</h2>
        <p>Style this card from your editor.</p>
        <button class="preview-button">Action</button>
      </article>
      <article class="preview-card">
        <h2>Responsive Box</h2>
        <p>Use selectors, spacing, and layout rules.</p>
      </article>
    </main>
  </body>
</html>`;
}

function buildJavaScriptPreviewDocument(code: string): string {
  const encodedCode = JSON.stringify(code);

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: "Segoe UI", sans-serif;
        background: #f7fbff;
        color: #10233d;
      }

      #run {
        border: 0;
        border-radius: 999px;
        padding: 8px 12px;
        background: #2d9cff;
        color: white;
        font-weight: 700;
        cursor: pointer;
      }

      #log {
        margin-top: 12px;
        border-radius: 10px;
        background: #081427;
        color: #97d6ff;
        padding: 10px;
        min-height: 94px;
        white-space: pre-wrap;
        font-family: "Fira Code", monospace;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <h2 id="title">JavaScript Mission Preview</h2>
    <button id="run">Run Script</button>
    <pre id="log"></pre>
    <script>
      const logNode = document.getElementById("log");
      const runButton = document.getElementById("run");
      const userCode = ${encodedCode};

      const writeLog = (...items) => {
        const line = items.map((item) => {
          if (typeof item === "string") {
            return item;
          }

          try {
            return JSON.stringify(item);
          } catch {
            return String(item);
          }
        }).join(" ");

        logNode.textContent += line + "\\n";
      };

      const runCode = () => {
        logNode.textContent = "";

        const sandboxConsole = {
          ...console,
          error: (...args) => writeLog("Error:", ...args),
          log: (...args) => writeLog(...args),
          warn: (...args) => writeLog("Warn:", ...args)
        };

        try {
          new Function("console", "document", "window", userCode)(sandboxConsole, document, window);
        } catch (error) {
          const message = error && typeof error === "object" && "message" in error
            ? error.message
            : String(error);
          writeLog("Error:", message);
        }

        if (!logNode.textContent.trim()) {
          writeLog("Script executed with no console output.");
        }
      };

      runButton.addEventListener("click", runCode);
      runCode();
    <\/script>
  </body>
</html>`;
}

function buildLessonPreviewDocument(topicId: TopicId, code: string): string {
  if (topicId === "html") {
    return buildHtmlPreviewDocument(code);
  }

  if (topicId === "css") {
    return buildCssPreviewDocument(code);
  }

  return buildJavaScriptPreviewDocument(code);
}

function getFallbackSyntax(topicId: TopicId): string {
  if (topicId === "html") {
    return "<section>\n  <h2>Lesson Title</h2>\n  <p>Lesson content</p>\n</section>";
  }

  if (topicId === "css") {
    return ".lesson-card {\n  border: 1px solid #d0ddff;\n  padding: 12px;\n}";
  }

  return "const lessonState = { complete: false };\nconsole.log(lessonState);";
}

function buildLessonGuide(topicId: TopicId, lesson: TopicLesson): LessonGuide {
  const syntax = lesson.starterCode.trim() || getFallbackSyntax(topicId);

  if (topicId === "html") {
    return {
      definition: `${lesson.mission} teaches page structure and meaning through semantic tags so both users and browsers understand the content flow clearly.`,
      explainedSteps: [
        "Start with semantic containers like header, main, section, and footer instead of generic div blocks.",
        "Keep accessible labels and clear heading order so the structure remains readable.",
        "Run the code in Live Output and confirm the content hierarchy matches the mission goal."
      ],
      syntax
    };
  }

  if (topicId === "css") {
    return {
      definition: `${lesson.mission} focuses on styling rules where selectors target elements and declarations control layout, spacing, and visual behavior.`,
      explainedSteps: [
        "Write a selector that targets only the element you want to style.",
        "Add declarations for spacing, typography, layout, or motion based on this lesson objective.",
        "Check the visual result in Live Output and refine values until the design behaves correctly."
      ],
      syntax
    };
  }

  return {
    definition: `${lesson.mission} builds JavaScript logic for interaction, state updates, and dynamic page behavior through functions, conditions, or DOM APIs.`,
    explainedSteps: [
      "Create variables or functions for the mission behavior before touching the UI.",
      "Attach logic to DOM elements or events when interaction is needed.",
      "Run the script and inspect logs/output to verify the lesson logic works as expected."
    ],
    syntax
  };
}

function getProgressStorageKey(userId: string | null, profileName: string | null) {
  if (userId) {
    return `three-d-learning-topic-progress-${userId}`;
  }

  const safeName = (profileName ?? "guest")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return `three-d-learning-topic-progress-${safeName || "guest"}`;
}

function getXpStorageKey(userId: string | null, profileName: string | null) {
  if (userId) {
    return `three-d-learning-xp-${userId}`;
  }

  const safeName = (profileName ?? "guest")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return `three-d-learning-xp-${safeName || "guest"}`;
}

function getAchievementStorageKey(userId: string | null, profileName: string | null) {
  if (userId) {
    return `three-d-learning-achievements-${userId}`;
  }

  const safeName = (profileName ?? "guest")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return `three-d-learning-achievements-${safeName || "guest"}`;
}

function getStreakStorageKey(userId: string | null, profileName: string | null) {
  if (userId) {
    return `three-d-learning-streak-${userId}`;
  }

  const safeName = (profileName ?? "guest")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return `three-d-learning-streak-${safeName || "guest"}`;
}

function PlayerController({
  enabled,
  respawnTick
}: {
  enabled: boolean;
  respawnTick: number;
}) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const getControls = useControls;
  const setPlayerPosition = useWorld.getState().setPlayerPosition;
  const setPlayerMotion = useWorld.getState().setPlayerMotion;
  const direction = useMemo(() => new Vector3(), []);
  const forward = useMemo(() => new Vector3(), []);
  const rawForward = useMemo(() => new Vector3(), []);
  const sideways = useMemo(() => new Vector3(), []);
  const facing = useMemo(() => new Vector3(), []);
  const chasePosition = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const body = bodyRef.current;
    const perspectiveCamera = camera as PerspectiveCamera;

    if (!body) {
      return;
    }

    body.setTranslation(spawnPoint, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    setPlayerPosition([spawnPoint.x, spawnPoint.y, spawnPoint.z]);
    setPlayerMotion(0, Math.PI);
    perspectiveCamera.position.set(spawnPoint.x, spawnPoint.y + 1.9, spawnPoint.z + 3.6);
  }, [camera, respawnTick, setPlayerMotion, setPlayerPosition]);

  useFrame((_, delta) => {
    const body = bodyRef.current;

    if (!body) {
      return;
    }

    const perspectiveCamera = camera as PerspectiveCamera;

    if (!enabled) {
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    const { forward: moveForward, backward, left, right, sprint } =
      getControls.getState();

    perspectiveCamera.getWorldDirection(rawForward);
    forward.copy(rawForward);
    forward.y = 0;
    if (forward.lengthSq() === 0) {
      forward.set(0, 0, -1);
    } else {
      forward.normalize();
    }

    sideways.set(forward.z, 0, -forward.x);
    direction.set(0, 0, 0);

    if (moveForward) {
      direction.add(forward);
    }

    if (backward) {
      direction.sub(forward);
    }

    if (left) {
      direction.sub(sideways);
    }

    if (right) {
      direction.add(sideways);
    }

    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(sprint ? 8.4 : 5.6);
    }

    const velocity = body.linvel();
    body.setLinvel(
      {
        x: direction.x,
        y: velocity.y,
        z: direction.z
      },
      true
    );

    const position = body.translation();
    const speed = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    facing.copy(speed > 0.01 ? direction : forward).normalize();

    setPlayerPosition([position.x, position.y, position.z]);
    setPlayerMotion(speed, Math.atan2(facing.x, facing.z));
    chasePosition
      .set(position.x, position.y + 1.8, position.z)
      .addScaledVector(forward, -3.6);
    perspectiveCamera.position.lerp(chasePosition, 1 - Math.exp(-delta * 10));
    perspectiveCamera.lookAt(position.x, position.y + 1.1, position.z);

    const targetFov = sprint && direction.lengthSq() > 0 ? 82 : 74;
    perspectiveCamera.fov = MathUtils.damp(
      perspectiveCamera.fov,
      targetFov,
      8,
      delta
    );
    perspectiveCamera.updateProjectionMatrix();

    if (position.y < -2) {
      body.setTranslation(spawnPoint, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      setPlayerPosition([spawnPoint.x, spawnPoint.y, spawnPoint.z]);
      setPlayerMotion(0, Math.PI);
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      friction={0.2}
      linearDamping={2.2}
      angularDamping={4}
      enabledRotations={[false, false, false]}
      position={spawnPoint.toArray()}
      canSleep={false}
    >
      <CapsuleCollider args={[0.52, 0.38]} />
      <mesh castShadow visible={false}>
        <capsuleGeometry args={[0.38, 1.05, 8, 16]} />
        <meshStandardMaterial color="#69f0ff" />
      </mesh>
    </RigidBody>
  );
}

function IntroCameraRig({ isMenuOpen }: { isMenuOpen: boolean }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!isMenuOpen) {
      return;
    }

    camera.position.lerp(introCameraPosition, 1 - Math.exp(-delta * 4));
    camera.lookAt(introCameraTarget);
  });

  return null;
}

function KeyboardBridge() {
  useEffect(() => {
    const setPressed = useControls.getState().setPressed;

    const onKeyDown = (event: KeyboardEvent) => {
      setPressed(event.code, true);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      setPressed(event.code, false);
    };

    const onBlur = () => {
      const controls = useControls.getState();
      controls.setPressed("KeyW", false);
      controls.setPressed("KeyS", false);
      controls.setPressed("KeyA", false);
      controls.setPressed("KeyD", false);
      controls.setPressed("ShiftLeft", false);
      controls.setPressed("ShiftRight", false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return null;
}

function ProximityTracker() {
  const player = useMemo(() => new Vector3(), []);
  const nodePosition = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const { nodes, playerPosition, activeNodeId, setActiveNodeId } = useWorld.getState();

    player.set(...playerPosition);

    let nextNodeId: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    nodes.forEach((node) => {
      nodePosition.set(...node.position);
      const distance = player.distanceTo(nodePosition);

      if (distance <= activationRadius && distance < nearestDistance) {
        nearestDistance = distance;
        nextNodeId = node.id;
      }
    });

    if (nextNodeId !== activeNodeId) {
      setActiveNodeId(nextNodeId);
    }
  });

  return null;
}

function Marker({
  isAnimated,
  node,
  onSelect,
  showLabel
}: {
  isAnimated: boolean;
  node: KnowledgeNode;
  onSelect?: (node: KnowledgeNode) => void;
  showLabel: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const ringRef = useRef<Mesh>(null);
  const player = useMemo(() => new Vector3(), []);
  const nodePosition = useMemo(() => new Vector3(...node.position), [node.position]);
  const activeNodeId = useWorld((state) => state.activeNodeId);
  const isActive = activeNodeId === node.id;

  const handleClick = () => {
    onSelect?.(node);
  };

  useFrame((state, delta) => {
    const { playerPosition } = useWorld.getState();
    const group = groupRef.current;
    const material = materialRef.current;
    const ring = ringRef.current;

    if (!group || !material || !ring) {
      return;
    }

    player.set(...playerPosition);
    const distance = player.distanceTo(nodePosition);
    const proximity = MathUtils.clamp(1 - distance / activationRadius, 0, 1);
    const targetScale = 1 + proximity * 0.42 + (isActive ? 0.08 : 0);
    const targetRingScale = 1.05 + proximity * 0.28;

    group.scale.setScalar(MathUtils.damp(group.scale.x, targetScale, 5, delta));
    ring.scale.setScalar(MathUtils.damp(ring.scale.x, targetRingScale, 7, delta));
    ring.position.y = MathUtils.damp(ring.position.y, -0.95 + proximity * 0.18, 5, delta);

    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uProximity.value = proximity;
  });

  const markerBody = (
    <group ref={groupRef}>
      <mesh castShadow>
        <icosahedronGeometry args={[0.8, 5]} />
        <shaderMaterial
          ref={materialRef}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          uniforms={{
            uTime: { value: 0 },
            uColor: { value: new Color(node.color) },
            uProximity: { value: 0 }
          }}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec2 vUv;

            void main() {
              vNormal = normal;
              vPosition = position;
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float uTime;
            uniform vec3 uColor;
            uniform float uProximity;

            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec2 vUv;

            void main() {
              float pulse = 0.55 + 0.45 * sin(uTime * (2.0 + uProximity * 4.0) + vPosition.y * 7.0);
              float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.2);
              float ring = smoothstep(0.2, 0.95, sin((vUv.y + uTime * 0.25) * 14.0) * 0.5 + 0.5);
              vec3 color = uColor * (1.15 + pulse * 0.85 + uProximity * 0.75 + ring * 0.1);
              float alpha = 0.64 + fresnel * 0.26 + uProximity * 0.16;
              gl_FragColor = vec4(color, alpha);
            }
          `}
        />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.34, 32, 32]} />
        <meshBasicMaterial color={node.color} />
      </mesh>

      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.95, 0]}>
        <torusGeometry args={[1.25, 0.06, 16, 48]} />
        <meshBasicMaterial color={node.color} />
      </mesh>

      {showLabel ? (
        <Html position={[0, 1.5, 0]} center distanceFactor={14}>
          <div className={`marker-card ${isActive ? "is-active" : ""}`}>
            <strong>{node.title}</strong>
            <span>{node.prompt}</span>
          </div>
        </Html>
      ) : null}
    </group>
  );

  if (!isAnimated) {
    return (
      <group onClick={handleClick} position={node.position}>
        {markerBody}
      </group>
    );
  }

  return (
    <Float
      speed={1.1}
      rotationIntensity={0.35}
      floatIntensity={0.7}
      position={node.position}
    >
      <group onClick={handleClick}>{markerBody}</group>
    </Float>
  );
}

function NodeBeam({
  color,
  end,
  start
}: {
  color: string;
  end: [number, number, number];
  start: [number, number, number];
}) {
  const materialRef = useRef<MeshStandardMaterial>(null);
  const player = useMemo(() => new Vector3(), []);
  const { length, midpoint, position, quaternion } = useMemo(() => {
    const startVector = new Vector3(...start);
    const endVector = new Vector3(...end);
    const beamDirection = endVector.clone().sub(startVector);
    const beamMidpoint = startVector.clone().add(endVector).multiplyScalar(0.5);
    const beamQuaternion = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      beamDirection.clone().normalize()
    );

    return {
      length: beamDirection.length(),
      midpoint: beamMidpoint,
      position: beamMidpoint.toArray() as [number, number, number],
      quaternion: beamQuaternion
    };
  }, [end, start]);

  useFrame((_, delta) => {
    const material = materialRef.current;

    if (!material) {
      return;
    }

    const { playerPosition } = useWorld.getState();
    player.set(...playerPosition);

    const midpointDistance = player.distanceTo(midpoint);
    const proximity = MathUtils.clamp(1 - midpointDistance / 18, 0.15, 1);
    material.emissiveIntensity = MathUtils.damp(
      material.emissiveIntensity,
      1 + proximity * 3.2,
      5,
      delta
    );
    material.opacity = MathUtils.damp(material.opacity, 0.24 + proximity * 0.46, 5, delta);
  });

  return (
    <group position={position} quaternion={quaternion}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.06, length, 20]} />
        <meshStandardMaterial
          ref={materialRef}
          transparent
          color={color}
          emissive={new Color(color)}
          emissiveIntensity={1.2}
          metalness={0.55}
          roughness={0.16}
          opacity={0.34}
        />
      </mesh>
    </group>
  );
}

function ConnectionNetwork() {
  const nodes = useWorld((state) => state.nodes);
  const connections = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));

    return nodes.flatMap((node) =>
      node.relatedNodeIds
        .map((relatedId) => {
          const target = byId.get(relatedId);

          if (!target) {
            return null;
          }

          return {
            color: node.color,
            end: target.position,
            id: `${node.id}-${relatedId}`,
            start: node.position
          };
        })
        .filter((value): value is {
          color: string;
          end: [number, number, number];
          id: string;
          start: [number, number, number];
        } => value !== null)
    );
  }, [nodes]);

  return (
    <>
      {connections.map((connection) => (
        <NodeBeam key={connection.id} {...connection} />
      ))}
    </>
  );
}

function MarkerHalo({
  color,
  isAnimated,
  position
}: {
  color: string;
  isAnimated: boolean;
  position: [number, number, number];
}) {
  const halo = (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.4, 1.8, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.14} />
    </mesh>
  );

  if (!isAnimated) {
    return (
      <group position={[position[0], position[1] - 0.45, position[2]]}>
        {halo}
      </group>
    );
  }

  return (
    <Float
      speed={1.1}
      rotationIntensity={0.35}
      floatIntensity={0.7}
      position={[position[0], position[1] - 0.45, position[2]]}
    >
      {halo}
    </Float>
  );
}

function SceneArt({
  animateWorld,
  onNodeSelect,
  showLabels,
  showNodes
}: {
  animateWorld: boolean;
  onNodeSelect?: (node: KnowledgeNode) => void;
  showLabels: boolean;
  showNodes: boolean;
}) {
  const nodes = useWorld((state) => state.nodes);

  return (
    <>
      <fog attach="fog" args={["#050816", 10, 78]} />
      <color attach="background" args={["#02030a"]} />

      <Suspense fallback={null}>
        <Environment preset="night" />
        <Stars
          radius={140}
          depth={50}
          count={5000}
          factor={3.2}
          saturation={0}
          fade
          speed={animateWorld ? 0.7 : 0}
        />
        <Sparkles count={90} size={3} scale={[70, 15, 70]} speed={animateWorld ? 0.3 : 0} />
      </Suspense>

      <ambientLight intensity={0.18} />
      <directionalLight
        castShadow
        position={[16, 22, 10]}
        intensity={1.2}
        color="#7c9dff"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 6, -12]} intensity={18} color="#36b8ff" />
      <pointLight position={[-14, 4, -8]} intensity={13} color="#8b5cf6" />
      <pointLight position={[12, 4, -4]} intensity={10} color="#2af598" />

      <Grid
        position={[0, 0, 0]}
        args={[220, 220]}
        cellSize={1}
        cellThickness={0.45}
        cellColor="#0a2635"
        sectionSize={8}
        sectionThickness={1.1}
        sectionColor="#1aa7d8"
        infiniteGrid
        fadeDistance={120}
        fadeStrength={1.5}
      />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial
          color="#040816"
          emissive="#0b1731"
          emissiveIntensity={0.4}
          metalness={0.75}
          roughness={0.35}
        />
      </mesh>

      {showNodes ? <ConnectionNetwork /> : null}

      {showNodes
        ? nodes.map((node) => (
            <group key={node.id}>
              <Marker
                isAnimated={animateWorld}
                node={node}
                onSelect={onNodeSelect}
                showLabel={showLabels}
              />
              <MarkerHalo isAnimated={animateWorld} position={node.position} color={node.color} />
            </group>
          ))
        : null}

      <ResearchStructures
        isAnimated={animateWorld}
        showLabel={showLabels}
      />
    </>
  );
}

function ResearchStructures({
  isAnimated,
  showLabel
}: {
  isAnimated: boolean;
  showLabel: boolean;
}) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 4.6, -6]}>
        <boxGeometry args={[28, 0.35, 34]} />
        <meshStandardMaterial
          color="#050d17"
          emissive="#0b1c30"
          emissiveIntensity={0.28}
          metalness={0.84}
          roughness={0.24}
        />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 2.3, -22]}>
        <boxGeometry args={[28, 5, 0.8]} />
        <meshStandardMaterial
          color="#06101a"
          emissive="#0d2237"
          emissiveIntensity={0.36}
          metalness={0.8}
          roughness={0.22}
        />
      </mesh>

      {[
        [-16, 1.8, -16],
        [-16, 1.8, 0],
        [16, 1.8, -16],
        [16, 1.8, 0]
      ].map((position, index) => (
        <group key={index} position={position as [number, number, number]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.75, 1.1, 3.6, 24]} />
            <meshStandardMaterial
              color="#08111e"
              emissive="#10253d"
              emissiveIntensity={0.5}
              metalness={0.82}
              roughness={0.22}
            />
          </mesh>
          <mesh position={[0, 1.9, 0]}>
            <cylinderGeometry args={[0.95, 0.95, 0.14, 24]} />
            <meshStandardMaterial
              color="#67e8f9"
              emissive="#67e8f9"
              emissiveIntensity={2}
            />
          </mesh>
        </group>
      ))}

      {[
        [-10.5, 1.1, 1],
        [10.5, 1.1, 1],
        [-10.5, 1.1, -12],
        [10.5, 1.1, -12]
      ].map((position, index) => (
        <mesh key={`glass-${index}`} position={position as [number, number, number]}>
          <boxGeometry args={[0.18, 2.2, 11.5]} />
          <meshStandardMaterial
            color="#102338"
            emissive="#153a5c"
            emissiveIntensity={0.55}
            metalness={0.28}
            roughness={0.12}
            transparent
            opacity={0.32}
          />
        </mesh>
      ))}

      {[-9, -3, 3, 9].map((x, index) => (
        <group key={`ceiling-strip-${index}`} position={[x, 4.4, -6]}>
          <mesh>
            <boxGeometry args={[0.18, 0.18, 28]} />
            <meshStandardMaterial
              color="#08111d"
              emissive="#10253d"
              emissiveIntensity={0.48}
              metalness={0.85}
              roughness={0.18}
            />
          </mesh>
          <mesh position={[0, -0.14, 0]}>
            <boxGeometry args={[0.05, 0.05, 28]} />
            <meshBasicMaterial color="#4ce3ff" />
          </mesh>
        </group>
      ))}

      <mesh castShadow receiveShadow position={[0, 1.6, -26]}>
        <boxGeometry args={[20, 3.2, 1.2]} />
        <meshStandardMaterial
          color="#07111d"
          emissive="#0d203d"
          emissiveIntensity={0.45}
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>

      <group position={[0, 0, 8]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3.4, 48]} />
          <meshBasicMaterial color="#49d7ff" transparent opacity={0.08} />
        </mesh>
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <cylinderGeometry args={[2.2, 2.45, 0.24, 32]} />
          <meshStandardMaterial
            color="#07111d"
            emissive="#0f2942"
            emissiveIntensity={0.72}
            metalness={0.82}
            roughness={0.18}
          />
        </mesh>
        <mesh position={[0, 2.2, -5.2]}>
          <torusGeometry args={[6.6, 0.1, 18, 64]} />
          <meshStandardMaterial
            color="#16314e"
            emissive="#36b8ff"
            emissiveIntensity={0.42}
            metalness={0.84}
            roughness={0.16}
          />
        </mesh>
        <mesh position={[0, 2.2, -5.2]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[6.6, 0.1, 18, 64]} />
          <meshStandardMaterial
            color="#16314e"
            emissive="#36b8ff"
            emissiveIntensity={0.42}
            metalness={0.84}
            roughness={0.16}
          />
        </mesh>
      </group>
    </group>
  );
}

function getLessonWorldPosition(index: number): [number, number, number] {
  const row = Math.floor(index / 4);
  const column = index % 4;
  const direction = row % 2 === 0 ? 1 : -1;
  const x = (direction === 1 ? -18 : 18) + direction * column * 12;
  const z = -14 - row * 12;

  return [x, 1.5, z];
}

function LessonArtifact({
  color,
  visual
}: {
  color: string;
  visual: LessonVisual;
}) {
  if (visual === "cube") {
    return (
      <mesh castShadow>
        <boxGeometry args={[1.3, 1.3, 1.3]} />
        <meshStandardMaterial color={color} emissive={new Color(color)} emissiveIntensity={0.6} />
      </mesh>
    );
  }

  if (visual === "portal") {
    return (
      <mesh castShadow>
        <torusKnotGeometry args={[0.78, 0.2, 128, 16]} />
        <meshStandardMaterial color={color} emissive={new Color(color)} emissiveIntensity={0.9} />
      </mesh>
    );
  }

  if (visual === "bridge") {
    return (
      <group>
        <mesh castShadow position={[0, 0.2, 0]}>
          <boxGeometry args={[2.1, 0.35, 0.8]} />
          <meshStandardMaterial color={color} emissive={new Color(color)} emissiveIntensity={0.75} />
        </mesh>
        <mesh castShadow position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 1.4, 18]} />
          <meshStandardMaterial color="#0c1726" emissive="#153253" emissiveIntensity={0.55} />
        </mesh>
      </group>
    );
  }

  if (visual === "console") {
    return (
      <group>
        <mesh castShadow>
          <boxGeometry args={[1.6, 0.32, 1.1]} />
          <meshStandardMaterial color="#0d1d32" emissive="#20436e" emissiveIntensity={0.62} />
        </mesh>
        <mesh castShadow position={[0, 0.32, 0]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[1.2, 0.08, 0.8]} />
          <meshStandardMaterial color={color} emissive={new Color(color)} emissiveIntensity={1.2} />
        </mesh>
      </group>
    );
  }

  if (visual === "beacon") {
    return (
      <group>
        <mesh castShadow>
          <cylinderGeometry args={[0.32, 0.52, 1.6, 20]} />
          <meshStandardMaterial color="#10233a" emissive="#183a5d" emissiveIntensity={0.58} />
        </mesh>
        <mesh castShadow position={[0, 0.95, 0]}>
          <sphereGeometry args={[0.36, 24, 24]} />
          <meshStandardMaterial color={color} emissive={new Color(color)} emissiveIntensity={1.25} />
        </mesh>
      </group>
    );
  }

  if (visual === "gateway") {
    return (
      <group>
        <mesh castShadow>
          <torusGeometry args={[0.95, 0.14, 20, 64]} />
          <meshStandardMaterial color={color} emissive={new Color(color)} emissiveIntensity={0.95} />
        </mesh>
        <mesh castShadow position={[0, -0.62, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 1.2, 18]} />
          <meshStandardMaterial color="#10233a" emissive="#1b3e63" emissiveIntensity={0.5} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh castShadow>
      <primitive object={new IcosahedronGeometry(0.92, 0)} attach="geometry" />
      <meshStandardMaterial color={color} emissive={new Color(color)} emissiveIntensity={0.72} />
    </mesh>
  );
}

function TopicLabScenery({ topicId }: { topicId: TopicId }) {
  const topic = topicCurriculum[topicId];

  return (
    <>
      <fog attach="fog" args={["#030814", 12, 94]} />
      <color attach="background" args={["#02050f"]} />

      <ambientLight intensity={0.3} />
      <pointLight color={topic.accent} intensity={16} position={[0, 8, -24]} />
      <pointLight color="#6fa7ff" intensity={10} position={[-18, 5, -26]} />
      <pointLight color="#4de3ff" intensity={10} position={[18, 5, -26]} />

      <Grid
        position={[0, 0, -24]}
        args={[140, 140]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#0f2a45"
        sectionSize={6}
        sectionThickness={1}
        sectionColor={topic.accent}
        infiniteGrid
        fadeDistance={95}
        fadeStrength={1.6}
      />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, -24]}>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial
          color="#071425"
          emissive="#112846"
          emissiveIntensity={0.5}
          metalness={0.7}
          roughness={0.26}
        />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 3.8, -46]}>
        <boxGeometry args={[54, 7.2, 1]} />
        <meshStandardMaterial
          color="#091627"
          emissive="#17375e"
          emissiveIntensity={0.45}
          metalness={0.7}
          roughness={0.22}
        />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 6.8, -24]}>
        <boxGeometry args={[54, 0.26, 52]} />
        <meshStandardMaterial
          color="#081321"
          emissive="#102746"
          emissiveIntensity={0.35}
          metalness={0.82}
          roughness={0.18}
        />
      </mesh>

      {topicId === "html" ? (
        <group>
          <mesh castShadow receiveShadow position={[0, 3.1, -37]}>
            <boxGeometry args={[18, 10.4, 0.8]} />
            <meshStandardMaterial color="#0a1e33" emissive="#16395d" emissiveIntensity={0.42} metalness={0.7} roughness={0.2} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 3.1, -36.42]}>
            <boxGeometry args={[16.6, 8.9, 0.3]} />
            <meshStandardMaterial color="#062b45" emissive="#54d3ff" emissiveIntensity={0.24} metalness={0.34} roughness={0.25} />
          </mesh>
          {[-5.6, 0, 5.6].map((x, index) => (
            <mesh key={`html-column-${index}`} castShadow receiveShadow position={[x, 1.2, -31.2]}>
              <boxGeometry args={[2.7, 2.4, 2.7]} />
              <meshStandardMaterial color="#12365a" emissive="#4dcfff" emissiveIntensity={0.4} metalness={0.65} roughness={0.2} />
            </mesh>
          ))}
        </group>
      ) : null}

      {topicId === "css" ? (
        <group>
          <mesh castShadow position={[0, 2.2, -36]}>
            <sphereGeometry args={[2.1, 48, 48]} />
            <meshStandardMaterial color="#8e7dff" emissive="#8e7dff" emissiveIntensity={0.78} metalness={0.74} roughness={0.16} />
          </mesh>
          {[0, Math.PI / 3, (2 * Math.PI) / 3].map((rot, index) => (
            <mesh key={`css-ring-${index}`} position={[0, 2.2, -36]} rotation={[rot, rot * 0.5, rot]}>
              <torusGeometry args={[3.25, 0.09, 16, 80]} />
              <meshStandardMaterial color="#c5b9ff" emissive="#8e7dff" emissiveIntensity={0.5} metalness={0.78} roughness={0.14} />
            </mesh>
          ))}
          {[-8, 0, 8].map((x, index) => (
            <mesh key={`css-panel-${index}`} castShadow receiveShadow position={[x, 1.2, -30.4]} rotation={[-0.12, 0, 0]}>
              <boxGeometry args={[4.2, 2.4, 0.3]} />
              <meshStandardMaterial color="#311f59" emissive="#987cff" emissiveIntensity={0.42} metalness={0.62} roughness={0.22} />
            </mesh>
          ))}
        </group>
      ) : null}

      {topicId === "javascript" ? (
        <group>
          <mesh castShadow receiveShadow position={[0, 2.1, -36]}>
            <boxGeometry args={[3.3, 3.3, 3.3]} />
            <meshStandardMaterial color="#0f2a1f" emissive="#2dfca9" emissiveIntensity={0.62} metalness={0.72} roughness={0.16} />
          </mesh>
          {[0, Math.PI / 2].map((rot, index) => (
            <mesh key={`js-orbit-${index}`} position={[0, 2.1, -36]} rotation={[rot, 0, Math.PI / 4]}>
              <torusGeometry args={[4.4, 0.1, 16, 80]} />
              <meshStandardMaterial color="#7dffd6" emissive="#3cffb3" emissiveIntensity={0.58} metalness={0.78} roughness={0.14} />
            </mesh>
          ))}
          {[-9, -3, 3, 9].map((x, index) => (
            <mesh key={`js-chip-${index}`} castShadow receiveShadow position={[x, 1.05, -30.8]}>
              <boxGeometry args={[2.2, 1.2, 1.4]} />
              <meshStandardMaterial color="#102d24" emissive="#36e6a9" emissiveIntensity={0.45} metalness={0.62} roughness={0.22} />
            </mesh>
          ))}
        </group>
      ) : null}

    </>
  );
}

function TopicMissionWorld({
  completedLessonIds,
  onSelectLesson,
  selectedLessonId,
  topicId
}: {
  completedLessonIds: string[];
  onSelectLesson: (lessonId: string) => void;
  selectedLessonId: string | null;
  topicId: TopicId;
}) {
  const topic = topicCurriculum[topicId];
  const lessonPositions = useMemo(
    () => topic.lessons.map((_, index) => getLessonWorldPosition(index)),
    [topic.lessons]
  );

  return (
    <group>
      <TopicLabScenery topicId={topicId} />

      {lessonPositions.slice(0, -1).map((position, index) => {
        const next = lessonPositions[index + 1];

        return (
          <NodeBeam
            key={`mission-link-${topic.id}-${index}`}
            color={topic.accent}
            end={next}
            start={position}
          />
        );
      })}

      {topic.lessons.map((lesson, index) => {
        const position = lessonPositions[index];
        const isCompleted = completedLessonIds.includes(lesson.id);
        const isCurrent = !isCompleted && index === completedLessonIds.length;
        const isUnlocked = index <= completedLessonIds.length;
        const isSelected = selectedLessonId === lesson.id;

        return (
          <group key={lesson.id} position={position}>
            <Float
              speed={1.1}
              rotationIntensity={0.2}
              floatIntensity={0.35}
            >
              <group
                onClick={() => {
                  if (!isUnlocked) {
                    return;
                  }

                  onSelectLesson(lesson.id);
                }}
              >
                <LessonArtifact color={isCompleted ? "#35f0bf" : topic.accent} visual={lesson.visual} />
              </group>
            </Float>

            <mesh position={[0, -1.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.6, 0.09, 18, 64]} />
              <meshBasicMaterial
                color={
                  isCompleted ? "#35f0bf" : isCurrent ? topic.accent : isUnlocked ? "#3f6ca0" : "#25354a"
                }
              />
            </mesh>

          </group>
        );
      })}
    </group>
  );
}

function TopicStudio({
  code,
  completedLessonIds,
  lessonSelectionTick,
  onExploreLab,
  onBackToHub,
  onCodeChange,
  onCompleteLesson,
  onQuizAnswerSelect,
  onQuizSubmit,
  onSelectLesson,
  quizAnswer,
  quizChecked,
  quizPassed,
  selectedLessonId,
  topicId
}: {
  code: string;
  completedLessonIds: string[];
  lessonSelectionTick: number;
  onExploreLab: () => void;
  onBackToHub: () => void;
  onCodeChange: (value: string) => void;
  onCompleteLesson: () => void;
  onQuizAnswerSelect: (index: number) => void;
  onQuizSubmit: () => void;
  onSelectLesson: (lessonId: string) => void;
  quizAnswer: number | null;
  quizChecked: boolean;
  quizPassed: boolean;
  selectedLessonId: string | null;
  topicId: TopicId;
}) {
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const topic = topicCurriculum[topicId];
  const progressPercent = Math.round((completedLessonIds.length / topic.lessons.length) * 100);
  const selectedLesson: TopicLesson =
    topic.lessons.find((lesson) => lesson.id === selectedLessonId) ??
    topic.lessons[completedLessonIds.length] ??
    topic.lessons.at(-1)!;
  const selectedLessonIndex = topic.lessons.findIndex(
    (lesson) => lesson.id === selectedLesson.id
  );
  const selectedLessonCompleted = completedLessonIds.includes(selectedLesson.id);
  const codeReady = code.trim().length >= 20;
  const canCompleteCurrentLesson =
    !selectedLessonCompleted &&
    selectedLessonIndex === completedLessonIds.length &&
    quizPassed &&
    codeReady;
  const lessonReference = useMemo(
    () => buildLessonReference(topicId, selectedLesson),
    [selectedLesson, topicId]
  );
  const [referenceImageSrc, setReferenceImageSrc] = useState(lessonReference.imageUrl);
  const lessonGuide = useMemo(
    () => buildLessonGuide(topicId, selectedLesson),
    [selectedLesson, topicId]
  );
  const lesson3DMeaning = useMemo(
    () => buildLesson3DMeaning(selectedLesson),
    [selectedLesson]
  );
  const outputPreviewDocument = useMemo(
    () => buildLessonPreviewDocument(topicId, code),
    [code, topicId]
  );

  useEffect(() => {
    if (lessonSelectionTick === 0) {
      return;
    }

    const workspace = workspaceRef.current;

    if (!workspace) {
      return;
    }

    workspace.scrollTo({
      behavior: "smooth",
      top: 0
    });
  }, [lessonSelectionTick]);

  useEffect(() => {
    setReferenceImageSrc(lessonReference.imageUrl);
  }, [lessonReference.imageUrl]);

  return (
    <aside className="topic-studio">
      <div className="topic-studio__header">
        <p className="eyebrow">{topic.title}</p>
        <div className="topic-studio__header-actions">
          <button className="auth-cancel" onClick={onExploreLab} type="button">
            Explore Lab
          </button>
          <button className="auth-cancel" onClick={onBackToHub} type="button">
            Back To Main World
          </button>
        </div>
      </div>

      <p className="topic-studio__subtitle">{topic.subtitle}</p>

      <div className="topic-studio__layout">
        <section className="topic-studio__sidebar">
          <div className="topic-progress">
            <div className="topic-progress__bar">
              <div className="topic-progress__value" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="topic-progress__text">Progress: {progressPercent}%</p>
          </div>

          <div className="topic-lessons">
            {topic.lessons.map((lesson, index) => {
              const completed = completedLessonIds.includes(lesson.id);
              const current = !completed && index === completedLessonIds.length;
              const locked = index > completedLessonIds.length;
              const selected = selectedLesson.id === lesson.id;

              return (
                <button
                  key={lesson.id}
                  className={`topic-lesson-chip ${current ? "is-current" : ""} ${selected ? "is-selected" : ""}`}
                  disabled={locked}
                  onClick={() => onSelectLesson(lesson.id)}
                  type="button"
                >
                  {lesson.mission} {completed ? "(Done)" : current ? "(Now)" : "(Locked)"}
                </button>
              );
            })}
          </div>

          <p className="topic-studio__selection-hint">
            Selected mission: <strong>{selectedLesson.mission}</strong>
          </p>
        </section>

        <section className="topic-studio__workspace" ref={workspaceRef}>
          <div className="topic-doc">
            <p className="topic-doc__kicker">Lesson Definition</p>
            <h3>{selectedLesson.mission}</h3>
            <p className="topic-doc__definition">{lessonGuide.definition}</p>
            <p>{selectedLesson.objective}</p>
            <p className="topic-editor__scene">3D Focus: {selectedLesson.sceneText}</p>

            <div className="topic-doc__grid">
              <article className="topic-doc__block">
                <h4>Syntax</h4>
                <pre>
                  <code>{lessonGuide.syntax}</code>
                </pre>
              </article>
              <article className="topic-doc__block">
                <h4>Example Explained</h4>
                <ul>
                  {lessonGuide.explainedSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>

          <div className="topic-reference">
            <h4>Reference Image Related To This Lesson</h4>
            <a
              className="topic-reference__image-link"
              href={lessonReference.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              <img
                alt={`${selectedLesson.mission} visual reference`}
                className="topic-reference__image"
                loading="lazy"
                onError={(event) => {
                  if (referenceImageSrc !== lessonReference.fallbackImageUrl) {
                    setReferenceImageSrc(lessonReference.fallbackImageUrl);
                    event.currentTarget.src = lessonReference.fallbackImageUrl;
                  }
                }}
                src={referenceImageSrc}
              />
            </a>
            <p className="topic-reference__caption">
              Source:{" "}
              <a href={lessonReference.sourceUrl} rel="noreferrer" target="_blank">
                {lessonReference.sourceLabel}
              </a>
            </p>
            <p className="topic-reference__relation">{lessonReference.relationText}</p>
          </div>

          <div className="topic-3d-preview">
            <h4>3D Representation For This Lesson</h4>
            <div className="topic-3d-preview__stage">
              <Canvas camera={{ fov: 38, position: [0, 1.5, 3.4] }} dpr={[1, 1.5]}>
                <color attach="background" args={["#05101f"]} />
                <ambientLight intensity={0.62} />
                <pointLight position={[2.4, 2.8, 2.2]} intensity={16} color={topic.accent} />
                <pointLight position={[-2.4, 2.2, 1.4]} intensity={8} color="#5fb8ff" />
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.04, 0]}>
                  <circleGeometry args={[2.7, 64]} />
                  <meshStandardMaterial color="#0a1d33" emissive="#123053" emissiveIntensity={0.35} />
                </mesh>
                <Float speed={1.15} rotationIntensity={0.24} floatIntensity={0.34}>
                  <group position={[0, -0.18, 0]}>
                    <LessonConceptModel accent={topic.accent} lesson={selectedLesson} />
                  </group>
                </Float>
                <Float speed={1.25} rotationIntensity={0.1} floatIntensity={0.2}>
                  <group position={[1.7, -0.45, -0.25]} scale={0.58}>
                    <LessonArtifact color={topic.accent} visual={selectedLesson.visual} />
                  </group>
                </Float>
              </Canvas>
            </div>
            <p className="topic-3d-preview__caption">
              Main scene visualizes <strong>{selectedLesson.mission}</strong>. Side marker shows
              artifact type: <strong>{selectedLesson.visual}</strong>.
            </p>
            <p className="topic-3d-preview__summary">{lesson3DMeaning.summary}</p>
            <div className="topic-3d-preview__meaning">
              <h5>{lesson3DMeaning.title}</h5>
              <ul>
                {lesson3DMeaning.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="topic-editor">
            <h4>Try It Yourself Editor</h4>
            <textarea
              className="topic-editor__textarea"
              onChange={(event) => onCodeChange(event.target.value)}
              spellCheck={false}
              value={code}
            />
          </div>

          <div className="topic-output">
            <h4>Live Output</h4>
            <iframe
              className="topic-output__frame"
              sandbox="allow-scripts"
              srcDoc={outputPreviewDocument}
              title={`${selectedLesson.id}-preview`}
            />
          </div>

          <div className="topic-quiz">
            <h4>Quiz Checkpoint</h4>
            <p>{selectedLesson.quizQuestion}</p>
            <div className="topic-quiz__options">
              {selectedLesson.quizOptions.map((option, index) => (
                <button
                  key={option}
                  className={`topic-quiz__option ${quizAnswer === index ? "is-selected" : ""}`}
                  onClick={() => onQuizAnswerSelect(index)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="topic-quiz__actions">
              <button
                className="auth-cancel"
                disabled={quizAnswer === null}
                onClick={onQuizSubmit}
                type="button"
              >
                Check Quiz
              </button>
              <p className={`topic-quiz__feedback ${quizChecked ? (quizPassed ? "is-pass" : "is-fail") : ""}`}>
                {quizChecked
                  ? quizPassed
                    ? "Correct answer. Quiz completed."
                    : "Not correct yet. Choose another answer and retry."
                  : "Select an answer and run the quiz check."}
              </p>
            </div>
          </div>

          <button
            className="session-button topic-studio__complete-button"
            disabled={!canCompleteCurrentLesson}
            onClick={onCompleteLesson}
            type="button"
          >
            {selectedLessonCompleted ? "Lesson Completed" : "Complete Current Lesson"}
          </button>
        </section>
      </div>
    </aside>
  );
}

function PhysicsWorld({
  isLocked,
  trackNodes,
  respawnTick
}: {
  isLocked: boolean;
  trackNodes: boolean;
  respawnTick: number;
}) {
  return (
    <Physics gravity={[0, -15, 0]}>
      <CuboidCollider args={[100, 0.5, 100]} position={[0, -0.6, 0]} />
      <CuboidCollider args={[40, 6, 0.5]} position={[0, 2, -36]} />
      <CuboidCollider args={[0.5, 6, 40]} position={[-38, 2, 0]} />
      <CuboidCollider args={[0.5, 6, 40]} position={[38, 2, 0]} />
      <CuboidCollider args={[10, 1.6, 0.6]} position={[0, 1.6, -26]} />
      <CuboidCollider args={[3.4, 0.45, 3.4]} position={[0, 0.12, 8]} />

      <PlayerController enabled={isLocked} respawnTick={respawnTick} />
      {trackNodes ? <ProximityTracker /> : null}
    </Physics>
  );
}

function PresenceBridge({
  enabled,
  localUserId,
  token
}: {
  enabled: boolean;
  localUserId: string | null;
  token: string | null;
}) {
  const setConnection = usePresence((state) => state.setConnection);
  const setRemotePlayers = usePresence((state) => state.setRemotePlayers);

  useEffect(() => {
    if (!enabled || !token) {
      setConnection(false);
      setRemotePlayers([]);
      return;
    }

    const client = new Client({
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: () => {},
      reconnectDelay: 3000,
      webSocketFactory: () => new SockJS(getWebSocketEndpoint())
    });

    const publishPresence = () => {
      if (!client.connected) {
        return;
      }

      const { playerPosition, playerSpeed, playerYaw } = useWorld.getState();

      client.publish({
        body: JSON.stringify({
          speed: playerSpeed,
          x: playerPosition[0],
          y: playerPosition[1],
          yaw: playerYaw,
          z: playerPosition[2]
        }),
        destination: "/app/presence.update"
      });
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;

    client.onConnect = () => {
      setConnection(true);
      client.subscribe("/topic/presence", (message: IMessage) => {
        try {
          const players = JSON.parse(message.body) as RemotePresence[];
          setRemotePlayers(
            players.filter((player) => player.userId !== localUserId)
          );
        } catch {
          setRemotePlayers([]);
        }
      });

      publishPresence();
      intervalId = setInterval(publishPresence, 120);
    };

    client.onStompError = () => {
      setConnection(false);
    };

    client.onWebSocketClose = () => {
      setConnection(false);
      setRemotePlayers([]);
    };

    client.activate();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }

      setConnection(false);
      setRemotePlayers([]);
      void client.deactivate();
    };
  }, [enabled, localUserId, setConnection, setRemotePlayers, token]);

  return null;
}

function RemotePlayers() {
  const remotePlayers = usePresence((state) => state.remotePlayers);

  return (
    <>
      {remotePlayers.map((player) => (
        <Suspense fallback={null} key={player.sessionId}>
          <Avatar
            floatingLabel={player.displayName || player.username || "Player"}
            mode="remote"
            position={[player.x, player.y, player.z]}
            rotationY={player.yaw}
            speed={player.speed}
          />
        </Suspense>
      ))}
    </>
  );
}

function Experience({
  completedLessonIds,
  hasEnteredLab,
  localDisplayName,
  onSelectLesson,
  onSelectTopic,
  respawnTick,
  selectedLessonId,
  selectedTopic,
  worldStage,
  uiMode
}: {
  completedLessonIds: string[];
  hasEnteredLab: boolean;
  localDisplayName: string;
  onSelectLesson: (lessonId: string) => void;
  onSelectTopic: (node: KnowledgeNode) => void;
  respawnTick: number;
  selectedLessonId: string | null;
  selectedTopic: TopicId | null;
  worldStage: "hub" | "topic";
  uiMode: "menu" | "playing";
}) {
  const isPlaying = uiMode === "playing";
  const showHubNodes = isPlaying && worldStage === "hub";

  return (
    <>
      <IntroCameraRig isMenuOpen={!hasEnteredLab} />
      {worldStage === "hub" || !isPlaying ? (
        <SceneArt
          animateWorld={isPlaying}
          onNodeSelect={showHubNodes ? onSelectTopic : undefined}
          showLabels={false}
          showNodes={showHubNodes}
        />
      ) : null}
      {isPlaying && worldStage === "topic" && selectedTopic ? (
        <TopicMissionWorld
          completedLessonIds={completedLessonIds}
          onSelectLesson={onSelectLesson}
          selectedLessonId={selectedLessonId}
          topicId={selectedTopic}
        />
      ) : null}
      <PhysicsWorld isLocked={isPlaying} respawnTick={respawnTick} trackNodes={showHubNodes} />
      {isPlaying ? (
        <Suspense fallback={null}>
          <Avatar
            floatingLabel={localDisplayName}
            mode="player"
            position={[spawnPoint.x, spawnPoint.y, spawnPoint.z]}
          />
        </Suspense>
      ) : null}
      {isPlaying ? <RemotePlayers /> : null}
      {isPlaying ? (
        <EffectComposer>
        <Bloom
          mipmapBlur
          luminanceThreshold={0.24}
          luminanceSmoothing={0.5}
          intensity={0.72}
        />
          <Vignette eskil={false} offset={0.1} darkness={0.92} />
        </EffectComposer>
      ) : null}
    </>
  );
}

export function LearningWorld() {
  const { getToken } = useAuth();
  const { isSignedIn, user: clerkUser } = useUser();
  const [hasEnteredLab, setHasEnteredLab] = useState(false);
  const [lessonSelectionTick, setLessonSelectionTick] = useState(0);
  const [isTopicStudioOpen, setIsTopicStudioOpen] = useState(true);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicId | null>(null);
  const [topicProgress, setTopicProgress] = useState<TopicProgressState>(emptyTopicProgress);
  const [quizAnswerByLesson, setQuizAnswerByLesson] = useState<LessonQuizAnswerState>({});
  const [quizCheckedByLesson, setQuizCheckedByLesson] = useState<LessonQuizCheckedState>({});
  const [quizPassedByLesson, setQuizPassedByLesson] = useState<LessonQuizResultState>({});
  const [worldStage, setWorldStage] = useState<"hub" | "topic">("hub");
  const [lessonCodeById, setLessonCodeById] = useState<Record<string, string>>({});
  const [respawnTick, setRespawnTick] = useState(0);
  const [xp, setXp] = useState(0);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);
  const [levelUpPulse, setLevelUpPulse] = useState(false);
  const [lessonStreak, setLessonStreak] = useState(0);
  const [achievementIds, setAchievementIds] = useState<AchievementId[]>([]);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [apiUserId, setApiUserId] = useState<string | null>(null);
  const activeNodeId = useWorld((state) => state.activeNodeId);
  const nodes = useWorld((state) => state.nodes);
  const setNodes = useWorld((state) => state.setNodes);
  const setNodeSyncStatus = useWorld((state) => state.setNodeSyncStatus);
  const setActiveNodeId = useWorld((state) => state.setActiveNodeId);
  const xpToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const milestoneToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousClerkUserIdRef = useRef<string | null>(null);
  const previousLevelRef = useRef(1);
  const didInitializeLevelRef = useRef(false);
  const activeNode = useMemo(
    () => nodes.find((node) => node.id === activeNodeId) ?? null,
    [activeNodeId, nodes]
  );
  const progressStorageKey = useMemo(
    () => getProgressStorageKey(clerkUser?.id ?? null, profile?.name ?? null),
    [clerkUser?.id, profile?.name]
  );
  const xpStorageKey = useMemo(
    () => getXpStorageKey(clerkUser?.id ?? null, profile?.name ?? null),
    [clerkUser?.id, profile?.name]
  );
  const achievementStorageKey = useMemo(
    () => getAchievementStorageKey(clerkUser?.id ?? null, profile?.name ?? null),
    [clerkUser?.id, profile?.name]
  );
  const streakStorageKey = useMemo(
    () => getStreakStorageKey(clerkUser?.id ?? null, profile?.name ?? null),
    [clerkUser?.id, profile?.name]
  );
  const currentTopic = selectedTopic ? topicCurriculum[selectedTopic] : null;
  const completedLessonIds = selectedTopic ? topicProgress[selectedTopic] : [];
  const level = Math.floor(xp / 100) + 1;
  const xpIntoLevel = xp % 100;
  const xpToNextLevel = 100 - xpIntoLevel;
  const unlockedAchievements = useMemo(
    () => achievementIds.map((id) => ({ ...achievementCatalog[id], id })),
    [achievementIds]
  );
  const selectedLesson = currentTopic
    ? currentTopic.lessons.find((lesson) => lesson.id === selectedLessonId) ??
      currentTopic.lessons[completedLessonIds.length] ??
      currentTopic.lessons.at(-1) ??
      null
    : null;
  const selectedLessonCode = selectedLesson
    ? lessonCodeById[selectedLesson.id] ?? selectedLesson.starterCode
    : "";
  const selectedQuizAnswer = selectedLesson
    ? (quizAnswerByLesson[selectedLesson.id] ?? null)
    : null;
  const selectedQuizChecked = selectedLesson
    ? (quizCheckedByLesson[selectedLesson.id] ?? false)
    : false;
  const selectedQuizPassed = selectedLesson
    ? (quizPassedByLesson[selectedLesson.id] ?? false)
    : false;
  const uiMode = !hasEnteredLab ? "menu" : "playing";

  useEffect(() => {
    const raw = localStorage.getItem(progressStorageKey);

    if (!raw) {
      setTopicProgress(emptyTopicProgress);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<TopicProgressState>;
      setTopicProgress({
        css: Array.isArray(parsed.css) ? parsed.css : [],
        html: Array.isArray(parsed.html) ? parsed.html : [],
        javascript: Array.isArray(parsed.javascript) ? parsed.javascript : []
      });
    } catch {
      setTopicProgress(emptyTopicProgress);
    }
  }, [progressStorageKey]);

  useEffect(() => {
    const raw = localStorage.getItem(xpStorageKey);

    if (!raw) {
      setXp(0);
      return;
    }

    const parsed = Number.parseInt(raw, 10);
    setXp(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
  }, [xpStorageKey]);

  useEffect(() => {
    const raw = localStorage.getItem(achievementStorageKey);

    if (!raw) {
      setAchievementIds([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as string[];
      setAchievementIds(
        parsed.filter((id): id is AchievementId => id in achievementCatalog)
      );
    } catch {
      setAchievementIds([]);
    }
  }, [achievementStorageKey]);

  useEffect(() => {
    const raw = localStorage.getItem(streakStorageKey);

    if (!raw) {
      setLessonStreak(0);
      return;
    }

    const parsed = Number.parseInt(raw, 10);
    setLessonStreak(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
  }, [streakStorageKey]);

  useEffect(() => {
    localStorage.setItem(progressStorageKey, JSON.stringify(topicProgress));
  }, [progressStorageKey, topicProgress]);

  useEffect(() => {
    localStorage.setItem(xpStorageKey, String(xp));
  }, [xp, xpStorageKey]);

  useEffect(() => {
    localStorage.setItem(achievementStorageKey, JSON.stringify(achievementIds));
  }, [achievementIds, achievementStorageKey]);

  useEffect(() => {
    localStorage.setItem(streakStorageKey, String(lessonStreak));
  }, [lessonStreak, streakStorageKey]);

  useEffect(() => {
    return () => {
      if (xpToastTimerRef.current) {
        clearTimeout(xpToastTimerRef.current);
      }
      if (milestoneToastTimerRef.current) {
        clearTimeout(milestoneToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!didInitializeLevelRef.current) {
      didInitializeLevelRef.current = true;
      previousLevelRef.current = level;
      return;
    }

    if (level > previousLevelRef.current) {
      setLevelUpPulse(true);
      showMilestoneToast(`Level Up! Level ${level}`);
    }

    previousLevelRef.current = level;
  }, [level]);

  useEffect(() => {
    if (!levelUpPulse) {
      return undefined;
    }

    const timer = setTimeout(() => setLevelUpPulse(false), 1400);
    return () => clearTimeout(timer);
  }, [levelUpPulse]);

  const showMilestoneToast = (message: string) => {
    setMilestoneToast(message);

    if (milestoneToastTimerRef.current) {
      clearTimeout(milestoneToastTimerRef.current);
    }

    milestoneToastTimerRef.current = setTimeout(() => {
      setMilestoneToast(null);
    }, 2600);
  };

  const unlockAchievements = (achievementList: AchievementId[]) => {
    const nextAchievements = achievementList.filter((achievementId) => !achievementIds.includes(achievementId));

    if (nextAchievements.length === 0) {
      return;
    }

    setAchievementIds((current) => [
      ...current,
      ...nextAchievements.filter((achievementId) => !current.includes(achievementId))
    ]);

    showMilestoneToast(
      `Badge unlocked: ${nextAchievements.map((achievementId) => achievementCatalog[achievementId].label).join(" • ")}`
    );
  };

  const awardXp = (amount: number, message: string) => {
    setXp((current) => current + amount);
    setXpToast(`+${amount} XP · ${message}`);

    if (xpToastTimerRef.current) {
      clearTimeout(xpToastTimerRef.current);
    }

    xpToastTimerRef.current = setTimeout(() => {
      setXpToast(null);
    }, 2200);
  };

  useEffect(() => {
    if (!selectedLesson) {
      return;
    }

    setLessonCodeById((current) => {
      if (current[selectedLesson.id]) {
        return current;
      }

      return {
        ...current,
        [selectedLesson.id]: selectedLesson.starterCode
      };
    });
  }, [selectedLesson]);

  useEffect(() => {
    if (!currentTopic || !selectedLesson) {
      return;
    }

    if (!completedLessonIds.includes(selectedLesson.id)) {
      return;
    }

    const nextLesson = currentTopic.lessons.find(
      (lesson) => !completedLessonIds.includes(lesson.id)
    );
    setSelectedLessonId(nextLesson?.id ?? selectedLesson.id);
  }, [completedLessonIds, currentTopic, selectedLesson]);

  useEffect(() => {
    setNodes(fallbackKnowledgeNodes);

    if (!isSignedIn || !clerkUser) {
      if (previousClerkUserIdRef.current) {
        setXpToast(null);
        setMilestoneToast(null);
        setLevelUpPulse(false);
        setLessonStreak(0);
        setAchievementIds([]);
        setSelectedTopic(null);
        setSelectedLessonId(null);
        setIsTopicStudioOpen(true);
        setQuizAnswerByLesson({});
        setQuizCheckedByLesson({});
        setQuizPassedByLesson({});
        setWorldStage("hub");
        setHasEnteredLab(false);
        setRespawnTick((value) => value + 1);
        setActiveNodeId(null);
      }

      previousClerkUserIdRef.current = null;
      setApiToken(null);
      setApiUserId(null);
      setProfile(null);
      setNodeSyncStatus("local", "Local learning nodes are active.");
      return;
    }

    const displayName =
      clerkUser.fullName ??
      clerkUser.username ??
      clerkUser.primaryEmailAddress?.emailAddress ??
      "Learner";

    const clerkProfile: LearnerProfile = {
      education: "school",
      email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
      gender: null,
      loginMethod: "email",
      name: displayName,
      role: getClerkProfileRole(clerkUser.publicMetadata.role)
    };

    previousClerkUserIdRef.current = clerkUser.id;
    setProfile(clerkProfile);
    setNodeSyncStatus("syncing", "Connecting Clerk session to the learning API...");

    let isCancelled = false;

    void (async () => {
      try {
        const token = await getToken();

        if (!token || isCancelled) {
          return;
        }

        const syncedUser = await syncCurrentUser(token, {
          displayName,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? null
        });

        if (isCancelled) {
          return;
        }

        const apiNodes = await fetchNodes(token);
        setApiToken(token);
        setApiUserId(syncedUser.id);
        setNodes(apiNodes.length > 0 ? apiNodes : fallbackKnowledgeNodes);
        setProfile({
          ...clerkProfile,
          name: syncedUser.displayName,
          role: syncedUser.role === "STAFF" ? "staff" : clerkProfile.role
        });
        setNodeSyncStatus("live", "Clerk session synced. Topic missions are ready.");
      } catch {
        if (isCancelled) {
          return;
        }

        setApiToken(null);
        setApiUserId(null);
        setNodes(fallbackKnowledgeNodes);
        setNodeSyncStatus("error", "Clerk sign-in works, but API sync failed. Using local nodes.");
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    clerkUser,
    getToken,
    isSignedIn,
    setActiveNodeId,
    setNodeSyncStatus,
    setNodes
  ]);

  useEffect(() => {
    if (!apiToken || !activeNode) {
      return;
    }

    if (isTopicId(activeNode.id)) {
      return;
    }

    void markNodeVisited(apiToken, activeNode.id).catch(() => {});
  }, [activeNode, apiToken]);

  const openTopicWorld = (node: KnowledgeNode) => {
    if (!isTopicId(node.id)) {
      return;
    }

    setSelectedTopic(node.id);
    setSelectedLessonId(null);
    setLessonSelectionTick(0);
    setIsTopicStudioOpen(true);
    setLessonStreak(0);
    setWorldStage("topic");
    setActiveNodeId(null);
    setNodeSyncStatus("local", `${node.title} mission world loaded.`);
  };

  const backToTopicHub = () => {
    setWorldStage("hub");
    setSelectedTopic(null);
    setSelectedLessonId(null);
    setLessonSelectionTick(0);
    setIsTopicStudioOpen(true);
    setActiveNodeId(null);
    setNodeSyncStatus("local", "Topic hub ready. Choose your next mission.");
  };

  const openTopicStudio = () => {
    setIsTopicStudioOpen(true);
    setLessonSelectionTick((value) => value + 1);
    setNodeSyncStatus("local", "Lesson workspace opened.");
  };

  const exploreTopicLab = () => {
    setIsTopicStudioOpen(false);
    setNodeSyncStatus("local", "Exploration mode active. Reopen lessons anytime.");
  };

  const selectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setIsTopicStudioOpen(true);
    setLessonSelectionTick((value) => value + 1);
  };

  const selectQuizAnswer = (index: number) => {
    if (!selectedLesson) {
      return;
    }

    setQuizAnswerByLesson((current) => ({
      ...current,
      [selectedLesson.id]: index
    }));
    setQuizCheckedByLesson((current) => ({
      ...current,
      [selectedLesson.id]: false
    }));
    setQuizPassedByLesson((current) => ({
      ...current,
      [selectedLesson.id]: false
    }));
  };

  const submitSelectedLessonQuiz = () => {
    if (!selectedLesson) {
      return;
    }

    const selectedAnswer = quizAnswerByLesson[selectedLesson.id];

    if (selectedAnswer === undefined || selectedAnswer === null) {
      return;
    }

    const passed = selectedAnswer === selectedLesson.quizAnswerIndex;
    const wasPreviouslyPassed = quizPassedByLesson[selectedLesson.id] ?? false;

    setQuizCheckedByLesson((current) => ({
      ...current,
      [selectedLesson.id]: true
    }));
    setQuizPassedByLesson((current) => ({
      ...current,
      [selectedLesson.id]: passed
    }));
    if (passed && !wasPreviouslyPassed) {
      awardXp(10, "Quiz cleared");
      unlockAchievements(["first-quiz"]);
    }
    setNodeSyncStatus(
      "local",
      passed ? "Quiz passed. You earned 10 XP. Complete the lesson mission." : "Quiz failed. Try another answer."
    );
  };

  const updateLessonCode = (value: string) => {
    if (!selectedLesson) {
      return;
    }

    setLessonCodeById((current) => ({
      ...current,
      [selectedLesson.id]: value
    }));
  };

  const completeSelectedLesson = () => {
    if (!selectedTopic || !selectedLesson || !currentTopic) {
      return;
    }

    const currentIndex = currentTopic.lessons.findIndex(
      (lesson) => lesson.id === selectedLesson.id
    );

    if (currentIndex !== completedLessonIds.length) {
      return;
    }

    const lessonCode = lessonCodeById[selectedLesson.id] ?? selectedLesson.starterCode;
    const quizPassed = quizPassedByLesson[selectedLesson.id] ?? false;

    if (lessonCode.trim().length < 20) {
      setNodeSyncStatus("local", "Add more code in the editor before completing this mission.");
      return;
    }

    if (!quizPassed) {
      setNodeSyncStatus("local", "Pass the quiz checkpoint before completing this mission.");
      return;
    }

    const nextStreak = lessonStreak + 1;
    const streakBonus = nextStreak > 1 ? Math.min(30, (nextStreak - 1) * 5) : 0;

    setTopicProgress((current) => {
      const existing = current[selectedTopic];

      if (existing.includes(selectedLesson.id)) {
        return current;
      }

      return {
        ...current,
        [selectedTopic]: [...existing, selectedLesson.id]
      };
    });

    setLessonStreak(nextStreak);
    awardXp(25 + streakBonus, streakBonus > 0 ? `Lesson streak x${nextStreak}` : "Lesson completed");
    const unlockedThisLesson: AchievementId[] = [];

    if (nextStreak === 3) {
      unlockedThisLesson.push("streak-3");
    }

    if (nextStreak === 5) {
      unlockedThisLesson.push("streak-5");
    }

    if (completedLessonIds.length === 0) {
      unlockedThisLesson.push("first-lesson");
    }

    if (currentTopic.lessons.length === completedLessonIds.length + 1) {
      if (selectedTopic === "css") {
        unlockedThisLesson.push("css-master");
      }

      if (selectedTopic === "html") {
        unlockedThisLesson.push("html-master");
      }

      if (selectedTopic === "javascript") {
        unlockedThisLesson.push("javascript-master");
      }
    }

    unlockAchievements(unlockedThisLesson);

    const nextPercent = Math.round(
      ((completedLessonIds.length + 1) / currentTopic.lessons.length) * 100
    );
    setNodeSyncStatus(
      "local",
      `${selectedLesson.mission} completed. +${25 + streakBonus} XP awarded. Streak x${nextStreak}. Progress: ${nextPercent}%.`
    );
  };

  const enterLab = () => {
    setWorldStage("hub");
    setSelectedTopic(null);
    setSelectedLessonId(null);
    setIsTopicStudioOpen(true);
    setHasEnteredLab(true);
    setRespawnTick((value) => value + 1);
  };

  return (
    <div className={`app-shell is-${uiMode}`}>
      <KeyboardBridge />
      <Canvas
        camera={{ position: [0, 1.8, 12], fov: 74 }}
        shadows
        dpr={[1, 1.75]}
      >
        <Experience
          completedLessonIds={completedLessonIds}
          hasEnteredLab={hasEnteredLab}
          localDisplayName={profile?.name ?? "You"}
          onSelectLesson={selectLesson}
          onSelectTopic={openTopicWorld}
          respawnTick={respawnTick}
          selectedLessonId={selectedLessonId}
          selectedTopic={selectedTopic}
          worldStage={worldStage}
          uiMode={uiMode}
        />
      </Canvas>
      <PresenceBridge
        enabled={uiMode === "playing" && Boolean(apiToken)}
        localUserId={apiUserId}
        token={apiToken}
      />
      {uiMode === "playing" && worldStage === "topic" && selectedTopic && isTopicStudioOpen ? (
        <TopicStudio
          code={selectedLessonCode}
          completedLessonIds={completedLessonIds}
          lessonSelectionTick={lessonSelectionTick}
          onExploreLab={exploreTopicLab}
          onBackToHub={backToTopicHub}
          onCodeChange={updateLessonCode}
          onCompleteLesson={completeSelectedLesson}
          onQuizAnswerSelect={selectQuizAnswer}
          onQuizSubmit={submitSelectedLessonQuiz}
          onSelectLesson={selectLesson}
          quizAnswer={selectedQuizAnswer}
          quizChecked={selectedQuizChecked}
          quizPassed={selectedQuizPassed}
          selectedLessonId={selectedLessonId}
          topicId={selectedTopic}
        />
      ) : null}
      {uiMode === "playing" && worldStage === "topic" && selectedTopic && !isTopicStudioOpen ? (
        <div className="topic-world-controls">
          <button className="auth-cancel" onClick={openTopicStudio} type="button">
            Open Lesson Workspace
          </button>
          <button className="auth-cancel" onClick={backToTopicHub} type="button">
            Back To Main World
          </button>
        </div>
      ) : null}
      <Hud
        activeNode={worldStage === "hub" ? activeNode : null}
        achievements={unlockedAchievements.map((achievement) => achievement.label)}
        levelUpPulse={levelUpPulse}
        onEnterLab={enterLab}
        profile={profile}
        lessonStreak={lessonStreak}
        milestoneToast={milestoneToast}
        level={level}
        xp={xp}
        xpToast={xpToast}
        xpToNextLevel={xpToNextLevel}
        uiMode={uiMode}
      />
    </div>
  );
}
