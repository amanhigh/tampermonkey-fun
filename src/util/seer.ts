import { SeerDetailPath } from '../models/integrations/seer';

/**
 * Report whether a browser pathname belongs to a Seer movie or tv detail page.
 * @param pathname - Browser pathname of the page
 * @returns True for a movie or tv detail route, including nested season routes
 */
export function isSeerDetailPage(pathname: string): boolean {
  return DETAIL_ROUTE_PATTERN.test(pathname);
}

/**
 * Canonicalize a Seer detail route to `/movie/{id}` or `/tv/{id}`, rejecting anything else.
 * @param pathname - Browser pathname of a Seer movie or tv detail page
 * @returns Canonical detail path of the route
 * @throws Error when the pathname is not a supported detail route
 */
export function canonicalSeerDetailPath(pathname: string): SeerDetailPath {
  const match = DETAIL_ROUTE_PATTERN.exec(pathname);
  if (!match) {
    throw new Error(`Unsupported Seer route: ${pathname}`);
  }
  return `/${match[1]}/${match[2]}` as SeerDetailPath;
}

/** Detail routes that can expose a Seer page operation. */
const DETAIL_ROUTE_PATTERN = /^\/(movie|tv)\/([1-9]\d*)(?:\/|$)/;
