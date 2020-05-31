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

  const isSameIdentifier = (a:NodePath<any>, b:NodePath<any>):boolean => {
    if (a.isIdentifier() && b.isIdentifier()) {
      if (a.node.name === b.node.name) {
        return  true;
      }
    }

    if (a.isThisExpression() && b.isThisExpression()) {
      return true;
    }

    if (a.isMemberExpression() && b.isMemberExpression()) {
      if (a.node.property.name === b.node.property.name) {
        if (a.node.object.type === b.node.object.type) {
          return isSameIdentifier(a.get("object"), b.get("object"));
        }
      }
    }
    return false;
  }

  const isIdentifierInJSXAttribute = (path: NodePath<t.LVal> | NodePath<t.Expression>) => {
    let isRefered = false;
    const MyVisitor = {
      JSXAttribute(JSXAttributePath: NodePath<t.JSXAttribute>) {
        if (!t.isJSXExpressionContainer(JSXAttributePath.node.value)) return;
        const expression = JSXAttributePath.get('value.expression');
        if (Array.isArray(expression)) return;

        if (isSameIdentifier(expression, path)) {
          isRefered = true;
          return;
        }
      }
    };
    program.traverse(MyVisitor)
    return isRefered;
  }

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
            const lastImportDeclaration = program
              .get('body')
              .filter((p) => p.isImportDeclaration())
              .pop();
            if (lastImportDeclaration) {
              lastImportDeclaration.insertAfter(generateEventCallbackImport());
            } else {
              program.get('body')[0].insertBefore(generateEventCallbackImport());
            }
          }
        },
      },

      // Add useEventCallback() for all inline functions
      JSXAttribute(path: NodePath<t.JSXAttribute>) {
        if (!t.isJSXExpressionContainer(path.node.value)) return;

        const expression = path.get('value.expression');
        if (Array.isArray(expression)) return;

        // wrap arrowFunction with useEventCallback()
        if (expression.isArrowFunctionExpression()) {
          expression.replaceWith(t.callExpression(t.identifier('useEventCallback'), [expression.node]));
          isEventCallBack = true;
        }

        // replace useCallback() to useEventCallback()
        if (expression.isCallExpression()) {
          if (t.isIdentifier(expression.node.callee, { name: 'useCallback' })) {
            expression.replaceWith(t.callExpression(t.identifier('useEventCallback'), [expression.node.arguments[0]]));
            isEventCallBack = true;
          }
        }
      },

      // ToDo: Wrap with useEventCallback() when arrowFunction defined in VariableDeclaration or AssinmentExpression, which referred to as JSXAttribute.
      VariableDeclarator(path: NodePath<t.VariableDeclarator>){
        const init = path.get('init');
        if (init.isArrowFunctionExpression()) {
          const id = path.get('id');
          if (isIdentifierInJSXAttribute(id)) {
            init.replaceWith(t.callExpression(t.identifier('useEventCallback'), [init.node]));
            isEventCallBack = true;
          }
        }
      },

      AssignmentExpression(path: NodePath<t.AssignmentExpression>){
        if (path.node.operator !== "=")return;


        const right = path.get('right');
        if (right.isArrowFunctionExpression()) {
          const left = path.get('left');
          if (isIdentifierInJSXAttribute(left)) {
            right.replaceWith(t.callExpression(t.identifier('useEventCallback'), [right.node]));
            isEventCallBack = true;
          }
        }
      }
    },
  };
};
