import "./polyfills";
import { ClerkProvider } from "@clerk/react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function MissingClerkConfig() {
  return (
    <main className="config-screen">
      <section className="config-card">
        <p className="eyebrow">Clerk Setup</p>
        <h1>Missing Clerk publishable key</h1>
        <p>
          Create a local `.env` file and set `VITE_CLERK_PUBLISHABLE_KEY` to the
          publishable key from your Clerk dashboard.
        </p>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {clerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <App />
      </ClerkProvider>
    ) : (
      <MissingClerkConfig />
    )}
  </React.StrictMode>
);
