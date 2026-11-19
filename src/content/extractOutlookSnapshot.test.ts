import { describe, expect, it } from "vitest";
import { extractOutlookSnapshot } from "./extractOutlookSnapshot";

const buildDocument = (readingPane: string) =>
  new DOMParser().parseFromString(
    `<body>
      <div id="primaryMailboxRoot_123" role="treeitem" title="me@outlook.com"></div>
      <div role="option" aria-label="list@other.com Devis 10:51"></div>
      <div id="ReadingPaneContainerId">${readingPane}</div>
    </body>`,
    "text/html",
  );

describe("extractOutlookSnapshot", () => {
  it("lists the sender and recipients of the open email", () => {
    const document = buildDocument(`
      <span id="CONV_abc_SUBJECT" role="heading">Devis Galeries Lafayette</span>
      <span id="MSG_1_FROM" role="heading">
        <span role="button" aria-label="De : Claire Martin">Claire Martin &lt;claire@galeries.fr&gt;</span>
      </span>
      <div id="MSG_1_TO" role="heading">
        <div aria-label="À : me@outlook.com; jm.fouquet.92@gmail.com">
          <span role="button" aria-label="me@outlook.com">Moi</span>
          <span role="button" aria-label="jm.fouquet.92@gmail.com">jm.fouquet.92@gmail.com</span>
        </div>
      </div>
      <div id="MSG_1_CC" role="heading">
        <span role="button" aria-label="no-reply@galeries.fr">no-reply@galeries.fr</span>
      </div>
    `);

    expect(extractOutlookSnapshot(document)).toEqual({
      ownEmail: "me@outlook.com",
      subject: "Devis Galeries Lafayette",
      contacts: [
        { email: "claire@galeries.fr", name: "Claire Martin" },
        { email: "jm.fouquet.92@gmail.com", name: null },
      ],
      attachments: [],
    });
  });

  it("returns no contacts when no email is open", () => {
    expect(
      extractOutlookSnapshot(
        buildDocument("<div>Utiliser Outlook partout</div>"),
      ).contacts,
    ).toEqual([]);
  });
});
