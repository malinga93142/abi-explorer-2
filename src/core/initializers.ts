/** A source-level object initializer associated with a record type. */
export interface RecordInitializer {
  variable: string;
  fields: Map<string, string>;
}

/**
 * Find simple object initializers in the source.
 *
 * This intentionally reports the spelling written by the user rather than
 * evaluating it: ABI Explorer has no program runtime, but showing
 * `n.key = 0x20` and `n.next = NULL` is still useful beside the layout.
 * Designated and positional initializers are supported, including nested
 * braces in an expression.
 */
export function recordInitializers(
  source: string,
  kind: string,
  recordName: string,
  fieldNames: string[],
): RecordInitializer[] {
  if (!recordName || fieldNames.length === 0) return [];
  const type =
    kind === 'struct' || kind === 'union' || kind === 'class'
      ? `(?:${kind}\\s+)?${escapeRegExp(recordName)}`
      : escapeRegExp(recordName);
  const declaration = new RegExp(`\\b${type}\\s+([A-Za-z_]\\w*)\\s*=\\s*\\{`, 'g');
  const out: RecordInitializer[] = [];
  let match: RegExpExecArray | null;
  while ((match = declaration.exec(source))) {
    const open = declaration.lastIndex - 1;
    const close = matchingBrace(source, open);
    if (close < 0) continue;
    const fields = new Map<string, string>();
    let positional = 0;
    for (const item of splitTopLevel(source.slice(open + 1, close))) {
      const text = item.trim();
      if (!text) continue;
      const designated = text.match(/^\.([A-Za-z_]\w*)\s*=\s*([\s\S]*)$/);
      if (designated) {
        fields.set(designated[1]!, designated[2]!.trim());
      } else if (positional < fieldNames.length) {
        fields.set(fieldNames[positional]!, text);
      }
      positional++;
    }
    if (fields.size > 0) out.push({ variable: match[1]!, fields });
    declaration.lastIndex = close + 1;
  }
  return out;
}

function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!;
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '{' || c === '(' || c === '[') {
      depth++;
    } else if (c === '}' || c === ')' || c === ']') {
      depth--;
    } else if (c === ',' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts;
}

function matchingBrace(source: string, open: number): number {
  let depth = 0;
  let quote: '"' | "'" | null = null;
  for (let i = open; i < source.length; i++) {
    const c = source[i]!;
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '{') {
      depth++;
    } else if (c === '}' && --depth === 0) {
      return i;
    }
  }
  return -1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
