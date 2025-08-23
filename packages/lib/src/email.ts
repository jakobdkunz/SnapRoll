// Practical email validation with support for common valid characters.
// Not a full RFC 5322 validator, but covers typical real-world cases.
// Rules:
// - one @
// - local: letters/digits and ._%+- allowed; no consecutive dots; not starting/ending with dot
// - domain: letters/digits and .- allowed; labels 1-63 chars, not starting/ending with hyphen; TLD 2+ letters
export function isValidEmail(input: string): boolean {
  const email = input.trim();
  if (email.length < 3 || email.length > 320) return false;
  const at = email.indexOf('@');
  if (at <= 0 || at !== email.lastIndexOf('@') || at === email.length - 1) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  // local part checks
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (local.includes('..')) return false;
  if (!/^[A-Za-z0-9._%+-]+$/.test(local)) return false;
  // domain checks
  if (domain.endsWith('.')) return false;
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  for (const label of labels) {
    if (label.length < 1 || label.length > 63) return false;
    if (!/^[A-Za-z0-9-]+$/.test(label)) return false;
    if (label.startsWith('-') || label.endsWith('-')) return false;
  }
  const tld = labels[labels.length - 1];
  if (!/^[A-Za-z]{2,}$/.test(tld)) return false;
  return true;
}


