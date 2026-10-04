import Link from "next/link";
import "./blog.css";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <footer className="page-width flex flex-wrap items-center justify-between gap-5 border-t border-line py-8">
        <Link href="/" className="wordmark text-link text-ui">
          Hayyaun
        </Link>
        <p className="text-small text-subtle">Notes on building for the web.</p>
        <a className="text-link" href="/rss.xml">
          RSS feed <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </>
  );
}
