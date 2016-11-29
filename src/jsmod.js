import Baobab from 'baobab';
import assert from 'assert';
import recast from 'recast';
import { Finder } from './gsl/finder';
import { querySelector } from './gsl/gsl';

/**
 * An immutable class representing an AST and a collection of matched elements.
 */
class JSMod {
  /**
   * @private
   * @param {!Element} ast The abstract syntax tree (AST).
   * @param {!Baobab} tree The baobab tree.
   * @param {!Finder} finder The finder to use for fast lookup.
   * @param {!Array<!Element>} selection The current selection of elements.
   * @param {!Array<!Array<!Element>>} selectionStack The stack of previous selections to rollback with .end().
   */
  constructor(ast, tree, finder, selection, selectionStack = []) {
    /**
     * @public
     * @const
     * @type {!Element}
     */
    this.ast = ast;

    /**
     * @public
     * @const
     * @type {!Baobab}
     */
    this.tree = tree;

    /**
     * @public
     * @const
     * @type {number}
     */
    this.length = selection.length;

    /**
     * @private
     * @const
     * @type {!Finder}
     */
    this.finder = finder;

    /**
     * The current selection within the AST.
     *
     * @private
     * @const
     * @type {!Array<!Element>}
     */
    this.selection = selection;

    /**
     * The selection stack is used to chain method calls with .end(), such that mutations can happen at different
     * selections within the same chained flow.
     *
     * The selection stack makes this possible by keeping track of all the previous tree selections. Each .end() call
     * will pop the latest selection off the stack and return a new instance with that selection.
     *
     * @private
     * @const
     * @type {!Array<!Array<Element>>}
     */
    this.selectionStack = selectionStack;
  }

  /**
   * @public
   * @param {!Element} ast The AST.
   * @returns {!JSMod} A JSMod instance.
   */
  static of(ast) {
    const tree = new Baobab(ast);
    const selection = [tree.select()];
    return new JSMod(ast, tree, new Finder(), selection);
  }

  /**
   * @public
   * @param {!Path} key A property path to set.
   * @param {*=} newValue A value to set the property to.
   * @returns {!JSMod|*} A value at the given path, or a new JSMod instance reflecting the updated value.
   */
  attr(key, newValue) {
    const path = Array.isArray(key) ? key : [key];

    if (newValue === undefined) {
      assert(this.selection.length > 0, 'Cannot call .attr() on an empty set');
      return this.selection[0].get(path);
    }

    this.selection.forEach(selection => {
      const el = selection.get();
      const oldValue = selection.get(path);
      const realValue = typeof newValue === 'function' ? newValue(oldValue, el) : newValue;
      selection.set(path, realValue);
    });

    return this.newRoot();
  }

  /**
   * @public
   * @param {string} selector A GSL selector string.
   * @returns {!JSMod} A new JSMod instance containing the closest ancestors which match the given selector.
   */
  closest(selector) {
    const newFinder = this.finder.update(this.tree.get());
    const els = JSMod.unique(this.selection
      .map(cursor => this.getMatchingParent(selector, cursor.get(), newFinder))
      .filter(el => !!el));
    const selection = els.map(el => this.tree.select(newFinder.getPath(el)));
    return this.addToStack(selection, newFinder);
  }

  /**
   * @private
   * @param {string} selector A GSL selector string.
   * @param {!Element} el The element to search from.
   * @param {!Finder} finder The finder to use.
   * @returns {?Element} An ancestor element which matches the selector, or null if not found.
   */
  getMatchingParent(selector, el, finder) {
    if (!el) {
      return null;
    }
    const matches = querySelector(selector, finder, el, true);
    if (matches.length > 0) {
      return el;
    }
    return this.getMatchingParent(selector, finder.getParent(el), finder);
  }

  /**
   * @public
   * @param {!function(!Element): !Element} fn A function to be called for each matched element. The return value will replace each element.
   * @returns {!JSMod} A new JSMod instance reflecting the updated values.
   */
  replaceWith(fn) {
    this.selection.forEach(cursor => {
      const item = new JSMod(this.tree.get(), this.tree, this.finder, [cursor]);
      const value = fn(item);
      cursor.set(value instanceof JSMod ? value.get(0) : value);
    });
    return this.newRoot();
  }

