import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { posts } from "@/lib/posts";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${site.url}/` }, { url: `${site.url}/blog` }, ...posts.map((post) => ({ url: `${site.url}/blog/${post.slug}`, lastModified: post.date }))];
}
