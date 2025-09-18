/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import Toolbar from './Toolbar';
import { useDebounce } from '@/hooks/useDebounce';
import { parseMarkdown } from '@/utils/markdown';
import '@/styles/markdown-styles.css';
import './MarkdownEditor.css';
import './Toolbar.css'
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useEditorHistory } from '@/hooks/useEditorHistory';

type Html2CanvasOptions = Parameters<typeof html2canvas>[1];

type Html2CanvasOptionsExtended = Html2CanvasOptions & {
	scale?: number;
	scrollX?: number;
	scrollY?: number;
	windowWidth?: number;
	windowHeight?: number;
	backgroundColor?: string | null;
};

interface MarkdownEditorProps {
	initialContent?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ initialContent = '' }) => {
	const { currentState, saveState, undo, redo, canRedo, canUndo } = useEditorHistory()
	const [markdown, setMarkdown] = React.useState(currentState.content);
	const [renderedHTML, setRenderedHTML] = React.useState('');
	const [isSaved, setIsSaved] = React.useState(true)
	const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
	const [isExportingPDF, setIsExportingPDF] = React.useState(false);
	const [cursorPosition, setCursorPosition] = React.useState<{ start: number; end: number } | null>(null)
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const debouncedMarkdown = useDebounce(markdown, 500)

	React.useEffect(() => {
		if (markdown !== currentState.content) {
			setMarkdown(currentState.content)

			// Restore cursor position if available
			if (currentState.cursorPosition) {
				setCursorPosition(currentState.cursorPosition)
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentState])

	React.useEffect(() => {
		if (cursorPosition && textareaRef.current) {
			const textarea = textareaRef.current;
			setTimeout(() => {
				textarea.focus();
				textarea.setSelectionRange(cursorPosition.start, cursorPosition.end)
			}, 0)
		}
	}, [cursorPosition])

	// ✅ Auto-save to localStorage
	React.useEffect(() => {
		if (debouncedMarkdown !== initialContent) {
			localStorage.setItem('markdown-editor-content', debouncedMarkdown);
			setIsSaved(true)
			setLastSaved(new Date());
		}
	}, [debouncedMarkdown, initialContent])


	// ✅ Mark as unsaved while typing
	React.useEffect(() => {
		if (debouncedMarkdown !== initialContent) {
			setIsSaved(false);
		}
	}, [debouncedMarkdown, initialContent]);

	React.useEffect(() => {
		const parse = async () => {
			const html = await parseMarkdown(debouncedMarkdown);
			setRenderedHTML(html);
		};
		parse();
	}, [debouncedMarkdown]);

	React.useEffect(() => {
		const handleKeyDown = (e: React.KeyboardEvent) => {
			if (e.ctrlKey || e.metaKey) {
				if (e.key === 'z' && !e.shiftKey) {
					e.preventDefault();
					undo();
				} else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
					e.preventDefault();
					redo();
				}
			}
		};

		// @ts-expect-error ignore type checking
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			// @ts-expect-error ignore type checking
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [undo, redo])

	const insertText = (text: string) => {
		const textarea = textareaRef.current;
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
		let before = '';
		let after = '';
		setMarkdown(prev => {
			before = prev.substring(0, start);
			after = prev.substring(end);
			return before + newText + after;
		});

		const newEnd = start + newText.length;

		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(newEnd, newEnd);

			// save to history with new cursor position
			saveState(before + newText + after, { start: newEnd, end: newEnd })
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
			saveState(content);
		}

		reader.onerror = () => {
			alert('Failed to read file.')
		}

		reader.readAsText(file)
	}

	const handleClearSaved = () => {
		if (window.confirm('Are you sure you want to clear saved content?')) {
			localStorage.removeItem('markdown-editor-content');
			const welcomeContent = '# Welcome to Markdown Editor\nStart typing...';
			setMarkdown(welcomeContent);
			saveState(welcomeContent); // Save to history
			setIsSaved(true);
			setLastSaved(null);
		}
	};

	const getMarkdownStyles = (): string => {
		// These are the basic styles from your markdown-styles.css
		return `
    h1 { font-size: 2em; margin: 0.67em 0; }
    h2 { font-size: 1.5em; margin: 0.83em 0; }
    h3 { font-size: 1.17em; margin: 1em 0; }
    p { margin: 1em 0; }
    ul, ol { padding-left: 2em; margin: 1em 0; }
    blockquote {
      border-left: 4px solid #ccc;
      padding-left: 1em;
      margin: 1em 0;
      color: #555;
    }
    a { color: #007bff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .code-block-wrapper { position: relative; margin: 1em 0; }
    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #2d2d2d;
      padding: 0.5em 1em;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
      font-size: 0.85em;
      color: #ccc;
    }
    .code-header .lang { font-weight: bold; text-transform: uppercase; }
    .copy-btn {
      background: #444;
      color: white;
      border: none;
      padding: 0.25em 0.5em;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.85em;
    }
    .copy-btn:hover { background: #555; }
  `;
	};

	const exportAsHTML = () => {
		const htmlContent = parseMarkdown(markdown);
		const fullHTML = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Exported Markdown Document</title>
				<style>
					body {
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
						line-height: 1.6;
						max-width: 800px;
						margin: 40px auto;
						padding: 0 20px;
					}
					/* Light mode (default) */
					body {
						color: #333;
						background: #fff;
					}
					pre {
						background: #f5f5f5;
						color: #333;
					}
					/* Dark mode */
					@media (prefers-color-scheme: dark) {
						body {
							color: #e0e0e0;
							background: #121212;
						}
						pre {
							background: #1e1e1e;
							color: #e0e0e0;
						}
					}
					${getMarkdownStyles()}
					pre { padding: 16px; border-radius: 6px; overflow-x: auto; }
					code { background: #f0f0f0; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; }
					pre code { background: transparent; padding: 0; }
				</style>
			</head>
			<body>
				${htmlContent}
			</body>
			</html>
			`;
		const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a');
		link.href = url;
		link.download = 'document.html'
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url)
	}

	const exportAsPDF = () => {
		setIsExportingPDF(true);
		const previewElement: any = document.querySelector('.markdown-preview');
		if (!previewElement) {
			setIsExportingPDF(false);
			return;
		}

		// Temporarily force light mode for PDF
		const originalBg = previewElement.style.backgroundColor;
		const originalColor = previewElement.style.color;
		previewElement.style.backgroundColor = '#ffffff';
		previewElement.style.color = '#000000';

		// Also force light mode for code blocks
		const codeBlocks = previewElement.querySelectorAll('pre');
		const originalCodeBg: any[] = [];
		codeBlocks.forEach((block: any, index: number) => {
			originalCodeBg[index] = block.getAttribute('data-original-bg') || block.style.backgroundColor;
			block.style.backgroundColor = '#f5f5f5';
			block.style.color = '#000000';
		});

		html2canvas(previewElement, {
			scale: 2,
			useCORS: true,
			backgroundColor: '#ffffff',
		} as Html2CanvasOptionsExtended).then((canvas) => {
			// Restore original styles
			previewElement.style.backgroundColor = originalBg;
			previewElement.style.color = originalColor;
			codeBlocks.forEach((block: any, index: number) => {
				block.style.backgroundColor = originalCodeBg[index];
			});

			const imgData = canvas.toDataURL('image/png');
			const pdf = new jsPDF('p', 'mm', 'a4');
			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();
			const imgWidth = canvas.width;
			const imgHeight = canvas.height;
			const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
			const imgX = (pdfWidth - imgWidth * ratio) / 2;
			const imgY = 10;

			pdf.addImage(
				imgData,
				'PNG',
				imgX,
				imgY,
				imgWidth * ratio,
				imgHeight * ratio
			);

			pdf.save('document.pdf');
			setIsExportingPDF(false);
		}).catch((error) => {
			// Restore styles even if error occurs
			previewElement.style.backgroundColor = originalBg;
			previewElement.style.color = originalColor;
			codeBlocks.forEach((block: any, index: number) => {
				block.style.backgroundColor = originalCodeBg[index];
			});
			console.error('PDF export failed:', error);
			setIsExportingPDF(false);
		});
	};

	const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newContent = e.target.value;
		setMarkdown(newContent);

		// Save cursor position
		const start = e.target.selectionStart;
		const end = e.target.selectionEnd;
		setCursorPosition({ start, end })

		// SAve to history (debounced version will handle auto-save)
		saveState(newContent, { start, end })
	}

	return (
		<div className="markdown-editor">
			<div className="editor-pane">
				<h3>Write</h3>

				{/* File import/export buttons */}
				<div className="file-actions">
					<button className='btn' onClick={handleExport}>
						📥 Export .md
					</button>
					<button onClick={exportAsHTML} className="btn" style={{ background: '#6f42c1' }}>
						🖥️ Export HTML
					</button>
					<button
						onClick={exportAsPDF}
						className="btn"
						style={{ background: '#e83e8c' }}
						disabled={isExportingPDF}
					>
						{isExportingPDF ? '📄 Exporting...' : '📄 Export PDF'}
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
					<button onClick={undo} disabled={!canUndo} className='btn' style={{ background: '#ffc107' }} title='Undo (Ctrl+Z)'>↩️ Undo</button>
					<button onClick={redo} disabled={!canRedo} className='btn' style={{ background: '#20c997' }} title='Redo (Ctrl+Y)'>↪️ Redo</button>
					<button onClick={handleClearSaved} className="btn" style={{ background: '#dc3545' }}>
						🗑️ Clear Saved
					</button>
					{!isSaved && <span className="status-indicator">💾 Saving...</span>}
					{isSaved && <span className="status-indicator saved">✅ Saved</span>}
					{lastSaved && (
						<span className="status-indicator saved">
							✅ Saved {lastSaved.toLocaleTimeString()}
						</span>
					)}
				</div>

				<Toolbar onInsert={insertText} />

				<textarea
					ref={textareaRef}
					value={markdown}
					onChange={handleTextChange}
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