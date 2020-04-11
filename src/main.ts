import * as babel from '@babel/core';
import jsxPlugin from '@babel/plugin-syntax-jsx';
import useCallbackPlugin from './index';

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

{
  const code = transform(`<button onClick={() => { console.log('Hello'); }}>Hello</button>`);
  console.log(code, '\n');
}
{
  const code = transform(`<button onClick={handleSendMyText}>Send</button>`);
  console.log(code, '\n');
}
{
  const code = transform(`<button onClick={() => { console.log('Hello'); }}>Hello</button>`);
  console.log(code, '\n');
}
{
  const code = transform(`<button onClick={useCallback(handleSendMyText, [x])}>Send</button>`);
  console.log(code, '\n');
}
{
  const code = transform(`<button onClick={useCallback(() => { console.log('Hello'); }, [y,z])}>Hello</button>`);
  console.log(code, '\n');
}
{
  const code = transform(`
  const handler = useCallback(() => { console.log('World'); }, [x,y,z]);
  const elem = <button onClick={handler}>World</button>
  `);
  console.log(code, '\n');
}
