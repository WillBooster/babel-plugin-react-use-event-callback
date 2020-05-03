import * as babel from '@babel/core';
import jsxPlugin from '@babel/plugin-syntax-jsx';
import expect from 'expect';
import useCallbackPlugin from '.';

describe('babel-plugin-react-use-event-callback', () => {
  it('should replace defined functions', () => {
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

  it('should useCallback() for inline functions', () => {
    const code = transform(`
      () => {
        return (
          <button onClick={() => alert('clicked')} />
        )
      }
    `);

    expect(code).toEqual(
      freeText(`
      let _anonymousFnComponent;

      import useEventCallback from 'react-use-event-callback';

      () => {
        return React.createElement(_anonymousFnComponent = _anonymousFnComponent || (() => {
          const _onClick = useEventCallback(() => alert('clicked'));

          return <button onClick={_onClick} />;
        }), null);
      };
    `)
    );
  });

  it('should provide useCallback() with the used arguments', () => {
    const code = transform(`
      ({ text }) => {
        return (
          <button onClick={() => alert(text)} />
        )
      }
    `);

    expect(code).toEqual(
      freeText(`
      let _anonymousFnComponent;

      import useEventCallback from 'react-use-event-callback';

      ({
        text
      }) => {
        return React.createElement(_anonymousFnComponent = _anonymousFnComponent || (() => {
          const _onClick = useEventCallback(() => alert(text));

          return <button onClick={_onClick} />;
        }), null);
      };
    `)
    );
  });

  it('should avoid specifying function arguments as useCallback() arguments', () => {
    const code = transform(`
      ({ text }) => {
        return (
          <button onClick={(e) => alert(text)} />
        )
      }
    `);

    expect(code).toEqual(
      freeText(`
      let _anonymousFnComponent;

      import useEventCallback from 'react-use-event-callback';

      ({
        text
      }) => {
        return React.createElement(_anonymousFnComponent = _anonymousFnComponent || (() => {
          const _onClick = useEventCallback(e => alert(text));

          return <button onClick={_onClick} />;
        }), null);
      };
    `)
    );
  });

  it('should NOT useCallback() for external functions', () => {
    const code = transform(`
      const onClick = () => {
        alert('clicked')
      }

      () => {
        return (
          <button onClick={onClick} />
        )
      }
    `);

    expect(code).toEqual(
      freeText(`
      const onClick = () => {
        alert('clicked');
      };

      () => {
        return <button onClick={onClick} />;
      };
    `)
    );
  });

  it('should NOT useCallback() for functions that do not return a JSX element', () => {
    const code = transform(`
      () => {
        const onLoad = () => {
          alert('loaded')
        }

        window.onload = onLoad
      }
    `);

    expect(code).toEqual(
      freeText(`
      () => {
        const onLoad = () => {
          alert('loaded');
        };

        window.onload = onLoad;
      };
    `)
    );
  });

  it('should create a scope and useCallback() for inline return statements', () => {
    const code = transform(`
      ({ history }) => (
        <button onClick={() => history.pop()} />
      )
    `);

    expect(code).toEqual(
      freeText(`
      let _anonymousFnComponent;

      import useEventCallback from 'react-use-event-callback';

      ({
        history
      }) => React.createElement(_anonymousFnComponent = _anonymousFnComponent || (() => {
        const _onClick = useEventCallback(() => history.pop());

        return <button onClick={_onClick} />;
      }), null);
    `)
    );
  });

  it('should create a scope and useCallback() for inline mapping functions under JSX blocks', () => {
    const code = transform(`
      ({ data, history }) => (
        <div>
          <button onClick={() => history.pop()} />
          <ul>
            {data.map(({ id, value }) => (
              <li key={id} onClick={() => history.push(\`/data/$\{id}\`)}>{value}</li>
            ))}
          </ul>
        </div>
      )
    `);

    expect(code).toEqual(
      freeText(`
      let _anonymousFnComponent, _anonymousFnComponent2;

      import useEventCallback from 'react-use-event-callback';

      ({
        data,
        history
      }) => React.createElement(_anonymousFnComponent2 = _anonymousFnComponent2 || (() => {
        const _onClick2 = useEventCallback(() => history.pop());

        return <div>
                <button onClick={_onClick2} />
                <ul>
                  {data.map(({
              id,
              value
            }) => React.createElement(_anonymousFnComponent = _anonymousFnComponent || (() => {
              const _onClick = useEventCallback(() => history.push(\`/data/$\{id}\`));

              return <li key={id} onClick={_onClick}>{value}</li>;
            }), {
              key: id
            }))}
                </ul>
              </div>;
      }), null);
    `)
    );
  });

  it('should create a scope and useCallback() for conditional statements with JSX elements', () => {
    const code = transform(`
      ({ foo }) => (
        <div>
          {foo ? (
            <button onClick={() => alert('foo')} />
          ) : (
            <button onClick={() => alert('not foo')} />
          )}
        </div>
      )
    `);

    expect(code).toEqual(
      freeText(`
      let _anonymousFnComponent, _anonymousFnComponent2;

      import useEventCallback from 'react-use-event-callback';

      ({
        foo
      }) => <div>
                {foo ? React.createElement(_anonymousFnComponent = _anonymousFnComponent || (() => {
          const _onClick = useEventCallback(() => alert('foo'));

          return <button onClick={_onClick} />;
        }), null) : React.createElement(_anonymousFnComponent2 = _anonymousFnComponent2 || (() => {
          const _onClick2 = useEventCallback(() => alert('not foo'));

          return <button onClick={_onClick2} />;
        }), null)}
              </div>;
    `)
    );
  });

  it('should transform inline functions for JSX elements in if statements', () => {
    const code = transform(`
      ({ foo }) => {
        if (foo) {
          return (
            <button onClick={() => alert('foo')} />
          )
        }

        return (
          <button onClick={() => alert('not foo')} />
        )
      }
    `);

    expect(code).toEqual(
      freeText(`
      let _anonymousFnComponent, _anonymousFnComponent2;

      import useEventCallback from 'react-use-event-callback';

      ({
        foo
      }) => {
        if (foo) {
          return React.createElement(_anonymousFnComponent = _anonymousFnComponent || (() => {
            const _onClick = useEventCallback(() => alert('foo'));

            return <button onClick={_onClick} />;
          }), null);
        }

        return React.createElement(_anonymousFnComponent2 = _anonymousFnComponent2 || (() => {
          const _onClick2 = useEventCallback(() => alert('not foo'));

          return <button onClick={_onClick2} />;
        }), null);
      };
    `)
    );
  });

  it('should NOT use hooks for let declarations', () => {
    const code = transform(`
      export default ({
        data,
        sortComparator,
        filterPredicate,
      }) => {
        let transformedData = []
        transformedData = data
          .filter(filterPredicate)
          .sort(sortComparator)

        return (
          <ul>
            {transformedData.map(d => <li>d</li>)}
          </ul>
        )
      }
    `);

    expect(code).toEqual(
      freeText(`
      export default (({
        data,
        sortComparator,
        filterPredicate
      }) => {
        let transformedData = [];
        transformedData = data.filter(filterPredicate).sort(sortComparator);
        return <ul>
                  {transformedData.map(d => <li>d</li>)}
                </ul>;
      });
    `)
    );
  });

  it('should NOT replace hooks declarations', () => {
    const code = transform(`
      () => {
        const callback = useMemo(() => {
          return x + y;
        }, [x, y])

        return (
          <button title={callback} />
        )
      }
    `);

    expect(code).toEqual(
      freeText(`
      () => {
        const callback = useMemo(() => {
          return x + y;
        }, [x, y]);
        return <button title={callback} />;
      };
    `)
    );
  });

  it('should replace useCallback declarations', () => {
    const code = transform(`
      () => {
        const callback = useCallback(() => {
          alert('clicked')
        }, [])

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

  it('should work as example', () => {
    const code = transform(`
    export default ({ data, sortComparator, filterPredicate, history }) => {
      const transformedData = data.filter(filterPredicate).sort(sortComparator)

      return (
        <div>
          <button className="back-btn" onClick={() => history.pop()} />
          <ul className="data-list">
            {transformedData.map(({ id, value }) => (
              <li className="data-item" key={id} onClick={() => history.push(\`data/\${id}\`)}>{value}</li>
            ))}
          </ul>
        </div>
      )
    }
    `);

    expect(code).toEqual(
      freeText(`
      let _anonymousFnComponent, _anonymousFnComponent2;

      import useEventCallback from 'react-use-event-callback';
      export default (({
        data,
        sortComparator,
        filterPredicate,
        history
      }) => {
        const transformedData = data.filter(filterPredicate).sort(sortComparator);
        return React.createElement(_anonymousFnComponent2 = _anonymousFnComponent2 || (() => {
          const _onClick2 = useEventCallback(() => history.pop());

          return <div>
                <button className="back-btn" onClick={_onClick2} />
                <ul className="data-list">
                  {transformedData.map(({
                id,
                value
              }) => React.createElement(_anonymousFnComponent = _anonymousFnComponent || (() => {
                const _onClick = useEventCallback(() => history.push(\`data/\${id}\`));

                return <li className="data-item" key={id} onClick={_onClick}>{value}</li>;
              }), {
                key: id
              }))}
                </ul>
              </div>;
        }), null);
      });
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