  /**
   * @public
   * @param {!Path=} path An optional path to an element or property to remove.
   * @returns {!JSMod} Remove the selected elements and automatically call .end().
   */
  remove(path = []) {
    this.selection.forEach(cursor => {
      cursor.unset(path);
    });
    if (path.length > 0) {
      return this.newRoot();
    } else {
      return this.end();
    }
  }

  /**
   * Return to the last selection before a filtering call was made. Filtering calls are those which may reduce the
   * matched element set, e.g. .filter(), .find(), .first(), last() etc
   *
   * jsmod(program)
   *   .find('MemberExpression')
   *     .find('Identifier[name^="Foo"]')
   *       .attr('name', 'Bar')
   *     .end()
   *     .find('Identifier[name^="Cat"]')
   *       .attr('name', 'Dog')
   *     .end()
   *   .end()
   *   .find('Literal')
   *     .attr('value', 'Baz')
   *   .end();
   *
   * @public
   * @returns {!JSMod} Returns a new JSMod instance with the last selection before a filtering call was made.
   */
  end() {
    assert(this.selectionStack.length > 0, 'Must not call .end() when stack is empty.');
    const oldSelection = this.selectionStack[this.selectionStack.length - 1];
    const oldStack = this.selectionStack.slice(0, this.selectionStack.length - 1);
    return new JSMod(this.tree.get(), this.tree, this.finder, oldSelection, oldStack);
  }

  /**
   * @public
   * @returns {!JSMod} A new JSMod instance which only has the last element selected.
   */
  last() {
    return this.addToStack([this.selection[this.length - 1]] || [], this.finder);
  }

  /**
   * @public
   * @param {function(!JSMod, number, !JSMod): boolean} fn A function to call on each iteration.
   * @param {*=} thisArg Optional. Value to use as this when executing callback.
   * @returns {!JSMod} A new JSMod instance with only the filtered elements selected.
   */
  filter(fn, thisArg) {
    // TODO (Annable): support selector filtering
    return this.addToStack(this.selection.filter((cursor, index) => {
      const item = new JSMod(this.tree.get(), this.tree, this.finder, [cursor]);
      return fn.call(thisArg, item, index, this);
    }), this.finder);
  }

  /**
   * @public
   * @param {function(!Element, number, !JSMod)} fn A function to call on each iteration.
   * @param {*=} init An init value to use.
   * @param {*=} thisArg Optional. Value to use as this when executing callback.
   * @returns {*} The reduced result.
   */
  reduce(fn, init, thisArg) {
    return this.selection.reduce((accumulator, cursor, index) => {
      const item = new JSMod(this.tree.get(), this.tree, this.finder, [cursor]);
      return fn.call(thisArg, accumulator, item, index, this);
    }, init);
  }

  /**
   * Search for all matching elements which are descendants of the currently matched elements.
   *
   * @public
   * @param {string} selector A GSL selector string.
   * @returns {!JSMod} A new JSMod instance with all matching elements.
   */
  find(selector) {
    const newFinder = this.finder.update(this.tree.get());
    const selection = JSMod.unique(this.mapSelector(selector, newFinder).reduce((list, el) => list.concat(el), []))
      .map(el => this.tree.select(newFinder.getPath(el)));
    return this.addToStack(selection, newFinder);
  }

  /**
   * @public
   * @returns {!JSMod} A new JSMod instance which only has the first element selected.
   */
  first() {
    return this.addToStack([this.selection[0]] || [], this.finder);
  }

  /**
   * This function is purely here for chaining convienience. Since JSMod instances are immutable, this method can only
   * be used to produce external side-effects (such as logging). Instead use map, replace or attr to modify the AST.
   *
   * @public
   * @param {function(!Element, number, !JSMod)} fn Function to execute for each element.
   * @param {*=} thisArg Optional. Value to use as this when executing callback.
   * @returns {!JSMod} The current JSMod instance.
   */
  forEach(fn, thisArg) {
    this.selection.forEach((cursor, index) => {
      const item = new JSMod(this.tree.get(), this.tree, this.finder, [cursor]);
      fn.call(thisArg, item, index, this);
    });
    return this;
  }

  /**
   * Get the element at the given index.
   *
   * @public
   * @param {number} index The index which to get.
   * @returns {?Element|undefined} The element at the given index.
   */
  get(index) {
    return (this.selection[index] && this.selection[index].get()) || undefined;
  }

  getAst() {
    return this.ast;
  }

  toSource(options) {
    return recast.print(this.ast, options).code;
  }

