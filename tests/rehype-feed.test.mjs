import assert from "node:assert/strict";
import { test } from "node:test";
import rehypeFeed from "../scripts/rehype-feed.mjs";

const text = (value) => ({ type: "text", value });
const element = (tagName, properties = {}, children = []) => ({ type: "element", tagName, properties, children });
const jsx = (name, attributes = [], children = []) => ({ type: "mdxJsxFlowElement", name, attributes, children });
const attribute = (name, value = null) => ({ type: "mdxJsxAttribute", name, value });

function render(children) {
  const tree = { type: "root", children };
  const before = structuredClone(tree);
  rehypeFeed({ siteUrl: "https://hayyaun.ir" })(tree, { stem: "example", path: "content/blog/example.mdx" });
  assert.deepEqual(tree.children.slice(0, -1), before.children, "site content must stay unchanged");
  const exported = tree.children.at(-1);
  assert.equal(exported.type, "mdxjsEsm");
  assert.equal(exported.data.estree.body[0].declaration.declarations[0].id.name, "feedHtml");
  return exported.data.estree.body[0].declaration.declarations[0].init.value;
}

test("feed export escapes HTML text and attributes while retaining Unicode and code markup", () => {
  const html = render([
    element("p", {}, [text('café فارسی <script> & "quotes"')]),
    element("pre", { "data-language": "tsx" }, [
      element("code", {}, [element("span", { style: "color:#abc" }, [text("const x = a < b && c;")])]),
    ]),
    element("a", { href: "/search?a=1&b=2", title: 'a "quote"' }, [text("Search")]),
  ]);
  assert.match(html, /café فارسی &#x3C;script>/);
  assert.match(html, /&#x26; "quotes"/);
  assert.match(html, /<pre data-language="tsx"><code><span>/);
  assert.match(html, /a &#x3C; b &#x26;&#x26; c;/);
  assert.match(html, /href="https:\/\/hayyaun.ir\/search\?a=1&#x26;b=2"/);
  assert.match(html, /title="a &#x22;quote&#x22;"/);
});

test("feed code uses reader colors while preserving language, whitespace, and ordinary JSX styling", () => {
  const html = render([
    jsx("p", [attribute("style", "color:#123456")], [text("Styled prose")]),
    element("pre", { style: "background-color:#0d1117;color:#c9d1d9", "data-language": "tsx" }, [
      element("code", { style: "display: grid;", "data-language": "tsx" }, [
        element("span", { "data-line": "", style: "color:#9ECBFF" }, [
          element("span", { style: "color:#B392F0" }, [text("  const answer = 42;\n\n\treturn answer < 100;\n")]),
        ]),
      ]),
    ]),
    jsx("code", [attribute("style", "color:#79B8FF")], [text("npm run dev")]),
  ]);
  assert.equal(
    html,
    '<p style="color:#123456">Styled prose</p><pre data-language="tsx"><code data-language="tsx"><span data-line=""><span>  const answer = 42;\n\n\treturn answer &#x3C; 100;\n</span></span></code></pre><code>npm run dev</code>'
  );
});

test("feed links, anchors, images, and media resolve against the production article URL", () => {
  const html = render([
    element("a", { href: "#setup" }, [text("Setup")]),
    element("a", { href: "../other" }, [text("Other")]),
    element("img", { src: "/images/demo.png", alt: "Demo" }),
    jsx("video", [attribute("src", "demo.mp4"), attribute("poster", "/images/poster.png"), attribute("controls")]),
    element("a", { href: "mailto:hello@example.com" }, [text("Email")]),
  ]);
  assert.match(html, /href="https:\/\/hayyaun.ir\/blog\/example#setup"/);
  assert.match(html, /href="https:\/\/hayyaun.ir\/other"/);
  assert.match(html, /src="https:\/\/hayyaun.ir\/images\/demo.png"/);
  assert.match(html, /src="https:\/\/hayyaun.ir\/blog\/demo.mp4"/);
  assert.match(html, /poster="https:\/\/hayyaun.ir\/images\/poster.png" controls/);
  assert.match(html, /href="mailto:hello@example.com"/);
});

test("static native MDX JSX is preserved and imports are excluded", () => {
  const html = render([
    { type: "mdxjsEsm", value: 'import Example from "./example"' },
    jsx("details", [attribute("open")], [jsx("summary", [], [text("Question")]), jsx("p", [], [text("Answer < &")])]),
  ]);
  assert.equal(html, "<details open><summary>Question</summary><p>Answer &#x3C; &#x26;</p></details>");
});

test("known interactive experiments get descriptive original-article links", () => {
  const html = render([
    jsx("LayoutExperiment"),
    jsx("ContrastExperiment"),
    jsx("MotionExperiment"),
    jsx("PixelBudgetExperiment"),
  ]);
  assert.equal((html.match(/href="https:\/\/hayyaun.ir\/blog\/example"/g) ?? []).length, 4);
  for (const label of ["intrinsic layout", "color contrast", "timing and easing", "pixel budget"])
    assert.ok(html.includes(label));
  assert.equal(html.includes("Experiment>"), false);
});

test("unknown or configured components and expressions fail instead of losing content", () => {
  assert.throws(() => render([jsx("NewExperiment")]), /explicit fallback for component NewExperiment/);
  assert.throws(
    () => render([jsx("LayoutExperiment", [attribute("width", "50")])]),
    /explicit fallback for configured LayoutExperiment/
  );
  assert.throws(() => render([{ type: "mdxTextExpression", value: "title" }]), /does not support mdxTextExpression/);
  assert.throws(
    () => render([jsx("p", [attribute("id", { type: "mdxJsxAttributeValueExpression", value: "name" })])]),
    /static literal attributes/
  );
  assert.throws(
    () => render([jsx("p", [{ type: "mdxJsxExpressionAttribute", value: "...props" }])]),
    /static literal attributes/
  );
});

test("executable elements, attributes, URLs, raw HTML, and unsupported srcsets fail", () => {
  assert.throws(() => render([element("script", {}, [text("alert(1)")])]), /does not support element script/);
  assert.throws(() => render([jsx("a", [attribute("onClick", "alert(1)")])]), /executable attribute onClick/);
  assert.throws(() => render([element("a", { href: "javascript:alert(1)" })]), /does not allow javascript:/);
  assert.throws(() => render([element("img", { src: "data:text/html,hello" })]), /does not allow data:/);
  assert.throws(() => render([{ type: "raw", value: "<script>bad</script>" }]), /does not support raw/);
  assert.throws(() => render([element("img", { srcSet: "/a.png 1x, /b.png 2x" })]), /does not support srcset/);
});
