import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  math?: string;
  children?: string;
  display?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Render a single TeX / LaTeX formula using KaTeX
 */
export const MathView: React.FC<MathViewProps> = ({
  math,
  children,
  display = false,
  className = '',
  style,
}) => {
  const content = math ?? (typeof children === 'string' ? children : '');

  const html = useMemo(() => {
    if (!content.trim()) return '';
    try {
      return katex.renderToString(content, {
        displayMode: display,
        throwOnError: false,
        output: 'htmlAndMathml',
        trust: true,
        strict: false,
      });
    } catch (error) {
      console.warn('KaTeX rendering error:', error);
      return `<span class="katex-error">${content}</span>`;
    }
  }, [content, display]);

  if (!content.trim()) return null;

  return (
    <span
      className={`math-rendered ${display ? 'math-rendered-display' : 'math-rendered-inline'} ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

interface MathTextProps {
  text?: string;
  children?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Parses mixed text containing LaTeX delimiters:
 * - Block: $$...$$ or \[...\]
 * - Inline: $...$ or \(...\)
 * and renders both text and mathematical formulas smoothly.
 */
export const MathText: React.FC<MathTextProps> = ({
  text,
  children,
  className = '',
  style,
}) => {
  const content = text ?? (typeof children === 'string' ? children : '');

  const segments = useMemo(() => {
    if (!content) return [];

    // Regex to match $$...$$, \[...\], \(...\), or $...$
    const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^\$\n]+?\$)/g;
    const parts: { isMath: boolean; display: boolean; content: string }[] = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mathRegex.exec(content)) !== null) {
      const matchStart = match.index;
      if (matchStart > lastIndex) {
        parts.push({
          isMath: false,
          display: false,
          content: content.slice(lastIndex, matchStart),
        });
      }

      const raw = match[0];
      let mathContent = raw;
      let display = false;

      if (raw.startsWith('$$') && raw.endsWith('$$')) {
        mathContent = raw.slice(2, -2);
        display = true;
      } else if (raw.startsWith('\\[') && raw.endsWith('\\]')) {
        mathContent = raw.slice(2, -2);
        display = true;
      } else if (raw.startsWith('\\(') && raw.endsWith('\\)')) {
        mathContent = raw.slice(2, -2);
        display = false;
      } else if (raw.startsWith('$') && raw.endsWith('$')) {
        mathContent = raw.slice(1, -1);
        display = false;
      }

      parts.push({
        isMath: true,
        display,
        content: mathContent.trim(),
      });

      lastIndex = matchStart + raw.length;
    }

    if (lastIndex < content.length) {
      parts.push({
        isMath: false,
        display: false,
        content: content.slice(lastIndex),
      });
    }

    return parts;
  }, [content]);

  if (!content) return null;

  return (
    <span className={`math-text-container ${className}`} style={style}>
      {segments.map((seg, idx) =>
        seg.isMath ? (
          <MathView key={idx} math={seg.content} display={seg.display} />
        ) : (
          <React.Fragment key={idx}>{seg.content}</React.Fragment>
        )
      )}
    </span>
  );
};
