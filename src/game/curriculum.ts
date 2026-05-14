export type TopicId = "html" | "css" | "javascript";

export type LessonVisual =
  | "beacon"
  | "bridge"
  | "console"
  | "cube"
  | "gateway"
  | "portal"
  | "tower";

export type TopicLesson = {
  id: string;
  mission: string;
  objective: string;
  quizAnswerIndex: number;
  quizOptions: string[];
  quizQuestion: string;
  sceneText: string;
  starterCode: string;
  visual: LessonVisual;
};

export type TopicCurriculum = {
  accent: string;
  id: TopicId;
  lessons: TopicLesson[];
  subtitle: string;
  title: string;
};

function lesson(def: TopicLesson): TopicLesson {
  return def;
}

export const topicCurriculum: Record<TopicId, TopicCurriculum> = {
  html: {
    accent: "#61d9ff",
    id: "html",
    subtitle: "Structure real pages from semantic layout to forms and tables.",
    title: "HTML Learning Lab",
    lessons: [
      lesson({
        id: "html-1",
        mission: "Document Skeleton",
        objective: "Create html/head/body with a title, heading, and paragraph.",
        quizAnswerIndex: 1,
        quizOptions: ["<header>", "<!doctype html>", "<main>", "<meta>"],
        quizQuestion: "Which declaration should be the first line in a modern HTML document?",
        sceneText: "Foundation Gateway",
        starterCode:
          "<!doctype html>\n<html>\n  <head>\n    <title>Mission 1</title>\n  </head>\n  <body>\n    <h1>HTML Lab</h1>\n    <p>Start here.</p>\n  </body>\n</html>",
        visual: "gateway"
      }),
      lesson({
        id: "html-2",
        mission: "Semantic Regions",
        objective: "Use header, nav, main, section, aside, and footer in one page.",
        quizAnswerIndex: 2,
        quizOptions: ["<div>", "<span>", "<main>", "<style>"],
        quizQuestion: "Which element represents the central unique content of a document?",
        sceneText: "Layout Core",
        starterCode:
          "<header>Brand</header>\n<nav>Links</nav>\n<main>\n  <section>Primary content</section>\n  <aside>Side notes</aside>\n</main>\n<footer>Copyright</footer>",
        visual: "tower"
      }),
      lesson({
        id: "html-3",
        mission: "Lists And Links",
        objective: "Build ul/ol lists and anchor links with meaningful text.",
        quizAnswerIndex: 0,
        quizOptions: ["<a>", "<link>", "<href>", "<url>"],
        quizQuestion: "Which element creates a clickable hyperlink in page content?",
        sceneText: "Navigation Corridor",
        starterCode:
          "<h2>Roadmap</h2>\n<ul>\n  <li><a href=\"/intro\">Introduction</a></li>\n  <li><a href=\"/practice\">Practice</a></li>\n</ul>",
        visual: "bridge"
      }),
      lesson({
        id: "html-4",
        mission: "Media Blocks",
        objective: "Embed image and video with accessible text alternatives.",
        quizAnswerIndex: 3,
        quizOptions: ["title", "caption", "desc", "alt"],
        quizQuestion: "Which image attribute is essential for accessibility descriptions?",
        sceneText: "Media Dock",
        starterCode:
          "<figure>\n  <img src=\"cover.jpg\" alt=\"Course cover art\" />\n  <figcaption>Course cover</figcaption>\n</figure>",
        visual: "console"
      }),
      lesson({
        id: "html-5",
        mission: "Tables",
        objective: "Create a table with thead, tbody, th, and td.",
        quizAnswerIndex: 1,
        quizOptions: ["<td>", "<th>", "<tr>", "<col>"],
        quizQuestion: "Which element represents a header cell in a table?",
        sceneText: "Data Grid",
        starterCode:
          "<table>\n  <thead>\n    <tr><th>Topic</th><th>Status</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>HTML</td><td>Learning</td></tr>\n  </tbody>\n</table>",
        visual: "cube"
      }),
      lesson({
        id: "html-6",
        mission: "Forms Basics",
        objective: "Build a form using label/input/select and submit button.",
        quizAnswerIndex: 2,
        quizOptions: ["placeholder", "for", "name", "value"],
        quizQuestion: "Which attribute links a label to an input id?",
        sceneText: "Input Arena",
        starterCode:
          "<form>\n  <label for=\"student\">Student Name</label>\n  <input id=\"student\" name=\"student\" />\n  <button type=\"submit\">Send</button>\n</form>",
        visual: "portal"
      }),
      lesson({
        id: "html-7",
        mission: "Validation",
        objective: "Add required, minlength, and type constraints to fields.",
        quizAnswerIndex: 0,
        quizOptions: ["required", "valid", "must", "strict"],
        quizQuestion: "Which attribute makes a form field mandatory before submit?",
        sceneText: "Quality Checkpoint",
        starterCode:
          "<input type=\"email\" required />\n<input type=\"password\" minlength=\"8\" required />",
        visual: "beacon"
      }),
      lesson({
        id: "html-8",
        mission: "Accessible Landmarks",
        objective: "Add semantic landmarks and aria-label where needed.",
        quizAnswerIndex: 3,
        quizOptions: ["id", "class", "name", "aria-label"],
        quizQuestion: "Which attribute gives assistive technologies a readable label?",
        sceneText: "Accessibility Gate",
        starterCode:
          "<nav aria-label=\"Primary navigation\">\n  <a href=\"/\">Home</a>\n</nav>\n<main>\n  <h1>Accessible Page</h1>\n</main>",
        visual: "tower"
      })
    ]
  },
  css: {
    accent: "#8e7dff",
    id: "css",
    subtitle: "From box model and layout to animation and responsive design.",
    title: "CSS Learning Lab",
    lessons: [
      lesson({
        id: "css-1",
        mission: "Selectors",
        objective: "Target classes and IDs correctly for scoped styles.",
        quizAnswerIndex: 2,
        quizOptions: ["#", ".", "both # and .", "none"],
        quizQuestion: "Which symbols are used for ID and class selectors?",
        sceneText: "Selector Bay",
        starterCode:
          "#hero {\n  color: #fff;\n}\n\n.card {\n  border-radius: 12px;\n}",
        visual: "gateway"
      }),
      lesson({
        id: "css-2",
        mission: "Box Model",
        objective: "Use margin, border, padding, and width to style a card.",
        quizAnswerIndex: 1,
        quizOptions: ["padding", "margin", "display", "gap"],
        quizQuestion: "Which property creates space outside an element's border?",
        sceneText: "Spacing Dock",
        starterCode:
          ".card {\n  width: 280px;\n  padding: 16px;\n  border: 1px solid #6f88ff;\n  margin: 20px auto;\n}",
        visual: "cube"
      }),
      lesson({
        id: "css-3",
        mission: "Typography",
        objective: "Style text using font-size, line-height, and letter-spacing.",
        quizAnswerIndex: 0,
        quizOptions: ["line-height", "font-gap", "text-space", "line-space"],
        quizQuestion: "Which property controls vertical distance between text lines?",
        sceneText: "Type Console",
        starterCode:
          "h1 {\n  font-size: 2rem;\n  letter-spacing: 0.02em;\n}\n\np {\n  line-height: 1.6;\n}",
        visual: "console"
      }),
      lesson({
        id: "css-4",
        mission: "Flex Layout",
        objective: "Create horizontal alignment and spacing with flexbox.",
        quizAnswerIndex: 3,
        quizOptions: ["justify", "space", "align", "display: flex"],
        quizQuestion: "Which declaration turns an element into a flex container?",
        sceneText: "Flex Bridge",
        starterCode:
          ".row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n}",
        visual: "bridge"
      }),
      lesson({
        id: "css-5",
        mission: "Grid Layout",
        objective: "Build a card grid using grid-template-columns and gap.",
        quizAnswerIndex: 2,
        quizOptions: ["grid-flow", "grid-space", "grid-template-columns", "column-count"],
        quizQuestion: "Which property defines the column pattern in CSS Grid?",
        sceneText: "Grid Matrix",
        starterCode:
          ".grid {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 14px;\n}",
        visual: "portal"
      }),
      lesson({
        id: "css-6",
        mission: "Responsive Media",
        objective: "Add media query breakpoints for small screens.",
        quizAnswerIndex: 1,
        quizOptions: ["@breakpoint", "@media", "@screen", "@mobile"],
        quizQuestion: "Which at-rule is used to apply CSS conditionally by viewport size?",
        sceneText: "Breakpoint Station",
        starterCode:
          "@media (max-width: 720px) {\n  .grid {\n    grid-template-columns: 1fr;\n  }\n}",
        visual: "beacon"
      }),
      lesson({
        id: "css-7",
        mission: "Transitions",
        objective: "Animate hover states with transition timing.",
        quizAnswerIndex: 0,
        quizOptions: ["transition", "animate", "transform-time", "easing"],
        quizQuestion: "Which property enables smooth property-change animation on hover?",
        sceneText: "Motion Lane",
        starterCode:
          ".button {\n  transition: transform 220ms ease, box-shadow 220ms ease;\n}\n\n.button:hover {\n  transform: translateY(-2px);\n}",
        visual: "tower"
      }),
      lesson({
        id: "css-8",
        mission: "Theme Tokens",
        objective: "Create CSS variables and apply them in components.",
        quizAnswerIndex: 3,
        quizOptions: ["var() only", "theme()", "const()", "--token and var(--token)"],
        quizQuestion: "How do you define and consume a CSS custom property correctly?",
        sceneText: "Theme Core",
        starterCode:
          ":root {\n  --brand: #5fd5ff;\n}\n\n.card {\n  border-color: var(--brand);\n}",
        visual: "console"
      })
    ]
  },
  javascript: {
    accent: "#3cffb3",
    id: "javascript",
    subtitle: "Core language, DOM programming, and interactive problem solving.",
    title: "JavaScript Learning Lab",
    lessons: [
      lesson({
        id: "js-1",
        mission: "Variables",
        objective: "Use const and let to store course-related values.",
        quizAnswerIndex: 0,
        quizOptions: ["const", "static", "final", "var only"],
        quizQuestion: "Which keyword should be used for a value that must not be reassigned?",
        sceneText: "State Station",
        starterCode:
          "const topic = 'JavaScript';\nlet level = 1;\nconsole.log(topic, level);",
        visual: "gateway"
      }),
      lesson({
        id: "js-2",
        mission: "Conditions",
        objective: "Use if/else to branch based on score.",
        quizAnswerIndex: 1,
        quizOptions: ["for", "if", "switchonly", "map"],
        quizQuestion: "Which statement is primarily used for yes/no branching logic?",
        sceneText: "Decision Gate",
        starterCode:
          "const score = 78;\nif (score >= 70) {\n  console.log('Pass');\n} else {\n  console.log('Retry');\n}",
        visual: "beacon"
      }),
      lesson({
        id: "js-3",
        mission: "Loops",
        objective: "Iterate through lesson names and print each mission.",
        quizAnswerIndex: 2,
        quizOptions: ["if", "const", "for", "return"],
        quizQuestion: "Which keyword starts a classic counting loop?",
        sceneText: "Iteration Track",
        starterCode:
          "const missions = ['DOM', 'Events', 'Async'];\nfor (let i = 0; i < missions.length; i++) {\n  console.log(missions[i]);\n}",
        visual: "bridge"
      }),
      lesson({
        id: "js-4",
        mission: "Functions",
        objective: "Write a reusable function for mission completion text.",
        quizAnswerIndex: 3,
        quizOptions: ["method", "lambda", "process", "function"],
        quizQuestion: "Which keyword declares a named function in JavaScript?",
        sceneText: "Function Hub",
        starterCode:
          "function missionDone(name) {\n  return `Completed: ${name}`;\n}\n\nconsole.log(missionDone('Events'));",
        visual: "tower"
      }),
      lesson({
        id: "js-5",
        mission: "Arrays And Map",
        objective: "Transform an array of topics with map().",
        quizAnswerIndex: 0,
        quizOptions: ["map", "shape", "filter", "bind"],
        quizQuestion: "Which array method returns a transformed array with same length?",
        sceneText: "Collection Dock",
        starterCode:
          "const topics = ['html', 'css', 'js'];\nconst labels = topics.map((item) => item.toUpperCase());\nconsole.log(labels);",
        visual: "cube"
      }),
      lesson({
        id: "js-6",
        mission: "Objects",
        objective: "Store and access structured lesson metadata in an object.",
        quizAnswerIndex: 2,
        quizOptions: ["[] arrays only", "<> tags", "{} object literals", "()"],
        quizQuestion: "Which syntax defines an object literal in JavaScript?",
        sceneText: "Object Vault",
        starterCode:
          "const lesson = {\n  id: 'js-6',\n  title: 'Objects',\n  done: false\n};\nconsole.log(lesson.title);",
        visual: "console"
      }),
      lesson({
        id: "js-7",
        mission: "DOM Query",
        objective: "Select elements and update text content.",
        quizAnswerIndex: 1,
        quizOptions: ["document.find", "document.querySelector", "window.pick", "node.get"],
        quizQuestion: "Which API selects the first matching element by CSS selector?",
        sceneText: "DOM Terminal",
        starterCode:
          "const title = document.querySelector('#title');\nif (title) {\n  title.textContent = 'Mission Active';\n}",
        visual: "portal"
      }),
      lesson({
        id: "js-8",
        mission: "Events",
        objective: "Attach click handler to trigger mission state update.",
        quizAnswerIndex: 3,
        quizOptions: ["onClick()", "listen()", "subscribe()", "addEventListener()"],
        quizQuestion: "Which function is used to register browser event handlers?",
        sceneText: "Interaction Core",
        starterCode:
          "const button = document.querySelector('#run');\nbutton?.addEventListener('click', () => {\n  console.log('Mission complete');\n});",
        visual: "tower"
      })
    ]
  }
};

export function isTopicId(value: string): value is TopicId {
  return value === "html" || value === "css" || value === "javascript";
}
