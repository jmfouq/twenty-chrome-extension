import { useEffect, useState } from "react";
import { type GmailAttachment } from "../../shared/types";
import {
  type AttachmentTarget,
  downloadGmailAttachment,
  UploadBlockedError,
  uploadAttachment,
} from "../api/attachments";
import { type TwentyClient } from "../api/TwentyClient";
import { findOpportunities, searchRecordsByName } from "../api/twentyApi";
import { type Company, type Opportunity, type Person } from "../api/types";
import { getPersonName } from "./PersonRow";

type AttachmentsSectionProps = {
  client: TwentyClient;
  attachments: GmailAttachment[];
  people: Person[];
  companies: Company[];
};

type ImportStatus =
  | { state: "importing" }
  | { state: "done" }
  | { state: "error"; message: string };

const TARGET_KIND_LABELS: Record<AttachmentTarget["kind"], string> = {
  person: "Personnes",
  company: "Sociétés",
  opportunity: "Opportunités",
};

const toTargets = (
  people: Person[],
  companies: Company[],
  opportunities: Opportunity[],
): AttachmentTarget[] => [
  ...people.map((person) => ({
    kind: "person" as const,
    id: person.id,
    label: getPersonName(person) || "Sans nom",
  })),
  ...companies.map((company) => ({
    kind: "company" as const,
    id: company.id,
    label: company.name || "Sans nom",
  })),
  ...opportunities.map((opportunity) => ({
    kind: "opportunity" as const,
    id: opportunity.id,
    label: opportunity.name || "Sans nom",
  })),
];

const toTargetKey = (target: AttachmentTarget) => `${target.kind}:${target.id}`;

const TargetOptions = ({ targets }: { targets: AttachmentTarget[] }) => (
  <>
    {(Object.keys(TARGET_KIND_LABELS) as AttachmentTarget["kind"][]).map(
      (kind) => {
        const targetsOfKind = targets.filter((target) => target.kind === kind);

        return (
          targetsOfKind.length > 0 && (
            <optgroup key={kind} label={TARGET_KIND_LABELS[kind]}>
              {targetsOfKind.map((target) => (
                <option key={toTargetKey(target)} value={toTargetKey(target)}>
                  {target.label}
                </option>
              ))}
            </optgroup>
          )
        );
      },
    )}
  </>
);

