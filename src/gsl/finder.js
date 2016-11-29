import { Map, OrderedSet } from 'immutable';
import { compareTrees } from './tree_comparison';
import { traverse, children } from './traverse';

export class Finder {
  /**
   * @param {?Element} ast The backing AST.
   * @param {!Map<string, Set<!Element>>} map A map of types to elements.
   * @param {!Map<string, !Element>} parentMap A map of elements to their parent elements.
   */
  constructor(ast = null, map = Map(), parentMap = Map()) {
    this.ast = ast;
    this.map = map;
    this.parentMap = parentMap;
  }

  /**
   * Generate a finder based off an AST.
   *
   * @param {!Element} ast The backing AST.
   * @returns {!Finder} A new Finder instance.
   */
  static of(ast) {
    const map = Map().asMutable();
    const parentMap = Map().asMutable();
    for (const { el, parent } of traverse(ast)) {
      const type = el.type;
      if (!map.has(type)) {
        map.set(type, OrderedSet().asMutable());
      }
      map.get(type).add(el);
      parentMap.set(el, parent);
    }
    for (const [type, set] of map.entries()) {
      map.set(type, set.asImmutable());
    }
    return new Finder(ast, map.asImmutable(), parentMap.asImmutable());
  }

  /**
   * @returns {!Array<!Element>} All elements within the AST.
   */
  all() {
    return this.map.valueSeq().flatten().toJS();
  }

  /**
   * @param {string} type The type to filter by.
   * @returns {!Array<!Element>} All elements within the AST of the given type.
   */
  findByType(type) {
    return (this.map.get(type) || OrderedSet()).toJS();
  }

  /**
   * @param {!Element} el The element to get the parent of.
   * @returns {?Element|undefined} The parent if found, null otherwise.
   */
  getParent(el) {
    const parent = this.parentMap.get(el);
    return (parent && parent.el) || null;
  }

  /**
   * @param {!Element} el The element to get the path of.
   * @returns {!Path} The property path array of the element within the AST.
   */
  getPath(el) {
    if (el == null) {
      return [];
    }
    const parent = this.parentMap.get(el);
    if (parent == null) {
      throw Error('No parent exists for element');
    }
    return this.getPath(parent.el).concat(parent.path);
  }

  /**
   * @param {!Element} el The element to search for.
   * @returns {boolean} True if the element is in the AST, false otherwise.
   */
  has(el) {
    return this.parentMap.has(el);
  }

  /**
   * @param {!Element} newAst A new AST.
   * @returns {Finder} A new Finder for the given AST.
   */
  update(newAst) {
    if (this.ast === newAst) {
      // Nothing has changed.
      return this;
    }
    if (this.ast == null) {
      return Finder.of(newAst);
    }
    const { additions, deletions } = compareTrees(this, newAst);
    // Mutate locally for performance.
    const newMap = this.map.asMutable();
    const newParentMap = this.parentMap.asMutable();
    for (const item of deletions) {
      newMap.update(item.el.type, set => set.delete(item.el));
      newParentMap.delete(item.el);
    }
    for (const item of additions) {
      newMap.update(item.el.type, OrderedSet(), set => set.add(item.el));
      newParentMap.set(item.el, item.parent);
      for (const child of children(item.el)) {
        newMap.update(child.el.type, OrderedSet(), set => set.add(child.el));
        newParentMap.set(child.el, child.parent);
      }
    }
    return new Finder(newAst, newMap.asImmutable(), newParentMap.asImmutable());
  }
}
