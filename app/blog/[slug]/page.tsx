import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import { ArticleHeader, ArticleLayout, RelatedLink } from "@/components/article-layout";
import { notFound } from "next/navigation";
import { getPost, posts, postDate } from "@/lib/posts";
import { site } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return posts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) notFound();
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}`, types: { "application/rss+xml": "/rss.xml" } },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
      authors: [site.name],
      images: ["/opengraph-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ["/twitter-image.png"],
    },
  };
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const { default: Content } = await post.load();
  const next = posts[(posts.indexOf(post) + 1) % posts.length];
  return (
    <ArticleLayout backHref="/blog" backLabel="← All articles">
      <article>
        <ArticleHeader eyebrow={`${post.category} / A field note`} title={post.title} description={post.description}>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-small text-subtle">
            <span>By {site.name}</span>
            <time dateTime={post.date}>{postDate(post.date)}</time>
          </div>
        </ArticleHeader>
        <div className="article-prose">
          <noscript>
            <p>
              The article is fully readable without JavaScript. Live experiment controls require JavaScript; expandable
              answers work without it.
            </p>
          </noscript>
          <Content />
        </div>
      </article>
      <aside className="mt-16 border-t border-line pt-8" aria-label="Next article">
        <p className="eyebrow">Keep reading</p>
        <RelatedLink href={`/blog/${next.slug}`}>{next.title}</RelatedLink>
      </aside>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            author: { "@type": "Person", name: site.name, url: site.url },
            mainEntityOfPage: `${site.url}/blog/${post.slug}`,
            image: `${site.url}/opengraph-image.png`,
          }),
        }}
      />
    </ArticleLayout>
  );
}
