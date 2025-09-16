import React from 'react';

export const useCopyToClipboard = (): [
  boolean,
  (text: string) => Promise<boolean>,
] => {
  const [isCopied, setIsCopied] = React.useState(false);

  const copy = React.useCallback(async (text: string) => {
    if (!navigator.clipboard) {
      console.warn('Clipboard API not available');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  }, []);

  return [isCopied, copy];
};
