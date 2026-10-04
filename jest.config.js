/** @type {import('jest').Config} */
// ESM-only-paket (github-slugger, react-markdown och dess unified-ekosystem)
// måste transformeras av ts-jest i stället för att hoppas över.
const ESM_PACKAGES = [
  "react-markdown", "remark-.*", "rehype-.*", "unified", "bail", "is-plain-obj", "trough", "vfile.*", "unist-.*",
  "mdast-.*", "micromark.*", "decode-named-character-reference", "character-entities.*", "property-information",
  "hast-.*", "space-separated-tokens", "comma-separated-tokens", "zwitch", "longest-streak", "markdown-table",
  "ccount", "escape-string-regexp", "html-url-attributes", "devlop", "estree-util-.*", "github-slugger",
  "trim-lines", "stringify-entities", "character-reference-invalid", "is-.*", "parse-entities",
];

const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx", allowJs: true }, diagnostics: { ignoreCodes: [151001] } }],
  },
  transformIgnorePatterns: [`/node_modules/(?!(${ESM_PACKAGES.join("|")})/)`],
};

module.exports = config;
