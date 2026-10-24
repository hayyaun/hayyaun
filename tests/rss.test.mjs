import assert from "node:assert/strict";
import { test } from "node:test";
import { cdata, escapeXml, rssItem } from "../lib/rss.ts";

test("XML metadata is escaped and CDATA preserves HTML including its closing delimiter", () => {
  assert.equal(
    escapeXml('<a title="x">Tom & café\'s</a>'),
    "&lt;a title=&quot;x&quot;&gt;Tom &amp; café&apos;s&lt;/a&gt;"
  );
  const html = "<p>café &amp; code: <code>]]></code></p>";
  const encoded = cdata(html);
  assert.equal(encoded, "<![CDATA[<p>café &amp; code: <code>]]]]><![CDATA[></code></p>]]>");
  assert.equal(encoded.slice(9, -3).replaceAll("]]]]><![CDATA[>", "]]>"), html);
});

test("RSS items retain stable permalink GUIDs, authored dates, full HTML, and tag order", () => {
  const url = "https://hayyaun.ir/blog/test";
  const xml = rssItem(
    {
      title: "A & B",
      description: "An excerpt",
      date: "2026-10-03",
      tags: ["docker", "devtools", "productivity", "opensource"],
    },
    url,
    "<h2>Full article</h2><p>Beyond the excerpt.</p>"
  );
  assert.ok(xml.includes(`<guid isPermaLink="true">${url}</guid>`));
  assert.ok(xml.includes("<pubDate>Sat, 03 Oct 2026 00:00:00 GMT</pubDate>"));
  assert.ok(
    xml.includes("<content:encoded><![CDATA[<h2>Full article</h2><p>Beyond the excerpt.</p>]]></content:encoded>")
  );
  assert.deepEqual(
    [...xml.matchAll(/<category>(.*?)<\/category>/g)].map((match) => match[1]),
    ["docker", "devtools", "productivity", "opensource"]
  );
  assert.ok(xml.includes("<title>A &amp; B</title>"));
});
