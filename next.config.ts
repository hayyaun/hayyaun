import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "mdx"],
};

export default createMDX({
  options: {
    // Plugin names and serializable options also work with Turbopack.
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: [
      "rehype-slug",
      ["rehype-pretty-code", { theme: "github-dark", keepBackground: false, bypassInlineCode: true }],
    ],
  },
})(nextConfig);
