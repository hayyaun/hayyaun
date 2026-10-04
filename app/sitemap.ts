import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { projects } from "@/lib/projects";
import { posts } from "@/lib/posts";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/` },
    { url: `${site.url}/blog` },
    ...projects.map((project) => ({ url: `${site.url}/projects/${project.slug}` })),
    ...posts.map((post) => ({ url: `${site.url}/blog/${post.slug}`, lastModified: post.date })),
  ];
}
