import { useEffect, useState } from "react";
import { formatTwentyPhone } from "../../shared/phone";
import { type TwentyClient } from "../api/TwentyClient";
import { findPeopleByCompany, searchContacts } from "../api/twentyApi";
import { type Company, type Person } from "../api/types";
import { Avatar } from "./Avatar";
import { getPersonName } from "./PersonRow";

type ContactSearchProps = {
  client: TwentyClient;
  query: string;
};

type SearchResults = { people: Person[]; companies: Company[] };

// The async clipboard API is refused when the side panel does not have focus.
const copyWithSelection = (value: string) => {
  const textarea = document.createElement("textarea");

  textarea.value = value;
  document.body.append(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
};

const copyToClipboard = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);

    return true;
  } catch {
    return copyWithSelection(value);
  }
};

const CopyValue = ({ value, href }: { value: string; href: string }) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const copy = async () => {
    setCopyState((await copyToClipboard(value)) ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1500);
  };

  return (
    <span className="contact-value">
      <a href={href} target="_blank" rel="noreferrer">
        {value}
      </a>
      <button
        type="button"
        className="button-ghost contact-copy"
        onClick={() => void copy()}
      >
        {copyState === "copied"
          ? "Copié"
          : copyState === "failed"
            ? "Échec"
            : "Copier"}
      </button>
    </span>
  );
};

const ContactDetails = ({ person }: { person: Person }) => {
  const emails = [
    person.emails?.primaryEmail,
    ...(person.emails?.additionalEmails ?? []),
  ].filter((email): email is string => Boolean(email));
  const phone = person.phones ? formatTwentyPhone(person.phones) : null;

  if (emails.length === 0 && !phone) {
    return <p className="muted">Ni email ni téléphone sur cette fiche.</p>;
  }

  return (
    <>
      {emails.map((email) => (
        <CopyValue key={email} value={email} href={`mailto:${email}`} />
      ))}
      {phone && (
        <CopyValue value={phone} href={`tel:${phone.replace(/\s/g, "")}`} />
      )}
    </>
  );
};

const PersonResult = ({
  client,
  person,
}: {
  client: TwentyClient;
  person: Person;
}) => {
  const name = getPersonName(person) || "Sans nom";
  const subtitle = [person.jobTitle, person.company?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="record contact-result">
      <div className="contact-result-header">
        <Avatar label={name} imageUrl={person.avatarUrl} />
        <span className="record-text">
          <a
            className="record-title"
            href={client.getRecordUrl("person", person.id)}
            target="_blank"
            rel="noreferrer"
          >
            {name}
          </a>
          {subtitle && <span className="record-subtitle">{subtitle}</span>}
        </span>
      </div>
      <div className="contact-details">
        <ContactDetails person={person} />
      </div>
    </li>
  );
};

const CompanyResult = ({
  client,
  company,
}: {
  client: TwentyClient;
  company: Company;
}) => {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = company.name || "Sans nom";

  const toggle = () => {
    setExpanded((value) => !value);

    if (people === null) {
      findPeopleByCompany(client, company.id)
        .then(setPeople)
        .catch((loadError: unknown) =>
          setError(
            loadError instanceof Error ? loadError.message : String(loadError),
          ),
        );
    }
  };

  return (
    <li className="record">
      <div className="record-header">
        <button type="button" className="record-summary" onClick={toggle}>
          <Avatar label={name} shape="square" />
          <span className="record-text">
            <span className="record-title">{name}</span>
            {company.domainName?.primaryLinkUrl && (
              <span className="record-subtitle">
                {company.domainName.primaryLinkUrl}
              </span>
            )}
          </span>
          <span className="chevron">{expanded ? "▾" : "▸"}</span>
        </button>
        <a
          className="open-link"
          href={client.getRecordUrl("company", company.id)}
          target="_blank"
          rel="noreferrer"
        >
          ↗
        </a>
      </div>
      {expanded && (
        <div className="contact-company-people">
          {error && <p className="error-text">{error}</p>}
          {!error && people === null && <p className="muted">Chargement…</p>}
          {people?.length === 0 && (
            <p className="muted">Aucun contact dans cette société.</p>
          )}
          {people && people.length > 0 && (
            <ul className="record-list">
              {people.map((person) => (
                <PersonResult key={person.id} client={client} person={person} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
};

export const ContactSearch = ({ client, query }: ContactSearchProps) => {
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchContacts(client, query)
        .then((found) => {
          if (!cancelled) {
            setError(null);
            setResults(found);
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

  if (error) {
    return <p className="error-text padded">{error}</p>;
  }

  if (!results) {
    return <p className="muted padded">Recherche…</p>;
  }

  if (results.people.length === 0 && results.companies.length === 0) {
    return <p className="muted padded">Aucun contact ni société trouvé.</p>;
  }

  return (
    <div className="padded contact-search-results">
      {results.people.length > 0 && (
        <section className="section">
          <h3>Personnes</h3>
          <ul className="record-list">
            {results.people.map((person) => (
              <PersonResult key={person.id} client={client} person={person} />
            ))}
          </ul>
        </section>
      )}
      {results.companies.length > 0 && (
        <section className="section">
          <h3>Sociétés</h3>
          <ul className="record-list">
            {results.companies.map((company) => (
              <CompanyResult
                key={company.id}
                client={client}
                company={company}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
