import { defineSite } from "./define";

/** Everything a tab, a search result, an install and a link preview say about inkthread. */
export const SITE = defineSite({
  name: "inkthread",
  title: "inkthread — a document, as a graph of what depends on what",
  description:
    "Upload a PDF. Rules and agents thread every part to what it defines, cites, governs and overrides, each thread grounded in the page's own words.",
  url: "https://inkthread-frontend.vercel.app",
  accent: "#e879f9",
  keywords: ["PDF", "knowledge graph", "document graph", "LangGraph", "inkgrid", "agents"],
  card: {
    comment: "a document, as a graph of what depends on what",
    headline: "every part of a document, and the threads between them",
    highlight: "threads",
  },
  // Documents are uploads, kept for an hour: /d/ pages set noindex instead.
  routes: { sitemap: ["/"], disallow: [] },
});
