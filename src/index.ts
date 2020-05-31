import { PluginObj, NodePath } from '@babel/core';
import { parse as superParse, ParserOptions } from '@babel/parser';
import * as t from '@babel/types';

export default (): PluginObj => {
  let isEventCallBack: boolean;
  let parserOpts: ParserOptions;
  let program: NodePath<t.Program>;

  // Original parse + provided options
  const parse = (code: string): t.File => {
    return superParse(code, parserOpts);
  };

  const generateEventCallbackImport = (): t.ImportDeclaration => {
    const statement = parse(`import useEventCallback from 'react-use-event-callback';`).program.body[0];
    return statement as t.ImportDeclaration;
  };

  const insertEventCallbackImport = (): void => {
    const lastImportDeclaration = program
      .get('body')
      .filter((p) => p.isImportDeclaration())
      .pop();
    if (lastImportDeclaration) {
      lastImportDeclaration.insertAfter(generateEventCallbackImport());
    } else {
      program.get('body')[0].insertBefore(generateEventCallbackImport());
    }
  };

  const isSameIdentifier = (a: NodePath<any>, b: NodePath<any>): boolean => {
    if (a.isIdentifier() && b.isIdentifier()) {
      if (a.node.name === b.node.name) {
        return true;
      }
    }

    if (a.isThisExpression() && b.isThisExpression()) {
      return true;
    }

    if (a.isMemberExpression() && b.isMemberExpression()) {
      if (a.node.property.name === b.node.property.name) {
        if (a.node.object.type === b.node.object.type) {
          return isSameIdentifier(a.get('object'), b.get('object'));
        }
      }
    }
    return false;
  };

  const isIdentifierInJSXAttribute = (path: NodePath<t.LVal> | NodePath<t.Expression>): boolean => {
    let isRefered = false;
    program.traverse({
      JSXAttribute(JSXAttributePath: NodePath<t.JSXAttribute>) {
        if (!t.isJSXExpressionContainer(JSXAttributePath.node.value)) return;

        const exprPath = JSXAttributePath.get('value.expression');
        if (Array.isArray(exprPath)) return;

        if (isSameIdentifier(exprPath, path)) {
          isRefered = true;
          return;
        }
      },
    });
    return isRefered;
  };

  const replaceWithUseEventCallback = (path: NodePath, node?: t.Node): boolean => {
    node = node ? node : path.node;
    if (
      t.isExpression(node) ||
      t.isSpreadElement(node) ||
      t.isJSXNamespacedName(node) ||
      t.isArgumentPlaceholder(node)
    ) {
      path.replaceWith(t.callExpression(t.identifier('useEventCallback'), [node]));
      isEventCallBack = true;
    }
    return isEventCallBack;
  };

  return {
    pre({ opts }) {
      // Store original parse options
      parserOpts = opts.parserOpts;
    },
    visitor: {
      Program: {
        enter(path: NodePath<t.Program>) {
          isEventCallBack = false;
          program = path;
        },
        exit() {
          if (isEventCallBack) {
            insertEventCallbackImport();
          }
        },
      },

      // replace useCallback() to useEventCallback()
      CallExpression(path: NodePath<t.CallExpression>) {
        if (t.isIdentifier(path.node.callee, { name: 'useCallback' })) {
          replaceWithUseEventCallback(path, path.node.arguments[0]);
        }
      },

      // Add useEventCallback() for all inline functions
      JSXAttribute(path: NodePath<t.JSXAttribute>) {
        if (!t.isJSXExpressionContainer(path.node.value)) return;

        const exprPath = path.get('value.expression');
        if (Array.isArray(exprPath)) return;

        // wrap arrowFunction with useEventCallback()
        if (exprPath.isArrowFunctionExpression()) {
          replaceWithUseEventCallback(exprPath);
        }
      },

      // wrap arrowFunction value with useEventCallback() when it refered in JSXAttribute
      VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
        const init = path.get('init');
        if (init.isArrowFunctionExpression()) {
          const id = path.get('id');
          if (isIdentifierInJSXAttribute(id)) {
            replaceWithUseEventCallback(init);
          }
        }
      },

      // wrap arrowFunction value with useEventCallback() when it refered in JSXAttribute
      AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
        if (path.node.operator !== '=') return;

        const right = path.get('right');
        if (right.isArrowFunctionExpression()) {
          const left = path.get('left');
          if (isIdentifierInJSXAttribute(left)) {
            replaceWithUseEventCallback(right);
          }
        }
      },
    },
  };
};
