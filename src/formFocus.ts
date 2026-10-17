/** Focus the first invalid field after React renders field errors. */
export function focusFirstError(errors: Record<string, string>, prefix = '') {
  const key = Object.keys(errors)[0]
  if (key) requestAnimationFrame(() => document.getElementById(`${prefix}${key}`)?.focus())
}
