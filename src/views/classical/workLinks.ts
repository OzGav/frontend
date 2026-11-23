import { LinkType, type MediaItemLink } from "@/plugins/api/interfaces";

/** A link to an outside site shown on a work's page. */
export interface WorkLink {
  type: LinkType;
  url: string;
  // translation key of the link's label
  label: string;
}

// the sites a work page links to, in the order shown
const WORK_LINK_LABELS: [LinkType, string][] = [
  [LinkType.WIKIPEDIA, "classical_link_wikipedia"],
  [LinkType.ALLMUSIC, "classical_link_allmusic"],
  [LinkType.IMSLP, "classical_link_imslp"],
];

/**
 * The Wikipedia, AllMusic and IMSLP links of a work, in that order and one of
 * each at most. Other link types are left out.
 */
export function workLinks(links?: MediaItemLink[] | null): WorkLink[] {
  return WORK_LINK_LABELS.flatMap(([type, label]) => {
    const link = links?.find((l) => l.type === type);
    return link ? [{ type, url: link.url, label }] : [];
  });
}
