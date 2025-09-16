import React from 'react'
import MarkdownEditor from './components/MarkdownEditor'
import './App.css'
import { useDarkMode } from './hooks/useDarkMode'

const App: React.FC = () => {
  const [isDark, toggleDarkMode] = useDarkMode()
  return (
    <div className={`App ${isDark ? 'dark' : ''}`}>
      <header className="App-header">
        <h1>Markdown Editor</h1>
        <button onClick={toggleDarkMode} className='mode-toggle'>
          {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </header>
      <MarkdownEditor initialContent='# Hello, Markdown!' />
    </div>
  )
}

export default App;
