import Link from "next/link";
import "./blog.css";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <footer className="blog-footer page-width">
        <Link href="/" className="wordmark">
          Hayyaun
        </Link>
        <p>Notes on building for the web.</p>
        <a href="/rss.xml">
          RSS feed <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </>
  );
}
