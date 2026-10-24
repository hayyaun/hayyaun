import { posts } from "@/lib/posts";
import { site } from "@/lib/site";
import { escapeXml, rssItem } from "@/lib/rss";

export const dynamic = "force-static";
export async function GET() {
  const items = (
    await Promise.all(
      posts.map(async (post) => {
        const url = `${site.url}/blog/${post.slug}`;
        const { feedHtml } = await post.load();
        return rssItem(post, url, feedHtml);
      })
    )
  ).join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Hayyaun — Notes on building for the web</title><link>${escapeXml(site.url)}/blog</link><description>Frontend architecture, accessibility, CSS, motion, interactive 3D, and developer tools.</description><language>en</language><atom:link href="${escapeXml(site.url)}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`,
    { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } }
  );
}
