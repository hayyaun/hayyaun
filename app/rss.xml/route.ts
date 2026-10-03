import { posts } from "@/lib/posts";
import { site } from "@/lib/site";

export const dynamic = "force-static";
function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!);
}
export function GET() {
  const items = posts.map((post) => {
    const url = `${site.url}/blog/${post.slug}`;
    return `<item><title>${escapeXml(post.title)}</title><link>${url}</link><description>${escapeXml(post.description)}</description><pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate><guid isPermaLink="true">${url}</guid></item>`;
  }).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Hayyaun — Notes on building for the web</title><link>${site.url}/blog</link><description>Frontend architecture, accessibility, CSS, motion, and interactive 3D.</description><language>en</language><atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
