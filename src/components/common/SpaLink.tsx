import React from 'react';
import { handleSpaNavigation } from '../../utils/navigation';

export interface SpaLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  onNavigate?: (path: string) => void;
  children?: React.ReactNode;
}

/**
 * Semantic anchor tag (<a href="...">) for search engine crawlers and accessibility,
 * which transparently intercepts plain left clicks for instant SPA transitions
 * while preserving native browser behaviors (middle-click, ctrl/cmd-click, shift-click).
 */
export const SpaLink = React.forwardRef<HTMLAnchorElement, SpaLinkProps>(
  ({ href, onNavigate, onClick, children, ...rest }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) {
        handleSpaNavigation(e, href, onNavigate);
      }
    };

    return (
      <a ref={ref} href={href} onClick={handleClick} {...rest}>
        {children}
      </a>
    );
  }
);

SpaLink.displayName = 'SpaLink';
