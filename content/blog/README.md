# Blog authoring

Articles live here as local, trusted MDX files. They compile at build time with
`@next/mdx`; never place untrusted user content in these files.

To add an article:

1. Create a descriptive `your-slug.mdx` file. Start with the introduction; the
   shared article page supplies the only H1, description, author, and date.
2. Add an entry in `lib/posts.ts` with its title, description, category, actual
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
