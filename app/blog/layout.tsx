import Link from "next/link";
import "./blog.css";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header page-width">
      <Link href="/" className="wordmark" aria-label="Hayyaun home">Hayyaun</Link>
      <nav aria-label="Main navigation"><Link href="/#work">Work</Link><Link href="/blog" aria-current="true">Blog</Link><Link href="/#contact">Contact</Link></nav>
    </header>
    {children}
    <footer className="blog-footer page-width"><Link href="/" className="wordmark">Hayyaun</Link><p>Notes on building for the web.</p><a href="/rss.xml">RSS feed <span aria-hidden="true">↗</span></a></footer>
  </>;
}
