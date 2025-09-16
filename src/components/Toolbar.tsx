interface ToolbarProps {
	onInsert: (text: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onInsert }) => {
	const buttons = [
		{ label: 'Bold', action: '**bold**' },
		{ label: 'Italic', action: '*italic*' },
		{ label: 'Code', action: '`code`' },
		{ label: 'Link', action: '[text](url)' },
		{ label: 'Image', action: '![alt](url)' },
		{ label: 'List', action: '- item' },
	];

	return (
		<div className="toolbar">
			{buttons.map((btn) => (
				<button className='toolbar-btn' key={btn.label} onClick={() => onInsert(btn.action)} title={`Insert ${btn.label}`}>
					{btn.label}
				</button>
			))}
		</div>
	)
}

export default Toolbar;