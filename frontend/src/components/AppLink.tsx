import type { ReactNode } from "react";

export default function AppLink({
  href,
  go,
  className,
  children,
}: {
  href: string;
  go: (href: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          go(href);
        }
      }}
    >
      {children}
    </a>
  );
}
