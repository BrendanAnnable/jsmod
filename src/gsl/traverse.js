import { Types, TypeProperties } from './traverse_types';

/**
 * Produces an ES6 iterator which will iterate all children of a given AST.
 *
 * Includes the root element in the iteration.
 *
 * @param {!Element} ast A AST to traverse.
 * @param {(function(!Element): boolean)=} whileCallback An optional callback to stop traversal.
 * @returns {!Array<!Element>} Each element within the AST.
 */
export function* traverse(ast, whileCallback) {
  const stack = [];
  stack.push({ el: ast, parent: { el: null, path: [] } });
  while (stack.length > 0) {
    const { el, parent } = stack.pop();
    if (el == null) {
      continue;
    } else if (Array.isArray(el)) {
      for (let index = el.length - 1; index >= 0; index--) {
        stack.push({ el: el[index], parent: { el: parent.el, path: parent.path.concat([index]) } });
      }
    } else {
      const type = Types[el.type];
      const properties = TypeProperties[type];
      const item = { el, parent };
      yield item;
      if (whileCallback == null || whileCallback(item)) {
        for (let index = properties.length - 1; index >= 0; index--) {
          stack.push({ el: el[properties[index]], parent: { el, path: [properties[index]] } });
        }
      }
    }
  }
}

/**
 * Produces an ES6 iterator over the given elements children.
 *
 * Children are defined to be non-arrays, any array will be traversed deeply until the first non-array is found.
 *
 * @param {!Element} el The AST to produce children from.
 * @returns {!Array<!Element>} Each child element.
 */
export function* children(el) {
  const type = Types[el.type];
  const properties = TypeProperties[type];
  for (let index = properties.length - 1; index >= 0; index--) {
    const stack = [];
    stack.push({ el: el[properties[index]], parent: { el, path: [properties[index]] } });
    while (stack.length > 0) {
      const { el: child, parent } = stack.pop();
      if (child == null) {
        continue;
      } else if (Array.isArray(child)) {
        for (let childIndex = child.length - 1; childIndex >= 0; childIndex--) {
          stack.push({ el: child[childIndex], parent: { el: parent.el, path: parent.path.concat([childIndex]) } });
        }
      } else {
        yield { el: child, parent };
      }
    }
  }
}
