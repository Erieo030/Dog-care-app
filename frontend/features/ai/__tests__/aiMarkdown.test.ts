import { parseAIAnswer } from '../aiMarkdown';

describe('parseAIAnswer', () => {
  it('converts paragraphs, headings, bullets, and numbered items to blocks', () => {
    expect(parseAIAnswer('## 飲食\n最近食量正常。\n\n- 留意喝水\n- 持續觀察\n\n1. 記錄變化')).toEqual([
      { type: 'heading', text: '飲食' },
      { type: 'paragraph', text: '最近食量正常。' },
      { type: 'bullet', text: '留意喝水' },
      { type: 'bullet', text: '持續觀察' },
      { type: 'numbered', marker: '1.', text: '記錄變化' },
    ]);
  });

  it('joins wrapped lines and normalizes Windows line endings', () => {
    expect(parseAIAnswer('這是一段\r\n換行文字。')).toEqual([
      { type: 'paragraph', text: '這是一段 換行文字。' },
    ]);
  });
});
