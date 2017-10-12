# JSMod [![Build Status](https://travis-ci.org/BrendanAnnable/jsmod.svg?branch=master)](https://travis-ci.org/BrendanAnnable/jsmod)
An AST-based JavaScript refactoring tool. The guiding philosophy behind jsmod is that traversing and manipulating an [abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree) should be as familiar as traversing and manipulating the DOM tree. Heavily influenced by [jQuery](http://api.jquery.com/) and [jscodeshift](https://github.com/facebook/jscodeshift), JSMod features a powerful CSS-like selector engine alongside a chainable API for traversal and manipulation.

## Use case
TODO

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

### Input AST
```
└── ObjectExpression,
    └── properties
        ├── Property
        │   ├── shorthand: false
        │   ├── key
        │   │   └── Identifier
        │   │        └── name: "foo"
        │   └── value
        │       └── Identifier
        │            └── name: "foo"
        ├── Property
        │   ├── shorthand: false
        │   ├── key
        │   │   └── Identifier
        │   │        └── name: "bar"
        │   └── value
        │       └── Identifier
        │            └── name: "bar"
        └── Property
            ├── shorthand: false
            ├── key
            │   └── Identifier
            │        └── name: "baz"
            └── value
                └── Identifier
                     └── name: "baz"
```


### Example jsmod transform

```js
// Parse code into an AST.
const program = recast.parse(input).program;

// Helper functions
const isLongHand = el => el.attr(['shorthand']) === false;
const hasIdenticalKeyValue = el => el.attr(['key', 'name']) === el.attr(['value', 'name']);

// Apply transformation
const newProgram = jsmod(program)
	  .find('ObjectExpression > Property')
	  .filter(isLongHand)
	  .filter(hasIdenticalKeyValue)
	  .attr('shorthand', true);

const code = recast.print(newProgram.getAst()).code;
// TODO: Save to disk.
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

