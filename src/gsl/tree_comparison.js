import { traverse } from './traverse';

/**
 * @param {!Finder} oldFinder The old finder.
 * @param {!Element} newAst The new AST.
 * @returns {{
 *   additions: !Array<!Element>,
 *   deletions: !Array<!Element>
 * }} The added and deleted elements.
 */
export function compareTrees(oldFinder, newAst) {
  const newAndKnown = [...traverse(newAst, isNew)];
  const newAndKnownLookup = new Set(newAndKnown.map(item => item.el));

  const additions = newAndKnown.filter(isNew);
  const deletions = [...traverse(oldFinder.ast, item => !isKnown(item))].filter(item => !isKnown(item));

  /**
   * @param {{el: !Element}} item The item to check.
   * @returns {boolean} True if new, false otherwise.
   */
  function isNew(item) {
    return !oldFinder.has(item.el);
  }

  /**
   * @param {{el: !Element}} item The item to check.
   * @returns {boolean} True if known, false otherwise.
   */
  function isKnown(item) {
    return newAndKnownLookup.has(item.el);
  }

  return { additions, deletions };
}
