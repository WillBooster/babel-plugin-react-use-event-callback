import { PluginObj, NodePath } from '@babel/core';
import * as t from '@babel/types';

export default (): PluginObj => {
  // JSX elements that should have their own scope with React.createElement()

  return {
    visitor: {
      // Add useEventCallback() for all inline functions
      JSXAttribute(path: NodePath<any>) {
        if (!t.isJSXExpressionContainer(path.node.value)) return;

        const expression = path.get('value.expression');
        if (Array.isArray(expression)) return;

        const expressionNode = expression.node;
        if (t.isArrowFunctionExpression(expression)) {
          expression.replaceWith(t.callExpression(t.identifier('useEventCallback'), [expressionNode]));
        }

        if (t.isCallExpression(expression)) {
          if (t.isIdentifier(expressionNode.callee, { name: 'useCallback' })) {
            expression.replaceWith(t.callExpression(t.identifier('useEventCallback'), [expressionNode.arguments[0]]));
          }
        }
      },
    },
  };
};
