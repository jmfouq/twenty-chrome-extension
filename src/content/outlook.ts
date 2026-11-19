import { extractOutlookSnapshot } from "./extractOutlookSnapshot";
import { publishSnapshot } from "./publishSnapshot";

publishSnapshot(() => ({
  source: "outlook",
  ...extractOutlookSnapshot(document),
}));
