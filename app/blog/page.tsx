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
    <main id="main" className="page-width blog-main">
      <div className="blog-intro">
        <p className="blog-eyebrow">The notebook / 01—{String(posts.length).padStart(2, "0")}</p>
        <h1>
          Thoughts.
          <br />
          Made tangible.
        </h1>
        <div className="blog-intro-bottom">
          <p>
            Notes on building for the web.
            <br />A little theory. A little code. Something to try.
          </p>
          <a href="/rss.xml">
            Follow via RSS <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <section aria-labelledby="articles-title">
        <div className="blog-list-heading">
          <h2 id="articles-title">All articles</h2>
          <span>{String(posts.length).padStart(2, "0")} notes & experiments</span>
        </div>
        {posts.map((post, index) => (
          <article className="blog-row" key={post.slug}>
            <span className="blog-index" aria-hidden="true">
              0{index + 1}
            </span>
            <div>
              <p className="blog-eyebrow">{post.category}</p>
              <h3>
                <Link href={`/blog/${post.slug}`}>
                  {post.title}
                  <span aria-hidden="true"> ↗</span>
                </Link>
              </h3>
              <p className="blog-description">{post.description}</p>
              <time dateTime={post.date}>{postDate(post.date)}</time>
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
