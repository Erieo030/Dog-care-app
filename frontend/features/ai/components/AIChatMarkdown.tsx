import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { parseAIAnswer } from '../aiMarkdown';

function inlineMarkdown(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g);
  return tokens.map((token, index) => {
    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      return <Text key={index} style={styles.bold}>{token.slice(2, -2)}</Text>;
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return <Text key={index} style={styles.code}>{token.slice(1, -1)}</Text>;
    }
    return <Text key={index}>{token}</Text>;
  });
}

export function AIChatMarkdown({ text, collapsed }: { text: string; collapsed?: boolean }) {
  const blocks = parseAIAnswer(text);
  return (
    <Text style={styles.content} numberOfLines={collapsed ? 6 : undefined}>
      {blocks.map((block, index) => (
        <Text
          key={`${block.type}-${index}`}
          style={block.type === 'heading' ? styles.heading : styles.paragraph}
        >
          {block.type === 'bullet' ? (
            <>
              <Text style={styles.listMarker}>• </Text>
              {inlineMarkdown(block.text)}
            </>
          ) : block.type === 'numbered' ? (
            <>
              <Text style={styles.listMarker}>{block.marker} </Text>
              {inlineMarkdown(block.text)}
            </>
          ) : (
            inlineMarkdown(block.text)
          )}
          {index < blocks.length - 1 ? '\n' : ''}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: { color: Colors.text, lineHeight: 23, fontSize: 16 },
  paragraph: { color: Colors.text, lineHeight: 23, fontSize: 16 },
  heading: { color: Colors.text, lineHeight: 23, fontSize: 16, fontWeight: '800' },
  bold: { fontWeight: '800' },
  code: { color: Colors.primary, fontSize: 14 },
  listMarker: { color: Colors.primary, fontWeight: '800' },
});
