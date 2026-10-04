import type { Metadata } from "next";
import Link from "next/link";
import { posts, postDate } from "@/lib/posts";

const title = "Blog — Notes on building for the web";
const description =
  "Practical notes on frontend architecture, accessible interfaces, CSS, motion, and interactive 3D, with small experiments you can try.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/rss.xml" } },
  openGraph: { title, description, url: "/blog", type: "website", images: ["/opengraph-image.png"] },
  twitter: { card: "summary_large_image", title, description, images: ["/twitter-image.png"] },
};

export default function Blog() {
  return (
    <main id="main" className="page-width pt-12 pb-20 tablet:pt-16">
      <div className="pb-12 tablet:pb-16">
        <p className="eyebrow">The notebook / 01—{String(posts.length).padStart(2, "0")}</p>
        <h1 className="display-heading mt-6 text-[clamp(54px,9vw,112px)]">
          Thoughts.
          <br />
          Made tangible.
        </h1>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
          <p className="text-lead leading-[1.6] text-subtle">
            Notes on building for the web.
            <br />A little theory. A little code. Something to try.
          </p>
          <a href="/rss.xml" className="text-link">
            Follow via RSS <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <section aria-labelledby="articles-title">
        <div className="flex flex-wrap justify-between gap-3 border-t border-line py-6">
          <h2 id="articles-title" className="text-base font-medium">
            All articles
          </h2>
          <span className="text-meta text-subtle">{String(posts.length).padStart(2, "0")} notes & experiments</span>
        </div>
        {posts.map((post, index) => (
          <article
            className="grid grid-cols-[24px_minmax(0,1fr)] gap-4 border-t border-line py-8 tablet:grid-cols-[48px_minmax(0,1fr)_190px] tablet:items-center tablet:gap-8 tablet:py-10"
            key={post.slug}
          >
            <span className="pt-0.75 font-mono text-meta text-subtle tablet:self-start" aria-hidden="true">
              0{index + 1}
            </span>
            <div>
              <p className="eyebrow">{post.category}</p>
              <h3 className="mt-3 max-w-165 text-note">
                <Link className="decoration-1 underline-offset-6 hover:underline" href={`/blog/${post.slug}`}>
                  {post.title}
                  <span aria-hidden="true"> ↗</span>
                </Link>
              </h3>
              <p className="my-4 max-w-147.5 text-label leading-[1.7] text-subtle">{post.description}</p>
              <time className="text-meta text-subtle" dateTime={post.date}>
                {postDate(post.date)}
              </time>
            </div>
            <div className={`blog-motif motif-${index}`} aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
