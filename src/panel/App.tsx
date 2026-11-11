import { useEffect, useMemo, useState } from "react";
import { AskAiChat } from "./components/AskAiChat";
import { TwentyClient } from "./api/TwentyClient";
import {
  GENERAL_CONVERSATION_KEY,
  setConversationOpen,
  useConversation,
} from "./api/askAiStore";
import { clearSession, readSession, type TwentySession } from "./auth/session";
import { ConnectScreen } from "./components/ConnectScreen";
import { ContactSearch } from "./components/ContactSearch";
import { LinkedinView } from "./components/LinkedinView";
import { MainView } from "./components/MainView";
import { WebsiteView } from "./components/WebsiteView";
import { usePageSnapshot } from "./hooks/usePageSnapshot";

type SessionState =
  | { status: "loading" }
  | { status: "signed-out"; message: string | null }
  | { status: "signed-in"; session: TwentySession };

export const App = () => {
  const [sessionState, setSessionState] = useState<SessionState>({
    status: "loading",
  });
  const page = usePageSnapshot();
  const [searchQuery, setSearchQuery] = useState("");
  const isSearching = searchQuery.trim().length >= 2;
  const { open: askAiOpen } = useConversation(GENERAL_CONVERSATION_KEY);

  useEffect(() => {
    void readSession().then((session) =>
      setSessionState(
        session
          ? { status: "signed-in", session }
          : { status: "signed-out", message: null },
      ),
    );
  }, []);

  const session =
    sessionState.status === "signed-in" ? sessionState.session : null;

  const client = useMemo(
    () =>
      session &&
      new TwentyClient(session, () =>
        setSessionState({
          status: "signed-out",
          message: "Ta session a expiré. Reconnecte-toi.",
        }),
      ),
    [session],
  );

  const signOut = async () => {
    await clearSession();
    setSessionState({ status: "signed-out", message: null });
  };

  if (sessionState.status === "loading") {
    return null;
  }

  if (!client) {
    return (
      <ConnectScreen
        message={
          sessionState.status === "signed-out" ? sessionState.message : null
        }
        onConnected={(newSession) =>
          setSessionState({ status: "signed-in", session: newSession })
        }
      />
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <a
          className="workspace-name"
          href={client.workspaceUrl}
          target="_blank"
          rel="noreferrer"
        >
          <img
            className="connect-logo connect-logo-small"
            src="/icons/twenty.svg"
            alt=""
          />
          {client.workspaceName}
        </a>
        <span className="header-actions">
          <button
            type="button"
            className="button-secondary ask-ai-button"
            onClick={() =>
              setConversationOpen(GENERAL_CONVERSATION_KEY, !askAiOpen)
            }
          >
            <img src="/icons/sparkles.svg" alt="" />
            Ask AI
          </button>
          <button
            type="button"
            className="button-ghost"
            onClick={() => void signOut()}
          >
            Déconnexion
          </button>
        </span>
      </header>

      <div className="contact-search">
        <input
          type="search"
          placeholder="Chercher un contact ou une société…"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSearchQuery("");
            }
          }}
        />
      </div>

      {askAiOpen && (
        <div className="padded">
          <AskAiChat client={client} context={null} contextLabel={null} />
        </div>
      )}

      {isSearching && <ContactSearch client={client} query={searchQuery} />}

      {!isSearching && page.status === "loading" && (
        <p className="muted padded">Chargement…</p>
      )}
      {!isSearching && page.status === "unsupported" && (
        <div className="empty-state">
          <p>
            Ouvre un email dans Gmail, un événement dans Google Agenda, un
            profil LinkedIn ou le site d'une entreprise.
          </p>
        </div>
      )}
      {!isSearching &&
        page.status === "ready" &&
        (page.snapshot.source === "gmail" ||
          page.snapshot.source === "calendar") && (
          <MainView
            client={client}
            snapshot={page.snapshot}
            source={page.snapshot.source}
          />
        )}
      {!isSearching &&
        page.status === "ready" &&
        page.snapshot.source === "website" && (
          <WebsiteView
            key={page.snapshot.domain}
            client={client}
            website={page.snapshot}
          />
        )}
      {!isSearching &&
        page.status === "ready" &&
        page.snapshot.source === "linkedin" &&
        (page.snapshot.page ? (
          <LinkedinView
            key={JSON.stringify(page.snapshot.page)}
            client={client}
            page={page.snapshot.page}
          />
        ) : (
          <div className="empty-state">
            <p>
              Ouvre le profil d'une personne ou la page d'une entreprise sur
              LinkedIn.
            </p>
          </div>
        ))}
    </div>
  );
};
