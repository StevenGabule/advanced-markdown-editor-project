import React from 'react';

export interface EditorState {
  content: string;
  cursorPosition?: {
    start: number;
    end: number;
  };
  timestamp: number;
}

export const useEditorHistory = (initialContent = '') => {
  // History stack
  const [history, setHistory] = React.useState<EditorState[]>([
    { content: initialContent, timestamp: Date.now() },
  ]);
  const [historyIndex, setHistoryIndex] = React.useState(0);
  const isHistoryUpdating = React.useRef(false);

  // Save current state to history
  const saveState = React.useCallback(
    (content: string, cursorPosition?: { start: number; end: number }) => {
      if (isHistoryUpdating.current) return;

      setHistory((prev) => {
        // if we'ere not at the end of history, slice off future states
        const newHistory = prev.slice(0, historyIndex + 1);
        const newState: EditorState = {
          content,
          cursorPosition,
          timestamp: Date.now(),
        };
        // Avoid saving duplicate consecutive states
        if (newHistory[newHistory.length - 1].content === content) {
          return newHistory;
        }

        return [...newHistory, newState];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const undo = React.useCallback(() => {
    if (historyIndex <= 0) return null;

    isHistoryUpdating.current = true;

    setHistoryIndex((prev) => {
      const newIndex = prev - 1;
      isHistoryUpdating.current = false;
      return newIndex;
    });

    return history[historyIndex - 1];
  }, [history, historyIndex]);

  const redo = React.useCallback(() => {
    if (historyIndex >= history.length - 1) return null;

    isHistoryUpdating.current = true;

    setHistoryIndex((prev) => {
      const newIndex = prev + 1;
      isHistoryUpdating.current = false;
      return newIndex;
    });

    return history[historyIndex + 1];
  }, [history, historyIndex]);

  const currentState = history[historyIndex];

  console.log({ history });

  return {
    currentState,
    saveState,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    historyLength: history.length,
    historyIndex,
  };
};
