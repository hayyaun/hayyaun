# Blog authoring

Articles live here as local, trusted MDX files. They compile at build time with
`@next/mdx`; never place untrusted user content in these files.

To add an article:

1. Create a descriptive `your-slug.mdx` file. Start with the introduction; the
   shared article page supplies the only H1, description, author, and date.
2. Add an entry in `lib/posts.ts` with its title, description, category, tags, actual
   publication date, and an explicit dynamic import of the MDX file. List entries
   in the order they should appear on the index and in RSS.
3. Use H2 sections, fenced code blocks, descriptive links, and official references.
   Import interactive components only when they help explain the article.
4. Run `npm run lint` and `npm run build`. Check `/blog`, the new article URL,
   `/rss.xml`, and `/sitemap.xml` in the production preview.

The registry generates static paths, metadata, RSS entries, and sitemap entries.
Keep the publication date stable; if an article is revised later, add a separate
modification field before using revision dates in the sitemap or structured data.
All five initial articles were authored on October 3, 2026; examples are
illustrative and do not claim measured client or project outcomes.

## Markdown features

GFM tables, task lists, strikethrough (`~~text~~`), and literal URL autolinks are
supported. Task checkboxes represent static content, not saved interactive tasks.
Tables scroll horizontally and their scroll region is keyboard-focusable.

Fenced code blocks are highlighted at build time. Specify a language such as
`tsx`, `css`, `bash`, or `python` after the opening fence. Inline code keeps its
simple styling. No syntax-highlighting JavaScript is sent to the browser.

H2–H6 headings receive generated IDs and clickable permalinks. Duplicate headings
receive distinct suffixes. Keep heading wording stable when others may link to it.
Use H2 for the main sections; the article template already provides the H1.

## Full-content RSS

`/rss.xml` publishes the complete article body in `content:encoded` alongside the
short description. Put the four most relevant lowercase tags first in the
registry: DEV's RSS importer uses the first four categories. Publication dates
and permalink GUIDs stay stable when feed formatting changes.

The same `@next/mdx` pipeline runs `scripts/rehype-feed.mjs` after heading IDs
and syntax highlighting. It exports `feedHtml` from each compiled article;
the Route Handler uses this named export without running a second Markdown
parser or scraping the website. The serializer, `hast-util-to-html`, is a direct
build dependency (previously already installed transitively).

Feed code retains its text, whitespace, and language attributes, but removes
inline styles from code blocks and their tokens so each reader can apply readable
foreground and background colors. Website syntax highlighting stays unchanged;
ordinary static JSX styling outside code is preserved in the feed.

Feed links and image sources resolve against the production article URL.
Interactive examples become descriptive links to the live article because feed
readers do not run the site's React controls. When adding another MDX component,
add an explicit feed alternative in the plugin; unsupported expressions or
components fail the build rather than silently losing article content.

This uses documented [Next.js remark/rehype plugin support](https://nextjs.org/docs/app/guides/mdx#remark-and-rehype-plugins),
[MDX syntax-tree transforms and exports](https://mdxjs.com/guides/frontmatter/),
and the [HAST HTML serializer](https://github.com/syntax-tree/hast-util-to-html).
It avoids React DOM server imports in the Route Handler's React Server Component
environment. RSS encoding follows the [RSS content module recommendations](https://www.rssboard.org/rss-profile#namespace-elements-content-encoded).

Run `npm test`, `npm run lint`, and `npm run build`. Inspect the generated
`.next/server/app/rss.xml.body` as XML, including each item's decoded HTML,
and compare its headings and code blocks with the generated article pages.
After editing `scripts/rehype-feed.mjs`, verify a clean production build: cached
MDX compilation can otherwise retain the previous plugin output. Clear or move
only the generated `.next/cache` before rebuilding; preserve `.next/dev` when a
developer-managed server is running. For Vercel, its documented
[redeploy without the existing Build Cache](https://vercel.com/docs/deployments/troubleshoot-a-build#managing-build-cache)
option provides the corresponding deployment check when needed.
For a browser preview, use a developer-managed server; `npm start` serves the
production build at `http://localhost:3000`.