const RecordSearch = ({
  client,
  onPick,
}: {
  client: TwentyClient;
  onPick: (target: AttachmentTarget) => void;
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AttachmentTarget[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);

      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchRecordsByName(client, query)
        .then(({ people, companies, opportunities }) => {
          if (!cancelled) {
            setError(null);
            setResults(toTargets(people, companies, opportunities));
          }
        })
        .catch((searchError: unknown) => {
          if (!cancelled) {
            setError(
              searchError instanceof Error
                ? searchError.message
                : String(searchError),
            );
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [client, query]);

  return (
    <div className="attachment-search">
      <input
        type="search"
        placeholder="Chercher une personne, une société, une opportunité…"
        value={query}
        autoFocus
        onChange={(event) => setQuery(event.target.value)}
      />
      {error && <p className="error-text">{error}</p>}
      {results && results.length === 0 && (
        <p className="muted">Aucune fiche trouvée.</p>
      )}
      {results && results.length > 0 && (
        <ul className="attachment-search-results">
          {results.map((target) => (
            <li key={toTargetKey(target)}>
              <button
                type="button"
                className="button-ghost"
                onClick={() => onPick(target)}
              >
                {target.label}
                <span className="muted">
                  {" "}
                  · {TARGET_KIND_LABELS[target.kind].slice(0, -1)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const AttachmentsSection = ({
  client,
  attachments,
  people,
  companies,
}: AttachmentsSectionProps) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [pickedTarget, setPickedTarget] = useState<AttachmentTarget | null>(
    null,
  );
  const [targetKey, setTargetKey] = useState("");
  const [searching, setSearching] = useState(false);
  const [statuses, setStatuses] = useState<Map<string, ImportStatus>>(
    new Map(),
  );
  const [blockedOrigin, setBlockedOrigin] = useState<string | null>(null);
  const peopleKey = people.map((person) => person.id).join(",");
  const companiesKey = companies.map((company) => company.id).join(",");

  useEffect(() => {
    let cancelled = false;

    const toIds = (key: string) => (key ? key.split(",") : []);

    findOpportunities(client, {
      personIds: toIds(peopleKey),
      companyIds: toIds(companiesKey),
    })
      .then((found) => {
        if (!cancelled) {
          setOpportunities(found);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [client, peopleKey, companiesKey]);

  const suggestedTargets = toTargets(people, companies, opportunities);
  const targets =
    pickedTarget &&
    !suggestedTargets.some(
      (target) => toTargetKey(target) === toTargetKey(pickedTarget),
    )
      ? [pickedTarget, ...suggestedTargets]
      : suggestedTargets;
  const target =
    targets.find((candidate) => toTargetKey(candidate) === targetKey) ?? null;
  const selectedAttachments = attachments.filter((attachment) =>
    selectedUrls.has(attachment.downloadUrl),
  );
  const isImporting = [...statuses.values()].some(
    (status) => status.state === "importing",
  );

  const setStatus = (url: string, status: ImportStatus) =>
    setStatuses((previous) => new Map(previous).set(url, status));

  const toggle = (url: string) =>
    setSelectedUrls((previous) => {
      const next = new Set(previous);

      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }

      return next;
    });

  const importSelected = async () => {
    if (!target) {
      return;
    }

    setBlockedOrigin(null);

    for (const attachment of selectedAttachments) {
      setStatus(attachment.downloadUrl, { state: "importing" });

      try {
        const file = await downloadGmailAttachment(attachment);

        await uploadAttachment(client, file, target);
        setStatus(attachment.downloadUrl, { state: "done" });
        setSelectedUrls((previous) => {
          const next = new Set(previous);

          next.delete(attachment.downloadUrl);

          return next;
        });
      } catch (error) {
        if (error instanceof UploadBlockedError) {
          setBlockedOrigin(error.origin);
        }

        setStatus(attachment.downloadUrl, {
          state: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  // Uploads may go to a storage host outside Twenty's domain, which Chrome only allows once the user grants it.
  const allowUploadOrigin = async () => {
    if (
      blockedOrigin &&
      (await chrome.permissions.request({ origins: [`${blockedOrigin}/*`] }))
    ) {
      await importSelected();
    }
  };

  const pickTarget = (picked: AttachmentTarget) => {
    setPickedTarget(picked);
    setTargetKey(toTargetKey(picked));
    setSearching(false);
  };

  const importedTarget = target
    ? client.getRecordUrl(target.kind, target.id)
    : null;

  return (
    <section className="section">
      <h3>Pièces jointes</h3>
      <ul className="attachment-list">
        {attachments.map((attachment) => {
          const status = statuses.get(attachment.downloadUrl);

          return (
            <li key={attachment.downloadUrl} className="attachment">
              <label className="attachment-label">
                <input
                  type="checkbox"
                  checked={selectedUrls.has(attachment.downloadUrl)}
                  disabled={isImporting}
                  onChange={() => toggle(attachment.downloadUrl)}
                />
                <span className="attachment-name">
                  {attachment.name}
                  {attachment.senderName && (
                    <span className="muted"> · de {attachment.senderName}</span>
                  )}
                </span>
              </label>
              {status?.state === "importing" && (
                <span className="muted">Import…</span>
              )}
              {status?.state === "done" && (
                <span className="attachment-done">✓ Importé</span>
              )}
              {status?.state === "error" && (
                <p className="error-text">{status.message}</p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="attachment-target">
        <label className="muted" htmlFor="attachment-target">
          Importer dans
        </label>
        <select
          id="attachment-target"
          value={searching ? "__search" : targetKey}
          disabled={isImporting}
          onChange={(event) => {
            if (event.target.value === "__search") {
              setSearching(true);

              return;
            }

            setSearching(false);
            setTargetKey(event.target.value);
          }}
        >
          <option value="" disabled>
            Choisir une fiche
          </option>
          <TargetOptions targets={targets} />
          <option value="__search">Autre fiche…</option>
        </select>
      </div>

      {searching && <RecordSearch client={client} onPick={pickTarget} />}

      <div className="attachment-actions">
        <button
          type="button"
          className="button-primary"
          disabled={!target || selectedAttachments.length === 0 || isImporting}
          onClick={() => void importSelected()}
        >
          {isImporting
            ? "Import en cours…"
            : `Importer${selectedAttachments.length > 1 ? ` (${selectedAttachments.length})` : ""}`}
        </button>
        {blockedOrigin && (
          <button
            type="button"
            className="button-secondary"
            onClick={() => void allowUploadOrigin()}
          >
            Autoriser l'envoi
          </button>
        )}
        {importedTarget &&
          [...statuses.values()].some((status) => status.state === "done") && (
            <a
              className="open-link"
              href={importedTarget}
              target="_blank"
              rel="noreferrer"
            >
              Voir la fiche ↗
            </a>
          )}
      </div>
    </section>
  );
};
