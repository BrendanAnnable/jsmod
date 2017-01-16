import assert from 'assert';
import { Finder } from './finder';
import { parser } from './parser';

/**
 * @param {string} gsl A GSL selector string.
 * @param {!Element} ast An AST to search.
 * @param {?Element|undefined} subjectScope An optional scope, filtering matches to only descendants of this element.
 * @returns {!Array<!Element>} An array of matched elements.
 */
export function astQuerySelector(gsl, ast, subjectScope = null) {
  return querySelector(gsl, Finder.of(ast), subjectScope);
}

/**
 * @param {string} gsl A GSL selector string.
 * @param {!Finder} finder The finder to use for quick lookup.
 * @param {?Element|undefined} subjectScope An optional scope, filtering matches to only descendants of this element.
 * @param {boolean} inclusive Whether to include subjectScope in the potential matches.
 * @returns {!Array<!Element>} An array of matched elements.
 */
export function querySelector(gsl, finder, subjectScope = null, inclusive = false) {
  return querySelect(parser.parse(gsl).selectors);

  /**
   * @param {!Array<!SelectorType>} selectors An array of selectors to search with.
   * @param {?Element|undefined} ancestorScope An optional scope, preventing ancestor search above this element.
   * @returns {!Array<!Element>} An array of matched elements.
   */
  function querySelect(selectors, ancestorScope = null) {
    let els = selectors
      .map(selector => select(selector, ancestorScope))
      .reduce((list, el) => list.concat(el), []);
    els = subjectScope && subjectScope !== finder.ast ? els.filter(el => isChildOf(el, subjectScope, inclusive)) : els;
    return els;
  }

  /**
   * @param {!Element} el The element to check.
   * @param {?Element|undefined} ancestor The ancestor to check the element is a child of.
   * @param {boolean} ancestorInclusive Whether el can equal the given ancestor.
   * @returns {boolean} True if el is a child of ancestor, false otherwise.
   */
  function isChildOf(el, ancestor, ancestorInclusive = false) {
    if (el == null) {
      return false;
    } else if (ancestor == null) {
      return true;
    } else if (el === ancestor) {
      return ancestorInclusive;
    } else {
      return isChildOf(finder.getParent(el), ancestor, true);
    }
  }

  /**
   * @param {!SelectorType} selector A GSL selector.
   * @param {?Element|undefined} ancestorScope An optional scope, preventing ancestor search above this element.
   * @returns {!Array<!Element>} An array of matched elements.
   */
  function select(selector, ancestorScope) {
    const handlers = {
      [Selector.SimpleSelector]:       simpleSelector,
      [Selector.DescendantCombinator]: combinatorSelector,
      [Selector.ChildCombinator]:      combinatorSelector
    };
    const handler = handlers[selector.type];
    assert(handler, `Unsupported selector ${selector.type}`);
    return handler(selector, ancestorScope);
  }

  /**
   * @param {!SelectorType} selector A GSL selector.
   * @param {?Element|undefined} ancestorScope An optional scope, preventing ancestor search above this element.
   * @returns {!Array<!Element>} An array of matched elements.
   */
  function simpleSelector(selector, ancestorScope) {
    const type = selector.element ? selector.element.name : null;
    let els = find(type);
    els = ancestorScope ? els.filter(el => isChildOf(el, ancestorScope)) : els;
    els = selector.attributes.length > 0 ? els.filter(el => hasAttributes(el, selector.attributes)) : els;
    els = selector.pseudos.length > 0 ? els.filter(el => hasPseudos(el, selector.pseudos)) : els;
    return els;
  }

  /**
   * @param {?string|undefined} type An optional element type to filter by.
   * @returns {!Array<!Element>} An array of all elements.
   */
  function find(type) {
    if (type) {
      return finder.findByType(type);
    } else {
      return finder.all();
    }
  }

  /**
   * @param {!Element} el The element to check.
   * @param {!Array<!AttributeSelector>} attributes The attribute selectors to ensure the element has.
   * @returns {boolean} True if the element has the given attribute selectors, false otherwise.
   */
  function hasAttributes(el, attributes) {
    const handlers = {
      [Attribute.HasAttribute]:              value        => value !== undefined,
      [Attribute.ExactValueAttribute]:      (value, attr) => value === attr.value.value,
      [Attribute.ExactNotValueAttribute]:   (value, attr) => value !== attr.value.value,
      [Attribute.FuzzyValueAttribute]:      (value, attr) => value && value.split(' ').includes(attr.value.value),
      [Attribute.StartsWithValueAttribute]: (value, attr) => value && value.startsWith(attr.value.value),
      [Attribute.EndsWithValueAttribute]:   (value, attr) => value && value.endsWith(attr.value.value),
      [Attribute.ContainsValueAttribute]:   (value, attr) => value && value.includes(attr.value.value)
    };

    return attributes.every(attribute => {
      const attributePath = attribute.attribute.path.map(part => part.name);
      const value = getIn(el, attributePath);
      const handler = handlers[attribute.type];
      assert(handler, `Invalid attribute type ${attribute.type}`);
      return handler(value, attribute);
    });
  }

  /**
   * @param {!Object} item A collection
   * @param {!Path} path A path to value.
   * @returns {*} The value
   */
  function getIn(item, path) {
    return (path || []).reduce(function(cur, key) {
      if (!cur) {
        return undefined;
      }
      return cur[key];
    }, item);
  }

  /**
   * @param {!Element} el The element to check.
   * @param {!Array<!PseudoSelector>} pseudos The psudo selectors to ensure the element has.
   * @returns {boolean} True if the element has the given pseudo selectors, false otherwise.
   */
  function hasPseudos(el, pseudos) {
    const handlers = {
      [Pseudo.HasPseudo]: hasPseudo
    };

    return pseudos.every(pseudo => {
      const handler = handlers[pseudo.type];
      assert(handler, `Invalid pseudo type ${pseudo.type}`);
      return handler(el, pseudo);
    });
  }

  /**
   * @param {!Element} el The element to check.
   * @param {!PseudoSelector} pseudo The pseudo selector to ensure the element has.
   * @returns {boolean} True if the element has the given pseudo selector, false otherwise.
   */
  function hasPseudo(el, pseudo) {
    return querySelect(pseudo.selectors, el).length > 0;
  }

  /**
   * @param {!CombinatorSelector} combinator The combinator selector.
   * @param {?Element|undefined} ancestorScope An optional scope, preventing ancestor search above this element.
   * @returns {!Array<!Element>} An array of all matching elements.
   */
  function combinatorSelector(combinator, ancestorScope) {
    const candidates = simpleSelector(combinator.right, ancestorScope);
    return candidates.filter(candidate => combinatorFilter(combinator.type, combinator.left, candidate, ancestorScope));
  }

  /**
   *
   * @param {string} type The parent combinator type.
   * @param {!CombinatorSelector} combinator The left combinator.
   * @param {!Element} el The element to check.
   * @param {?Element|undefined} ancestorScope An optional scope, preventing ancestor search above this element.
   * @returns {boolean} True if the element matches the given combinator, false otherwise.
   */
  function combinatorFilter(type, combinator, el, ancestorScope) {
    const parent = finder.getParent(el);
    switch (type) {
      case Selector.DescendantCombinator: {
        if (combinator.type === 'SimpleSelector') {
          const ancestor = closest(combinator.element.name, parent, ancestorScope);
          return ancestor && isChildOf(ancestor, ancestorScope);
        } else {
          const ancestor = closest(combinator.right.element.name, parent, ancestorScope);
          return ancestor && isChildOf(ancestor, ancestorScope) && combinatorFilter(combinator.type, combinator.left, ancestor, ancestorScope);
        }
      }
      case Selector.ChildCombinator: {
        const parentWithinScope = isChildOf(parent, ancestorScope);
        if (combinator.type === 'SimpleSelector') {
          return parentWithinScope && parent.type === combinator.element.name;
        } else {
          return parentWithinScope && parent.type === combinator.right.element.name
            && combinatorFilter(combinator.type, combinator.left, parent, ancestorScope);
        }
      }
      default:
        throw new Error(`Bad type: ${combinator.type}`);
    }
  }

  /**
   * @param {string} type The type of parent to find.
   * @param {!Element} el The element to start the search from.
   * @param {?Element|undefined} ancestorScope An optional scope, preventing ancestor search above this element.
   * @returns {?Element|undefined} The cloeset ancestor with the given type.
   */
  function closest(type, el, ancestorScope = null) {
    if (el == null) {
      return false;
    } else if (el !== ancestorScope && el.type === type) {
      return el;
    } else {
      const parent = finder.getParent(el);
      return closest(type, parent, ancestorScope);
    }
  }
}


const Attribute = {
  HasAttribute: 'HasAttribute',
  ExactValueAttribute: 'ExactValueAttribute',
  ExactNotValueAttribute: 'ExactNotValueAttribute',
  FuzzyValueAttribute: 'FuzzyValueAttribute',
  StartsWithValueAttribute: 'StartsWithValueAttribute',
  EndsWithValueAttribute: 'EndsWithValueAttribute',
  ContainsValueAttribute: 'ContainsValueAttribute'
};

const Selector = {
  SimpleSelector: 'SimpleSelector',
  DescendantCombinator: 'DescendantCombinator',
  ChildCombinator: 'ChildCombinator'
};

const Pseudo = {
  HasPseudo: 'HasPseudo'
};

/* eslint-disable no-unused-vars */
/**
 * @typedef {!Object} // TODO (Annable): Actually type this.
 */
let SelectorType;

/**
 * @typedef {!Object} // TODO (Annable): Actually type this.
 */
let CombinatorSelector;

/**
 * @typedef {!Object} // TODO (Annable): Actually type this.
 */
let AttributeSelector;

/**
 * @typedef {!Object} // TODO (Annable): Actually type this.
 */
let PseudoSelector;
/* eslint-enable no-unused-vars */
