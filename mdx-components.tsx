import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";

function Heading({ as: Tag, id, children, ...props }: ComponentPropsWithoutRef<"h2"> & { as: "h2" | "h3" | "h4" | "h5" | "h6" }) {
  return (
    <Tag id={id} {...props}>
      {id ? (
        <a className="heading-permalink" href={`#${id}`}>
          {children}
          <span aria-hidden="true" className="heading-hash">
            {" "}
            #
          </span>
        </a>
      ) : (
        children
      )}
    </Tag>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => <Heading as="h2" {...props} />,
    h3: (props) => <Heading as="h3" {...props} />,
    h4: (props) => <Heading as="h4" {...props} />,
    h5: (props) => <Heading as="h5" {...props} />,
    h6: (props) => <Heading as="h6" {...props} />,
    table: (props) => (
      <div className="mdx-table-scroll" role="region" aria-label="Scrollable table" tabIndex={0}>
        <table {...props} />
      </div>
    ),
    ...components,
  };
}
