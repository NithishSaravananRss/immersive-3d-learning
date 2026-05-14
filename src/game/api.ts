import type { KnowledgeNode } from "./world";

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export function getWebSocketEndpoint() {
  const normalizedBaseUrl = apiBaseUrl.replace(/\/$/, "");

  return `${normalizedBaseUrl}/ws`;
}

type AuthResponse = {
  displayName: string;
  role: string;
  token: string;
  userId: string;
  username: string;
};

type RegisterResponse = AuthResponse;

type GoogleAuthResponse = AuthResponse;

type UserProfileResponse = {
  displayName: string;
  email: string;
  id: string;
  role: string;
  username: string;
};

type LearningNodeApiResponse = {
  category: string;
  color: string;
  details: string[];
  id: string;
  position: { x: number; y: number; z: number };
  prompt: string;
  published: boolean;
  relatedNodeIds: string[];
  slug: string;
  summary: string;
  title: string;
};

export type SessionUser = {
  displayName: string;
  id: string;
  role: string;
  username: string;
};

export type ProfileRole = "student" | "staff";
export type ProfileEducation = "school" | "college";
export type ProfileGender = "female" | "male" | "non-binary" | "prefer-not-to-say";

type GoogleAuthRequest = {
  education: ProfileEducation;
  gender: ProfileGender | null;
  idToken: string;
  name: string;
  role: ProfileRole;
};

function toApiRole(role: ProfileRole) {
  return role === "staff" ? "STAFF" : "STUDENT";
}

function toApiEducation(education: ProfileEducation) {
  return education === "college" ? "COLLEGE" : "SCHOOL";
}

function toApiGender(gender: ProfileGender | null) {
  if (!gender) {
    return null;
  }

  switch (gender) {
    case "female":
      return "FEMALE";
    case "male":
      return "MALE";
    case "non-binary":
      return "NON_BINARY";
    case "prefer-not-to-say":
      return "PREFER_NOT_TO_SAY";
    default:
      return null;
  }
}

function toKnowledgeNode(node: LearningNodeApiResponse): KnowledgeNode {
  return {
    category: node.category
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    color: node.color,
    details: node.details,
    id: node.id,
    position: [node.position.x, node.position.y, node.position.z],
    prompt: node.prompt,
    relatedNodeIds: node.relatedNodeIds,
    slug: node.slug,
    summary: node.summary,
    title: node.title
  };
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  token?: string
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function login(
  username: string,
  password: string
): Promise<{ token: string; user: SessionUser }> {
  const response = await apiFetch<AuthResponse>("/auth/login", {
    body: JSON.stringify({ password, username }),
    method: "POST"
  });

  return {
    token: response.token,
    user: {
      displayName: response.displayName,
      id: response.userId,
      role: response.role,
      username: response.username
    }
  };
}

export async function register(
  username: string,
  email: string,
  password: string,
  displayName: string
): Promise<{ token: string; user: SessionUser }> {
  const response = await apiFetch<RegisterResponse>("/auth/register", {
    body: JSON.stringify({ displayName, email, password, username }),
    method: "POST"
  });

  return {
    token: response.token,
    user: {
      displayName: response.displayName,
      id: response.userId,
      role: response.role,
      username: response.username
    }
  };
}

export async function loginWithGoogle(
  request: GoogleAuthRequest
): Promise<{ token: string; user: SessionUser }> {
  const response = await apiFetch<GoogleAuthResponse>("/auth/google", {
    body: JSON.stringify({
      educationType: toApiEducation(request.education),
      gender: toApiGender(request.gender),
      idToken: request.idToken,
      name: request.name,
      role: toApiRole(request.role)
    }),
    method: "POST"
  });

  return {
    token: response.token,
    user: {
      displayName: response.displayName,
      id: response.userId,
      role: response.role,
      username: response.username
    }
  };
}

export async function fetchMe(token: string): Promise<SessionUser> {
  const response = await apiFetch<UserProfileResponse>("/users/me", undefined, token);

  return {
    displayName: response.displayName,
    id: response.id,
    role: response.role,
    username: response.username
  };
}

export async function syncCurrentUser(
  token: string,
  profile: { displayName: string; email: string | null }
): Promise<SessionUser> {
  const response = await apiFetch<UserProfileResponse>(
    "/users/me",
    {
      body: JSON.stringify(profile),
      method: "PUT"
    },
    token
  );

  return {
    displayName: response.displayName,
    id: response.id,
    role: response.role,
    username: response.username
  };
}

export async function fetchNodes(token: string): Promise<KnowledgeNode[]> {
  const response = await apiFetch<LearningNodeApiResponse[]>("/nodes", undefined, token);

  return response.map(toKnowledgeNode);
}

export async function markNodeVisited(token: string, nodeId: string) {
  await apiFetch(
    `/progress/me/${nodeId}`,
    {
      body: JSON.stringify({ completed: false, masteryScore: 20 }),
      method: "PUT"
    },
    token
  );
}
