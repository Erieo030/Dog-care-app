export type MarkdownBlock = {
  type: 'paragraph' | 'heading' | 'bullet' | 'numbered';
  text: string;
  marker?: string;
};

/** Parse the small, predictable Markdown subset used in assistant answers. */
export function parseAIAnswer(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: 'paragraph', text: paragraph.join(' ').trim() });
    paragraph = [];
  };

  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    const bullet = line.match(/^[-*+]\s+(.+)$/);
    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: 'heading', text: heading[1] });
    } else if (bullet) {
      flushParagraph();
      blocks.push({ type: 'bullet', text: bullet[1] });
    } else if (numbered) {
      flushParagraph();
      blocks.push({ type: 'numbered', marker: `${numbered[1]}.`, text: numbered[2] });
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();
  return blocks;
}
