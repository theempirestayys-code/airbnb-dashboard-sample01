// Stand-in for next/link in the single-file build: routes become hash links (#/dashboard/)
// so the page works when opened straight from disk (file://) with no server.
import type { AnchorHTMLAttributes } from 'react';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export default function Link({ href, children, ...rest }: Props) {
  const to = href.startsWith('/') ? '#' + href : href;
  return <a href={to} {...rest}>{children}</a>;
}
