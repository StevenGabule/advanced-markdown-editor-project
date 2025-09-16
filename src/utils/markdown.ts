import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export const parseMarkdown = async (markdown: string): Promise<string> => {
  const rawHtml = marked(markdown);
  // @ts-expect-error ignore
  return DOMPurify.sanitize(rawHtml);
};
