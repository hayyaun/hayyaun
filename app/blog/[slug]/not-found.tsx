import Link from "next/link";
import { ArticleHeader } from "@/components/article-layout";

export default function NotFound() {
  return (
    <main id="main" className="page-width pt-12 pb-20 tablet:pt-16">
      <ArticleHeader
        eyebrow="404 / Missing note"
        title="That article isn’t here."
        description="Browse the notebook to find something else to read."
      >
        <Link className="text-link" href="/blog">
          ← All articles
        </Link>
      </ArticleHeader>
    </main>
  );
}
