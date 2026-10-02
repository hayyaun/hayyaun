import type { MetadataRoute } from "next";
import { site, isPreview } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: isPreview ? { userAgent: "*", disallow: "/" } : { userAgent: "*", allow: "/", disallow: "/lab/" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}