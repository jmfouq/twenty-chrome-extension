import { Fragment, type ReactNode } from 'react';
import { CHAT_REFERENCE_PATTERN, parseChatReference } from './chatReferences';

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;
const LINK_PATTERN = /^\[([^\]]+)\]\(([^)\s]+)\)$/;
const BULLET_PATTERN = /^\s*(?:[-*•]|\d+\.)\s+/;

const renderReference = (token: string, workspaceUrl: string, key: number): ReactNode => {
  const reference = parseChatReference(token);

  if (!reference) {
    return <Fragment key={key}>{token}</Fragment>;
  }

  if (!reference.record) {
    return (
      <span key={key} className="chat-reference">
        {reference.label}
      </span>
    );
  }

  const { objectNameSingular, recordId } = reference.record;

  return (
    <a
      key={key}
      className="chat-reference"
      href={`${workspaceUrl}/object/${objectNameSingular}/${recordId}`}
      target="_blank"
      rel="noreferrer"
    >
      {reference.label}
    </a>
  );
};

const renderInline = (text: string, workspaceUrl: string) =>
  text.split(CHAT_REFERENCE_PATTERN).map((part, index): ReactNode =>
    index % 2 === 1 ? renderReference(part, workspaceUrl, index) : <Fragment key={index}>{renderMarkdown(part)}</Fragment>,
  );

const renderMarkdown = (text: string) =>
  text.split(INLINE_PATTERN).map((piece, index): ReactNode => {
    if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 4) {
      return <strong key={index}>{piece.slice(2, -2)}</strong>;
    }

    if (piece.startsWith('*') && piece.endsWith('*') && piece.length > 2) {
      return <em key={index}>{piece.slice(1, -1)}</em>;
    }

    const link = piece.match(LINK_PATTERN);

    if (link && /^https?:\/\//.test(link[2])) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    }

    return <Fragment key={index}>{piece}</Fragment>;
  });

type RichTextProps = {
  text: string;
  workspaceUrl: string;
};

// Renders the small markdown subset AI replies use (bold, links, bullets, headings) without injecting HTML.
export const RichText = ({ text, workspaceUrl }: RichTextProps) => {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length > 0) {
      blocks.push(
        <ul key={`list-${blocks.length}`}>
          {bullets.map((bullet, index) => (
            <li key={index}>{renderInline(bullet, workspaceUrl)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  text.split('\n').forEach((line) => {
    if (BULLET_PATTERN.test(line)) {
      bullets.push(line.replace(BULLET_PATTERN, ''));

      return;
    }

    flushBullets();

    if (line.trim() === '') {
      return;
    }

    const heading = line.match(/^#{1,6}\s+(.*)$/);

    blocks.push(
      <p key={`line-${blocks.length}`} className={heading ? 'rich-heading' : undefined}>
        {renderInline(heading ? heading[1] : line, workspaceUrl)}
      </p>,
    );
  });

  flushBullets();

  return <div className="rich-text">{blocks}</div>;
};
