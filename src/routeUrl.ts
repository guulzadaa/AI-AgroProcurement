/** Keep authentication redirects inside the deployment root. */
export function routeUrl(base: string, route: string) {
  return `${base}#${route}`
}