  /**
   * @public
   * @param {string} selector A GSL selector string.
   * @returns {boolean} True if the any of the selected elements match the given selector, false otherwise.
   */
  is(selector) {
    return this.mapSelector(selector, this.finder, true).some(list => list.length > 0);
  }

  /**
   * Produce an array of values mapping to each matched element.
   *
   * @public
   * @param {function(!Element, number, !JSMod)} fn A function to call on each iteration.
   * @param {*=} thisArg Optional. Value to use as this when executing callback.
   * @returns {!Array<*>} An array of values.
   */
  map(fn, thisArg) {
    return this.selection.map((cursor, index) => {
      const item = new JSMod(this.tree.get(), this.tree, this.finder, [cursor]);
      return fn.call(thisArg, item, index, this);
    });
  }

  /**
   * @public
   * @param {string} selector A GSL selector string.
   * @returns {!JSMod} A new JSMod instance which has filtered out any elements which do not match the given selector.
   */
  not(selector) {
    const newSelection = this.selection.filter(cursor => !new JSMod(this.tree.get(), this.tree, this.finder, [cursor]).is(selector));
    return this.addToStack(newSelection, this.finder);
  }

  /**
   * @param {function(!JSMod, !JSMod): number} fn Specifies a function that defines the sort order.
   * @param {*=} thisArg Optional. Value to use as this when executing callback.
   * @returns {!JSMod} A new JSMod instance with the sorted elements.
   */
  sort(fn, thisArg) {
    const newValues = [...this.selection].sort((a, b) => {
      const itemA = new JSMod(this.ast, this.tree, this.finder, [a]);
      const itemB = new JSMod(this.ast, this.tree, this.finder, [b]);
      return fn.call(thisArg, itemA, itemB);
    }).map(cursor => cursor.get());
    this.selection.forEach((cursor, index) => {
      cursor.set(newValues[index]);
    });
    return this.newRoot();
  }

  /**
   * This function is purely here for chaining convienience. Since JSMod instances are immutable, this method can only
   * be used to produce external side-effects (such as logging). Instead use map, replace or attr to modify the AST.
   *
   * @public
   * @param {!function(!JSMod)} fn A function which will be called with the current JSMod instance.
   * @returns {!JSMod} The current JSMod instance.
   */
  tap(fn) {
    fn(this);
    return this;
  }

  /**
   * Return an array containing the matched elements.
   *
   * @public
   * @returns {!Array<!Element>} An array of the matched elements.
   */
  toArray() {
    return this.selection.map(selection => selection.get());
  }

  /**
   * @private
   * @param {string} selector A GSL selector string.
   * @param {!Finder} finder A finder.
   * @param {boolean} inclusive Whether to include the current selection as part of potential matches.
   * @returns {!Array<!Array<!Element>>} An array of selections.
   */
  mapSelector(selector, finder, inclusive = false) {
    return this.selection.map(selection => querySelector(selector, finder, selection.get(), inclusive));
  }

  /**
   * @private
   * @returns {!JSMod} A new JSMod instance using the new finder.
   */
  newRoot() {
    return new JSMod(this.tree.get(), this.tree, this.finder, this.selection, this.selectionStack);
  }

  /**
   * @private
   * @param {!Array<!Element>} list A list to make unique.
   * @returns {!Array<!Element>} A new unique list.
   */
  static unique(list) {
    // Imperative for performance.
    const seen = new Set();
    const uniqueList = [];
    for (const el of list) {
      if (!seen.has(el)) {
        uniqueList.push(el);
      }
      seen.add(el);
    }
    return uniqueList;
  }

  /**
   * @private
   * @param {!Array<!Element>} newSelection The new selection.
   * @param {!Finder} finder The current finder.
   * @returns {!JSMod} A new JSMod instance which has added the new selection to the stack.
   */
  addToStack(newSelection, finder) {
    return new JSMod(this.tree.get(), this.tree, finder, newSelection, this.selectionStack.concat([this.selection]));
  }
}

/**
 * @public
 * @param {!Element} ast The AST to manipulate, it will be frozen.
 * @returns {!JSMod} A JSMod instance encapulating the AST.
 */
export function jsmod(ast) {
  return JSMod.of(ast);
}

/* eslint-disable no-unused-vars */
/** @typedef {!Object} */
let Element;

/** @typedef {string|number|!Array<string|number>} */
let Path;
/* eslint-enable no-unused-vars */
