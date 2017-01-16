const recast = require('recast');

/**
 * @param {string} source The source code for the fragment.
 * @returns {!Array<!Element>} An array of elements representing the statements.
 */
export function fragments(source) {
  return recast.parse(source).program.body;
}

/**
 * @param {string} source The source code for the fragment.
 * @returns {!Element} The element of the first statement.
 */
export function fragment(source) {
  return fragments(source)[0];
}
