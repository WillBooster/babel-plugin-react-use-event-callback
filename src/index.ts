import generate from '@babel/generator';
import { parse as superParse, ParserOptions } from '@babel/parser';
import { PluginObj, NodePath } from '@babel/core';
import { Scope } from '@babel/traverse';
import * as t from '@babel/types';

export default (): PluginObj => {
  // JSX elements that should have their own scope with React.createElement()
  const jsxElementsToWrap = new Set();
  let parserOpts: ParserOptions;

  // Original parse + provided options
  const parse = (code: string): t.File => {
    return superParse(code, parserOpts);
  };

  const getAllOwnBindings = (scope: Scope): any => {
    const allBindings: any = scope.getAllBindings();

    return Object.keys(allBindings).reduce((ownBindings: any, bindingName: string) => {
      const binding = allBindings[bindingName];

      if (scope.hasOwnBinding(bindingName)) {
        ownBindings[bindingName] = binding;
      }

      return ownBindings;
    }, {});
  };

  // Return a unique list
  const getValueExpressions = (parentPath: NodePath<any>): any[] => {
    const values: any[] = [];

    parentPath.traverse({
      // First collect root identifiers
      Identifier: {
        enter(path: NodePath<t.Identifier>) {
          // Unique identifier
          if (values.includes(path.node.name)) return;
          // Not global
          if (!parentPath.scope.hasBinding(path.node.name)) return;

          // Not one of the function parameters, if it's a function
          if (
            parentPath.node.params &&
            parentPath.node.params.some((param: any) => {
              return param.name === path.node.name;
            })
          ) {
            return;
          }

          values.push(path.node.name);
        },
      },

      // Once the root identifier has been collected, look at its member expressions
      MemberExpression: {
        exit(path) {
          // Much easier to go through the string in this case
          const expressionString = generate(path.node).code;

          // Include expressions which only use . and not []
          if (/[^.$\w]/.test(expressionString)) return;

          const rootIdentifier = expressionString.split('.')[0];

          if (!values.includes(rootIdentifier)) return;
          if (values.includes(expressionString)) return;

          values.push(expressionString);
        },
      },
    });

    return values;
  };

  // Arrow function or regular function
  const isAnyFunctionExpression = (node: t.Node): boolean => {
    return node && (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node));
  };

  // If expression ends up with a useXXX()
  const isReactHook = (node: t.Node): boolean => {
    return /^use/.test((node as any).name) || /^use/.test((node as any).property.name);
  };

  // Example output: const foo = useCallback(() => alert(text), [text])
  const generateCallback = (callbackName: string, callbackBody: NodePath<any>): t.Statement => {
    const values = getValueExpressions(callbackBody);
    const generatedCallback = generate(callbackBody.node);
    return parse(`
      const ${callbackName} = React.useEventCallback(${generatedCallback.code}, [${values}])
    `).program.body[0];
  };

  // Checks if given JSX element is wrapped with the function above
  const isWrappedWithCreateElement = (path: NodePath): boolean => {
    let currPath = path;
    if (!currPath || !t.isJSXElement(currPath.node)) return false;
    currPath = currPath.parentPath;
    if (!currPath || !t.isReturnStatement(currPath.node)) return false;
    currPath = currPath.parentPath;
    if (!currPath || !t.isBlockStatement(currPath.node)) return false;
    currPath = currPath.parentPath;
    if (!currPath || !t.isArrowFunctionExpression(currPath.node)) return false;
    currPath = currPath.parentPath;
    if (!currPath || !t.isLogicalExpression(currPath.node)) return false;
    currPath = currPath.parentPath;
    if (!currPath || !t.isAssignmentExpression(currPath.node)) return false;
    currPath = currPath.parentPath;
    if (!currPath || !t.isCallExpression(currPath.node)) return false;

    return (
      t.isMemberExpression(currPath.node.callee) &&
      (currPath.node.callee.object as any).name === 'React' &&
      currPath.node.callee.property.name === 'createElement'
    );
  };

  return {
    pre({ opts }) {
      // Store original parse options
      parserOpts = opts.parserOpts;
    },

    visitor: {
      // Add useCallback() for all inline functions
      JSXAttribute(path: NodePath<any>) {
        if (!t.isJSXExpressionContainer(path.node.value)) return;
        if (!isAnyFunctionExpression(path.node.value.expression)) return;

        let rootJSXElement: NodePath<t.Node> = path.parentPath.parentPath;
        while (t.isJSXElement(rootJSXElement.parentPath)) {
          rootJSXElement = rootJSXElement.parentPath;
        }

        // Wrap root JSXElement with React.createElement(). This way we can have an inline
        // scope for internal hooks
        if (!isWrappedWithCreateElement(rootJSXElement)) {
          jsxElementsToWrap.add(rootJSXElement);

          // We escape now, but we should be back again at the second round of traversal
          // after replacement at visitor.JSXElement
          return;
        }

        let returnStatement: NodePath<any> = path;
        while (returnStatement && !t.isReturnStatement(returnStatement)) {
          returnStatement = returnStatement.parentPath;

          if (t.isJSXExpressionContainer(returnStatement)) return;
        }

        if (!returnStatement) return;
        if (!isAnyFunctionExpression(returnStatement.parentPath.parentPath.node)) return;

        const callbackName = path.scope.generateUidIdentifier(path.node.name.name).name;
        const callbackBody = path.get('value.expression');
        if (Array.isArray(callbackBody)) return;
        const callback = generateCallback(callbackName, callbackBody);

        callbackBody.replaceWithSourceString(callbackName);
        returnStatement.insertBefore(callback);
      },

      // For all *final* return statements, go through all const declarations
      // and replace them with useCallback() or useMemo()
      ReturnStatement(path) {
        if (!t.isJSXElement(path.node.argument)) return;
        // Will ignore block scoped return statements e.g. wrapped by if {}
        if (!isAnyFunctionExpression(path.parentPath.parentPath.node)) return;

        const ownBindings = getAllOwnBindings(path.scope);

        Object.keys(ownBindings).forEach((bindingName) => {
          const binding = ownBindings[bindingName];

          if (!binding.constant) return;
          if (!t.isVariableDeclarator(binding.path.node)) return;
          if (t.isCallExpression(binding.path.node.init) && isReactHook(binding.path.node.init.callee)) {
            return;
          }

          if (!isAnyFunctionExpression(binding.path.node.init)) return;

          const wrappedAssignment = generateCallback(bindingName, binding.path.get('init'));

          binding.path.parentPath.replaceWith(wrappedAssignment);
        });
      },
    },
  };
};
