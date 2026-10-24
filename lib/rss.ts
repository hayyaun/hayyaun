export function escapeXml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!
  );
}

export function cdata(value: string) {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

export function rssItem(
  post: {
    title: string;
    description: string;
    date: string;
    tags: readonly string[];
  },
  url: string,
  html: string
) {
  return `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(url)}</link><description>${escapeXml(post.description)}</description><content:encoded>${cdata(html)}</content:encoded><pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate><guid isPermaLink="true">${escapeXml(url)}</guid>${post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("")}</item>`;
}
