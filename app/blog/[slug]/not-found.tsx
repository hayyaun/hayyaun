import Link from "next/link";
export default function NotFound() {
  return <main id="main" className="page-width blog-main"><div className="article-header"><p className="blog-eyebrow">404 / Missing note</p><h1>That article isn’t here.</h1><p className="article-deck">Browse the notebook to find something else to read.</p><Link className="back-link" href="/blog">← All articles</Link></div></main>;
}
