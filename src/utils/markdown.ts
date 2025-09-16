/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

const renderer = new marked.Renderer();

renderer.code = ({
  text,
  lang,
  escaped: _,
}: {
  text: string;
  lang?: string;
  escaped?: boolean;
}) => {
  const language = lang?.split(' ')[0] || 'plaintext';
  let highlightedCode = text;

  if (lang && hljs.getLanguage(language)) {
    try {
      highlightedCode = hljs.highlight(text, { language }).value;
    } catch (err) {
      console.error('Highlight.js error:', err);
    }
  } else {
    highlightedCode = hljs.highlightAuto(text).value;
  }

  // Encode for safe use in onclick (handles Unicode)
  const encodedCode = btoa(unescape(encodeURIComponent(text)));

  // Add copy button via html (we'll make it work with event delegation)
  return `
    <div class="code-block-wrapper">
      <div class="code-header">
        <span class="lang">${language === 'plaintext' ? 'text' : language}</span>
         <button class="copy-btn" onclick="navigator.clipboard.writeText(decodeURIComponent(escape(atob('${encodedCode}')))).then(() => {this.innerText='Copied!'; setTimeout(() => {this.innerText='Copy'}, 1500);})">
          Copy
        </button>
      </div>
      <pre><code class="hljs ${language}">${highlightedCode}</code></pre>
    </div>
  `;
};

marked.use({ renderer });

// Configure marked to use highlight.js for code blocks
marked.setOptions({
  breaks: true,
  gfm: true,
  // @ts-expect-error ignore
  highlight: (code: any, lang: any) => {
    return code;
  },
});

// @ts-expect-error ignore
export const parseMarkdown = async (markdown: string): string => {
  const result = marked(markdown);
  const rawHtml =
    // @ts-expect-error ignore
    typeof result === 'object' && result.html ? result.html : String(result);

  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['class', 'onclick'],
    ADD_TAGS: ['button', 'div', 'span'],
  });

  return cleanHtml;
};
