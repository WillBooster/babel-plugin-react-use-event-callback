import * as babel from '@babel/core';
import jsxPlugin from '@babel/plugin-syntax-jsx';
import expect from 'expect';
import useCallbackPlugin from '.';

describe('babel-plugin-react-use-event-callback', () => {
  it('should replace defined arrow functions', () => {
    const code = transform(`
      () => {
        const callback = () => {
          alert('clicked')
        }

        return (
          <button onClick={callback} />
        )
      }
    `);

    expect(code).toEqual(
      freeText(`
      import useEventCallback from 'react-use-event-callback';

      () => {
        const callback = useEventCallback(() => {
          alert('clicked');
        });
        return <button onClick={callback} />;
      };
    `)
    );
  });

  it('should useEventCallback() for inline functions', () => {
    const code = transform(`
      () => {
        return (
          <button onClick={() => alert('clicked')} />
        )
      }
    `);

    expect(code).toEqual(
      freeText(`
      import useEventCallback from 'react-use-event-callback';

      () => {
        return <button onClick={useEventCallback(() => alert('clicked'))} />;
      };
    `)
    );
  });

  it('should NOT useEventCallback() for functions that do not return a JSX element', () => {
    const code = transform(`
      () => {
        const onLoad = () => {
          console.log("Hello")
        }

        window.onload = onLoad
      }
    `);

    expect(code).toEqual(
      freeText(`
      () => {
        const onLoad = () => {
          console.log("Hello");
        };

        window.onload = onLoad;
      };
    `)
    );
  });

  it('should replace useCallback() to useEventCallback()', () => {
    const code = transform(`
      () => {
        const callback = useCallback(() => {
          return x + y;
        }, [x, y]);

        return (
          <button title={callback} />
        )
      }
    `);

    expect(code).toEqual(
      freeText(`
      import useEventCallback from 'react-use-event-callback';

      () => {
        const callback = useEventCallback(() => {
          return x + y;
        });
        return <button title={callback} />;
      };
    `)
    );
  });

  it('should replace useCallback() to useEventCallback() even if its not refered', () => {
    const code = transform(`
      () => {
        const callback = useCallback(() => {
          alert('clicked')
        }, [])

        return (
          <button />
        )
      }
    `);

    expect(code).toEqual(
      freeText(`
      import useEventCallback from 'react-use-event-callback';

      () => {
        const callback = useEventCallback(() => {
          alert('clicked');
        });
        return <button />;
      };
    `)
    );
  });

  it('should work as example', () => {
    const code = transform(`
    let c = () => console.log("abc");
    let c1 = () => console.log("abc");
    class AAA {
      constructer() {
        this.b = () => console.log("abc");
        this.b1 = () => console.log("abc");
        const x = () => {
          c = () => console.log("abc");
          let c1 = () => console.log("abc");
        }
      }
      render(){
          const a = () => console.log("abc");
          const a1 = () => console.log("abc");
          const a2 = () => useCallback(() => {console.log(a)},[a]);
          return (
            <div>
              <button onClick={() => console.log("abc")} />
              <button onClick={a} />
              <button onClick={this.b} />
              <button onClick={c} />
              <button onClick={d} />
              <button onClick={ useCallback(() => {console.log(c)},[c])   } />
              <ul>
              </ul>
            </div>
          )
      }
    }
    `);

    expect(code).toEqual(
      freeText(`
      import useEventCallback from 'react-use-event-callback';
      let c = useEventCallback(() => console.log("abc"));

      let c1 = () => console.log("abc");

      class AAA {
        constructer() {
          this.b = useEventCallback(() => console.log("abc"));

          this.b1 = () => console.log("abc");

          const x = () => {
            c = useEventCallback(() => console.log("abc"));

            let c1 = () => console.log("abc");
          };
        }

        render() {
          const a = useEventCallback(() => console.log("abc"));

          const a1 = () => console.log("abc");

          const a2 = () => useEventCallback(() => {
            console.log(a);
          });

          return <div>
                    <button onClick={useEventCallback(() => console.log("abc"))} />
                    <button onClick={a} />
                    <button onClick={this.b} />
                    <button onClick={c} />
                    <button onClick={d} />
                    <button onClick={useEventCallback(() => {
              console.log(c);
            })} />
                    <ul>
                    </ul>
                  </div>;
        }

      }
    `)
    );
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
