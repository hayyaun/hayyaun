import { toHtml } from "hast-util-to-html";

const experimentFallbacks = {
  LayoutExperiment: "Open the intrinsic layout experiment in the original article.",
  ContrastExperiment: "Open the interactive color contrast checker in the original article.",
  MotionExperiment: "Open the timing and easing experiment in the original article.",
  PixelBudgetExperiment: "Open the pixel budget calculator in the original article.",
};

const nativeElements = new Set([
  "a",
  "abbr",
  "article",
  "aside",
  "audio",
  "b",
  "blockquote",
  "br",
  "caption",
  "code",
  "col",
  "colgroup",
  "dd",
  "del",
  "details",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "input",
  "kbd",
  "li",
  "main",
  "mark",
  "ol",
  "p",
  "picture",
  "pre",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "section",
  "small",
  "source",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "time",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
]);

const urlProperties = new Set(["href", "src", "poster", "cite", "longDesc"]);

/**
 * Export feed HTML from the same HAST used by @next/mdx, after its other rehype
 * plugins. This uses public MDX plugin nodes and named exports, plus the public
 * HAST serializer; it does not invoke Next's internal React rendering APIs.
 * https://mdxjs.com/guides/frontmatter/ (plugin-created named exports)
 * https://github.com/mdx-js/mdx/tree/main/packages/mdast-util-mdxjs-esm
 * https://github.com/syntax-tree/hast-util-to-html#tohtmltree-options
 */
export default function rehypeFeed({ siteUrl } = {}) {
  const origin = new URL(siteUrl);
  if (!new Set(["http:", "https:"]).has(origin.protocol)) {
    throw new Error("Feed siteUrl must use HTTP or HTTPS.");
  }

  return (tree, file) => {
    if (!file.stem) throw new Error("Feed HTML requires an MDX file name.");
    const articleUrl = new URL(`/blog/${encodeURIComponent(file.stem)}`, origin).href;

    function fail(message) {
      throw new Error(`${file.path ?? file.stem}: feed HTML ${message}`);
    }

    function propertiesForFeed(properties) {
      const result = { ...properties };
      for (const [name, value] of Object.entries(result)) {
        if (/^on/i.test(name) || ["srcDoc", "innerHTML", "dangerouslySetInnerHTML"].includes(name)) {
          fail(`does not support executable attribute ${name}.`);
        }
        // Parsing srcset strings is deliberately avoided. Use a plain src in
        // article content until a supported structured srcset transform is added.
        if (name.toLowerCase() === "srcset") fail("does not support srcset; use a plain image src.");
        if (!urlProperties.has(name) || value == null) continue;
        if (typeof value !== "string") fail(`requires a literal URL for ${name}.`);
        const absolute = new URL(value, articleUrl);
        const protocols = name === "href" ? ["http:", "https:", "mailto:", "tel:"] : ["http:", "https:"];
        if (!protocols.includes(absolute.protocol)) fail(`does not allow ${absolute.protocol} URLs in ${name}.`);
        result[name] = absolute.href;
      }
      return result;
    }

    function convert(node) {
      if (node.type === "mdxjsEsm") return [];
      if (node.type === "text" || node.type === "comment") return [node];
      if (node.type === "root") return [{ ...node, children: node.children.flatMap(convert) }];
      if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
        if (node.name == null) return node.children.flatMap(convert);
        const fallback = Object.hasOwn(experimentFallbacks, node.name) ? experimentFallbacks[node.name] : undefined;
        if (fallback) {
          if (node.attributes.length || node.children.length)
            fail(`needs an explicit fallback for configured ${node.name}.`);
          return [
            {
              type: "element",
              tagName: "p",
              properties: {},
              children: [
                {
                  type: "element",
                  tagName: "a",
                  properties: { href: articleUrl },
                  children: [{ type: "text", value: fallback }],
                },
              ],
            },
          ];
        }
        if (!nativeElements.has(node.name)) fail(`needs an explicit fallback for component ${node.name}.`);
        const properties = {};
        for (const attribute of node.attributes) {
          if (
            attribute.type !== "mdxJsxAttribute" ||
            (attribute.value !== null && typeof attribute.value !== "string")
          ) {
            fail(`requires static literal attributes on ${node.name}.`);
          }
          properties[attribute.name] = attribute.value ?? true;
        }
        return [
          {
            type: "element",
            tagName: node.name,
            properties: propertiesForFeed(properties),
            children: node.children.flatMap(convert),
          },
        ];
      }
      if (node.type === "element") {
        if (!nativeElements.has(node.tagName)) fail(`does not support element ${node.tagName}.`);
        return [{ ...node, properties: propertiesForFeed(node.properties), children: node.children.flatMap(convert) }];
      }
      // Expressions, raw HTML, and new MDX components must be handled explicitly
      // so that future articles cannot silently publish incomplete feed content.
      fail(`does not support ${node.type}; add a static feed representation first.`);
    }

    function removeCodeStyles(node, inCode = false) {
      const isCode = inCode || (node.type === "element" && ["pre", "code"].includes(node.tagName));
      if (isCode && node.type === "element") delete node.properties.style;
      for (const child of node.children ?? []) removeCodeStyles(child, isCode);
    }

    const feedTree = convert(structuredClone(tree))[0];
    // Site highlighting assumes its dark code-block background. Let feed readers
    // choose matching code colors and layout instead of inheriting only its tokens.
    removeCodeStyles(feedTree);
    const html = toHtml(feedTree);
    tree.children.push({
      type: "mdxjsEsm",
      value: `export const feedHtml = ${JSON.stringify(html)};`,
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          body: [
            {
              type: "ExportNamedDeclaration",
              declaration: {
                type: "VariableDeclaration",
                kind: "const",
                declarations: [
                  {
                    type: "VariableDeclarator",
                    id: { type: "Identifier", name: "feedHtml" },
                    init: { type: "Literal", value: html },
                  },
                ],
              },
              specifiers: [],
              source: null,
            },
          ],
        },
      },
    });
  };
}
