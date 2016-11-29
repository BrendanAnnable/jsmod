# JSMod [![Build Status](https://travis-ci.com/BrendanAnnable/jsmod.svg?token=wKbruTw5LY4t3eSFssqK&branch=master)](https://travis-ci.com/BrendanAnnable/jsmod)
An AST-based JavaScript refactoring tool. The guiding philosophy behind jsmod is that traversing and manipulating an [abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree) should be as familiar as traversing and manipulating the DOM tree. Heavily influenced by [jQuery](http://api.jquery.com/) and [jscodeshift](https://github.com/facebook/jscodeshift), JSMod features a powerful CSS-like selector engine alongside a chainable API for traversal and manipulation.

## Example usage

Update all object literals to use the shorthand notation.

### Input
```js
({foo: foo, bar: bar, baz: baz})
```

### Expected output

```js
({foo, bar, baz})
```

### Example jsmod transform

[Using the input AST for reference](http://astexplorer.net/#/vD1TZhlqtm), search for `Property` elements which have an indentical key and value and change the shorthand property to true.

```js
const { jsmod, fragment } = require('jsmod');

const ast = fragment`({foo: foo, bar: bar, baz: baz})`;

  // Helper functions
const isLongHand = el => el.attr('shorthand') === false;
const hasIdenticalKeyValue = el => el.attr(['key', 'name']) === el.attr(['value', 'name']);

const output = jsmod(ast)
    .find('ObjectExpression > Property')
    .filter(isLongHand)
    .filter(hasIdenticalKeyValue)
    .attr('shorthand', true)
    .toSource();

console.log(output);

```

JSMod can be run on across an entire code base using the io helper module. The file list can be provided using any pattern supported by [node glob](https://github.com/isaacs/node-glob).

```js
const jsmod = require('jsmod');

// An array of directory glob patterns.
const filesList = [
  'path/to/some/files/**/*.@(js|es6)',
  'path/to/more/files/**/*.@(js|es6)'
];

jsmod.io.load(filesList).then(({project, save}) => {
  // Helper functions
  const isLongHand = el => el.attr('shorthand') === false;
  const hasIdenticalKeyValue = el => el.attr(['key', 'name']) === el.attr(['value', 'name']);

  // Apply transformation
  const newProject = project
      .find('ObjectExpression > Property')
      .filter(isLongHand)
      .filter(hasIdenticalKeyValue)
      .attr('shorthand', true);
  return save(newProject);
});
```

## Features
- [x] selectors
  - [x] **element** e.g. `Identifier`
  - [x] **combinators**
    - [x] **descendant combinator** e.g. `ArrayExpression Identifier`
    - [x] **child combinator** e.g. `ArrayExpression > Identifier`
    - [ ] **adjacent sibling combinator** e.g. `Identifier + Literal`
    - [ ] **general sibling combinator** e.g. `Identifier ~ Literal`
  - [ ] **attribute descent** e.g. `ClassDeclaration.id > Identifier`
  - [x] **attribute selectors**
    - [x] **has attribute** - e.g. `[name]`
    - [x] **exact match** - e.g. `[attribute="value"]`
    - [x] **fuzzy match** - e.g. `[attribute~="value"]`
    - [x] **begins with** - e.g. `[attribute^="value"]`
    - [x] **ends with** - e.g. `[attribute$="value"]`
    - [x] **contains** - e.g. `[attribute*="value"]`
  - [ ] **universal selector** e.g. `*`
  - [ ] **pseudo selectors**
    - [ ] `:first`
    - [ ] `:first-child`
    - [ ] `:first-of-type`
    - [x] `:has()`
    - [ ] `:last`
    - [ ] `:last-child`
    - [ ] `:last-of-type`
    - [ ] `:not()`
    - [ ] `:nth-child`
    - [ ] `:nth-last-child`
    - [ ] `:nth-last-of-type`
    - [ ] `:nth-of-type`
    - [ ] `:root`
- [x] traversal
  - [ ] `.children()`
  - [x] `.closest()`
  - [x] `.end()`
  - [x] `.find()`
  - [ ] `.next()`
  - [ ] `.nextAll()`
  - [ ] `.nextUtil()`
  - [ ] `.parent()`
  - [ ] `.parents()`
  - [ ] `.parentsUtil()`
  - [ ] `.prev()`
  - [ ] `.prevAll()`
  - [ ] `.prevUtil()`
  - [ ] `.siblings()`
- [x] filtering
  - [ ] `.eq()`
  - [x] `.filter()`
  - [x] `.first()`
  - [ ] `.has()`
  - [x] `.is()`
  - [x] `.last()`
  - [x] `.map()`
  - [x] `.not()`
  - [ ] `.slice()`
- [ ] manipulation
  - [ ] `.after()`
  - [ ] `.append()`
  - [ ] `.appendTo()`
  - [x] `.attr()`
  - [ ] `.before()`
  - [x] `.forEach()`
  - [ ] `.insertAfter()`
  - [ ] `.insertBefore()`
  - [ ] `.prepend()`
  - [ ] `.prependTo()`
  - [x] `.remove()`
  - [x] `.replaceWith()`
  - [ ] `.replaceAll()`
  - [x] `.sort()`
- [x] misc
  - [x] `.get()`
  - [x] `.toArray()`
