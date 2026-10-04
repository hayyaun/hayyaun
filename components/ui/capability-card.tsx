import type { ReactNode } from "react";

export default function CapabilityCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article>
      {children}
      <h3 className="text-lead font-normal tracking-[-0.04em]">{title}</h3>
      <p className="mt-1.5 text-small text-muted">{description}</p>
    </article>
  );
}
