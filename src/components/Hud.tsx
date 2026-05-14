import { SignInButton, useUser, UserButton } from "@clerk/react";
import type { KnowledgeNode } from "../game/world";

export type LearnerRole = "student" | "staff";
export type LoginMethod = "email";
export type EducationType = "school" | "college";
export type Gender = "female" | "male" | "non-binary" | "prefer-not-to-say";

export type LearnerProfile = {
  education: EducationType;
  email: string | null;
  gender: Gender | null;
  loginMethod: LoginMethod;
  name: string;
  role: LearnerRole;
};

type HudProps = {
  activeNode: KnowledgeNode | null;
  onEnterLab: () => void;
  achievements: string[];
  levelUpPulse: boolean;
  profile: LearnerProfile | null;
  lessonStreak: number;
  milestoneToast: string | null;
  xp: number;
  xpToast: string | null;
  xpToNextLevel: number;
  level: number;
  uiMode: "menu" | "playing";
};

export function Hud({
  activeNode,
  onEnterLab,
  achievements,
  levelUpPulse,
  profile,
  lessonStreak,
  milestoneToast,
  xp,
  xpToast,
  xpToNextLevel,
  level,
  uiMode
}: HudProps) {
  const { isSignedIn } = useUser();

  return (
    <>
      <div className="auth-corner">
        {isSignedIn ? (
          <>
          {profile ? (
            <p className="auth-corner__meta">
              {profile.name} ({profile.role === "staff" ? "Teacher/Staff" : "Student"})
            </p>
          ) : null}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "clerk-avatar"
              }
            }}
          />
          </>
        ) : (
          <SignInButton mode="modal">
            <button className="auth-corner__button" type="button">
              Sign In
            </button>
          </SignInButton>
        )}
      </div>

      {uiMode === "playing" ? (
        <>
          <div className="hud-strip">
            <div className="hud-brand">
              <p className="eyebrow">3D CS Learning World</p>
              <p className="hud-title">Cyberpunk Research Lab</p>
            </div>
            <div className="hud-pills">
              <div className={`hud-pill hud-pill--xp ${levelUpPulse ? "is-level-up" : ""}`}>
                <span>Level {level}</span>
                <strong>{xp} XP</strong>
                <div className="hud-pill__meter" aria-hidden="true">
                  <span style={{ width: `${100 - xpToNextLevel}%` }} />
                </div>
              </div>
              <div className="hud-pill">
                {profile ? `Role: ${profile.role === "staff" ? "Teacher/Staff" : "Student"}` : "Guest"}
              </div>
              <div className="hud-pill hud-pill--streak">Streak x{lessonStreak}</div>
            </div>
          </div>
          {achievements.length > 0 ? (
            <div className="achievement-row" aria-label="Unlocked achievements">
              {achievements.map((achievement) => (
                <span className="achievement-chip" key={achievement} title={achievement}>
                  {achievement}
                </span>
              ))}
            </div>
          ) : null}
          {milestoneToast ? <div className="milestone-toast">{milestoneToast}</div> : null}
          {xpToast ? <div className="xp-toast">{xpToast}</div> : null}
          <div className="controls-hint">
            <span>W A S D Move</span>
            <span>Shift Sprint</span>
            <span>Explore Nodes</span>
          </div>
        </>
      ) : null}

      <aside className={`node-panel ${uiMode === "playing" && activeNode ? "is-visible" : ""}`}>
        <div className="node-panel__glow" />
        {uiMode === "playing" && activeNode ? (
          <>
            <p className="eyebrow">{activeNode.category}</p>
            <h3>{activeNode.title}</h3>
            <p className="node-panel__summary">{activeNode.summary}</p>
            <p className="node-panel__prompt">{activeNode.prompt}</p>
            <div className="node-panel__divider" />
            <ul className="node-panel__list">
              {activeNode.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="eyebrow">Lesson Panel</p>
            <h3>{profile ? "Profile ready. Enter when ready." : "Sign in or continue as guest"}</h3>
            <p className="node-panel__summary">
              Walk up to one of the floating neon nodes to see its learning content.
            </p>
          </>
        )}
      </aside>

      {uiMode === "menu" ? (
        <div className="lock-screen">
          <div className="lock-card">
            <p className="eyebrow">Enter Lab</p>
            <h2>{profile ? "Welcome back to the lab" : "Sign in or explore as a guest"}</h2>
            <ul>
              <li>Clerk handles signup, login, and account settings.</li>
              <li>Signed-in progress is saved locally under your Clerk user ID.</li>
              <li>You can still enter as a guest without signing in.</li>
            </ul>
            <div className="lock-actions">
              {!isSignedIn ? (
                <SignInButton mode="modal">
                  <button className="session-button" type="button">
                    Sign In
                  </button>
                </SignInButton>
              ) : null}
              <button
                className={`session-button ${profile ? "" : "secondary"}`}
                onClick={onEnterLab}
                type="button"
              >
                {profile ? "Enter Lab" : "Enter Lab as Guest"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
