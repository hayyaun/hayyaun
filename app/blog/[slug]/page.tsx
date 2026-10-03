import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, posts, postDate } from "@/lib/posts";
import { site } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() { return posts.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) notFound();
  return {
    title: post.title, description: post.description,
    alternates: { canonical: `/blog/${post.slug}`, types: { "application/rss+xml": "/rss.xml" } },
    openGraph: { type: "article", title: post.title, description: post.description, url: `/blog/${post.slug}`, publishedTime: post.date, authors: [site.name], images: ["/opengraph-image.png"] },
    twitter: { card: "summary_large_image", title: post.title, description: post.description, images: ["/twitter-image.png"] },
  };
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const { default: Content } = await post.load();
  const next = posts[(posts.indexOf(post) + 1) % posts.length];
  return <main id="main" className="page-width article-main">
    <Link href="/blog" className="back-link">← All articles</Link>
    <article>
      <header className="article-header"><p className="blog-eyebrow">{post.category} / A field note</p><h1>{post.title}</h1><p className="article-deck">{post.description}</p><div className="article-byline"><span>By {site.name}</span><time dateTime={post.date}>{postDate(post.date)}</time></div></header>
      <div className="article-prose"><noscript><p>The article is fully readable without JavaScript. Live experiment controls require JavaScript; expandable answers work without it.</p></noscript><Content /></div>
    </article>
    <aside className="article-next" aria-label="Next article"><p className="blog-eyebrow">Keep reading</p><Link href={`/blog/${next.slug}`}>{next.title} <span aria-hidden="true">↗</span></Link></aside>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.description, datePublished: post.date, author: { "@type": "Person", name: site.name, url: site.url }, mainEntityOfPage: `${site.url}/blog/${post.slug}`, image: `${site.url}/opengraph-image.png` }).replace(/</g, "\\u003c") }} />
  </main>;
}
