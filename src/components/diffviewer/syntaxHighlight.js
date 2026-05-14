/**
 * Syntax highlighting using refractor (Prism-based).
 * Uses the "refractor/lib/all" bundle which includes all languages.
 * Lazy-loaded via dynamic import to avoid increasing initial bundle size.
 */

let refractorInstance = null;

async function getRefractor() {
  if (refractorInstance) return refractorInstance;
  const mod = await import("refractor");
  refractorInstance = mod.refractor;
  return refractorInstance;
}

/**
 * Highlight a single line of code.
 * Returns an array of { type, value } tokens for rendering.
 */
export async function highlight(code, language) {
  if (!code || !language || language === "plaintext") {
    return [{ type: "text", value: code || "" }];
  }

  try {
    const refractor = await getRefractor();

    if (!refractor.registered(language)) {
      return [{ type: "text", value: code }];
    }

    const tree = refractor.highlight(code, language);
    return flattenTree(tree.children || tree);
  } catch {
    return [{ type: "text", value: code }];
  }
}

/**
 * Flatten refractor's AST into a simple array of {type, value} tokens.
 */
function flattenTree(nodes) {
  const tokens = [];
  for (const node of nodes) {
    if (node.type === "text") {
      tokens.push({ type: "text", value: node.value });
    } else if (node.type === "element") {
      const className = node.properties?.className?.[0] || "token";
      const type = className.replace("token ", "").replace("token-", "");
      if (node.children) {
        for (const child of node.children) {
          if (child.type === "text") {
            tokens.push({ type, value: child.value });
          } else if (child.type === "element") {
            tokens.push(...flattenTree([child]));
          }
        }
      }
    }
  }
  return tokens;
}

/**
 * Detect language from file path extension.
 */
export function detectLanguageFromPath(filePath) {
  if (!filePath) return "plaintext";
  const ext = filePath.split(".").pop()?.toLowerCase();
  const map = {
    java: "java", js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx",
    py: "python", go: "go", rs: "rust", kt: "kotlin", cs: "csharp",
    cpp: "cpp", c: "c", rb: "ruby", php: "php", swift: "swift",
    yaml: "yaml", yml: "yaml", json: "json", xml: "xml", sql: "sql",
    sh: "bash", md: "markdown",
  };
  return map[ext] || "plaintext";
}
