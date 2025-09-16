import React from 'react';
import Toolbar from './Toolbar';
import { useDebounce } from '@/hooks/useDebounce';
import { parseMarkdown } from '@/utils/markdown';
import '@/styles/markdown-styles.css';
import './MarkdownEditor.css';
import './Toolbar.css'

interface MarkdownEditorProps {
	initialContent?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ initialContent = '' }) => {
	const [markdown, setMarkdown] = React.useState(initialContent);
	const [renderedHTML, setRenderedHTML] = React.useState('');
	const textareaRef = React.useRef<HTMLTextAreaElement>(null)
	const debouncedMarkdown = useDebounce(markdown, 300)

	const insertText = (text: string) => {
		const textarea = textareaRef.current;
		console.log({ textarea })
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selectedText = markdown.slice(start, end);

		let newText = text;

		if (selectedText) {
			if (text === '**bold**') {
				newText = `**${selectedText}**`;
			} else if (text === '*italic*') {
				newText = `*${selectedText}*`;
			} else if (text === '`code`') {
				newText = `\`${selectedText}\``;
			} else if (text === '[text](url)') {
				newText = `[${selectedText}](url)`;
			} else if (text === '![alt](url)') {
				newText = `![${selectedText}](url)`;
			} else if (text === '- item') {
				newText = `- ${selectedText}`;
			}
		}

		setMarkdown(prev => {
			const before = prev.substring(0, start);
			const after = prev.substring(end);
			return before + newText + after;
		});
		// Adjust cursor position
		// const newStart = start + (selectedText ? 0 : text.indexOf(selectedText || 'text'));
		const newEnd = start + newText.length - (selectedText ? 0 : text.indexOf(selectedText || 'text'));

		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(newEnd, newEnd);
		}, 0)
	}

	const handleExport = () => {
		const blob = new Blob([debouncedMarkdown], { type: 'text/markdown;charset=utf-8' })
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'document.md';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url)
	}

	const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();

		reader.onload = (event) => {
			const content = event.target?.result as string;
			setMarkdown(content);
		}

		reader.onerror = () => {
			alert('Failed to read file.')
		}

		reader.readAsText(file)
	}


	React.useEffect(() => {
		const parse = async () => {
			const html = await parseMarkdown(debouncedMarkdown);
			setRenderedHTML(html);
		};
		parse();
	}, [debouncedMarkdown]);

	return (
		<div className="markdown-editor">
			<div className="editor-pane">
				<h3>Write</h3>

				{/* File import/export buttons */}
				<div className="file-actions">
					<button className='btn' onClick={handleExport}>
						📥 Export .md
					</button>
					<label className="btn">
						📂 Import .md
						<input
							type="file"
							accept=".md, text/markdown"
							onChange={handleImport}
							className="file-input"
						/>
					</label>
				</div>

				<Toolbar onInsert={insertText} />

				<textarea
					ref={textareaRef}
					value={markdown}
					onChange={e => setMarkdown(e.target.value)}
					placeholder='Write your markdown here...'
					className='markdown-input'
				/>
			</div>
			<div className="preview-pane">
				<h3>Preview</h3>
				<div className="markdown-preview" dangerouslySetInnerHTML={{ __html: renderedHTML }} />
			</div>
		</div>
	)
}

export default MarkdownEditor;