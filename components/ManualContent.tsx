import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

/** Renderar MANUAL.md. Rubrikerna får samma id som på GitHub (ordlistans ankare). */
export function ManualContent({ markdown }: { markdown: string }) {
  return (
    <div className="ta-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
