import * as babel from '@babel/core';
import jsxPlugin from '@babel/plugin-syntax-jsx';
import expect from 'expect';
import useCallbackPlugin from '.';

describe('babel-plugin-react-use-event-callback', () => {
  it('should replace useCallback with empty array', () => {
    const code = transform(`const handler = useCallback(() => { console.log('World'); }, []);`);

    expect(code).toEqual(freeText(`const handler = useEventCallback(() => { console.log('World'); });`));
  });

  it('should replace useCallback with array', () => {
    const code = transform(`const handler = useCallback(() => { console.log(value); }, [value]);`);

    expect(code).toEqual(freeText(`const handler = useEventCallback(() => { console.log(value); });`));
  });

  it('should useEventCallback() for callback functions', () => {
    const code = transform(`<button onClick={handleSendMyText}>Send</button>`);

    expect(code).toEqual(freeText(`<button onClick={useEventCallback(handleSendMyText)}>Send</button>`));
  });

  it('should provide useEventCallback() for inline functions', () => {
    const code = transform(`<button onClick={() => { console.log('Hello'); }}>Hello</button>`);

    expect(code).toEqual(
      freeText(`<button onClick={useEventCallback(() => { console.log('Hello'); })}>Hello</button>`)
    );
  });

  it('should replace useCallback for callback functions', () => {
    const code = transform(`<button onClick={useCallback(handleSendMyText, [])}>Send</button>`);

    expect(code).toEqual(freeText(`<button onClick={useEventCallback(handleSendMyText)}>Send</button>`));
  });

  it('should replace useCallback for inline callback functions', () => {
    const code = transform(`<button onClick={useCallback(() => { console.log('Hello'); }, [])}>Hello</button>`);

    expect(code).toEqual(
      freeText(`<button onClick={useEventCallback(() => { console.log('Hello'); })}>Hello</button>`)
    );
  });

  it('should useEventCallback() for callback functions', () => {
    const code = transform(`<button onClick={handler}>World</button>`);

    expect(code).toEqual(freeText(`<button onClick={useEventCallback(handler)}>World</button>`));
  });
});

// Todo : test case for add `import useEventCallback from 'react-use-event-callback'`;

const transform = (code: string): string | null | undefined => {
  const result = babel.transformSync(code, {
    plugins: [useCallbackPlugin, jsxPlugin],
    code: true,
    ast: false,
  });
  if (result != null) {
    return result.code;
  }
  return null;
};

// Will use the shortest indention as an axis
export const freeText = (text: string | Array<any>): string => {
  if (text instanceof Array) {
    text = text.join('');
  }

  // This will allow inline text generation with external functions, same as ctrl+shift+c
  // As long as we surround the inline text with ==>text<==
  text = text.replace(/( *)==>((?:.|\n)*?)<==/g, (match, baseIndent, content) => {
    return content
      .split('\n')
      .map((line: string) => `${baseIndent}${line}`)
      .join('\n');
  });

  const lines = text.split('\n');

  const minIndent = lines
    .filter((line) => line.trim())
    .reduce((minIndent: number, line: string) => {
      const result = line.match(/^ */);
      if (result != null) {
        const currIndent = result[0].length;
        return currIndent < minIndent ? currIndent : minIndent;
      }
      return 0;
    }, Infinity);

  return lines
    .map((line) => line.slice(minIndent))
    .join('\n')
    .trim()
    .replace(/\n +\n/g, '\n\n');
};
