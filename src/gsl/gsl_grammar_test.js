import { GSL_GRAMMAR } from './gsl_grammar';
import peg from 'pegjs';
import chai from 'chai';
const expect = chai.expect;

describe('gsl', function() {
  describe('grammar', function() {
    it('validates', function() {
      expect(() => peg.generate(GSL_GRAMMAR)).to.not.throw();
    });
  });

  describe('language', function() {
    let parser;

    beforeEach(function() {
      parser = peg.generate(GSL_GRAMMAR);
    });

    /**
     * @param {string} input A GSL selector string.
     * @returns {void}
     */
    function accepts(input) {
      expect(() => parser.parse(input)).to.not.throw();
    }

    /**
     * @param {string} input A GSL selector string.
     * @returns {void}
     */
    function rejects(input) {
      expect(() => parser.parse(input)).to.throw(/SyntaxError/);
    }

    describe('accepts a simple selector', function() {
      it('with no whitespace', function() {
        accepts('Foo');
      });

      it('with leading whitespace', function() {
        accepts(' Foo');
      });

      it('with trailing whitespace', function() {
        accepts('Foo ');
      });

      it('with surrounding whitespace', function() {
        accepts(' Foo ');
      });
    });

    describe('a selector list', function() {
      describe('accepts a list of simple selectors', function() {
        it('with no whitespace', function() {
          accepts('Foo,Bar');
        });

        it('with leading whitespace', function() {
          accepts('Foo ,Bar');
        });

        it('with trailing whitespace', function() {
          accepts('Foo, Bar');
        });
      });

      it('accepts a list separated by newlines', function() {
        accepts('Foo,\nBar,\nBaz');
      });

      it('rejects a list with multiple commas', function() {
        rejects('Foo,,Bar');
      });
    });

    describe('combinators', function() {
      describe('single combinator', function() {
        describe('descendant combinator selector', function() {
          describe('accepts', function() {
            it('single whitespace', function() {
              accepts('Foo Bar');
            });

            it('multiple whitespace', function() {
              accepts('Foo  Bar');
            });

            it('whitespace newline', function() {
              accepts('Foo\nBar');
            });
          });
        });

        describe('child combinator selector', function() {
          describe('accepts', function() {
            it('with no whitespace', function() {
              accepts('Foo>Bar');
            });

            it('with leading whitespace', function() {
              accepts('Foo >Bar');
            });

            it('with trailing whitespace', function() {
              accepts('Foo> Bar');
            });

            it('with surrounding whitespace', function() {
              accepts('Foo > Bar');
            });
          });

          describe('rejects', function() {
            it('repeated combinators', function() {
              rejects('Foo >> Bar');
            });
          });
        });

        describe('accepts adjacent sibling combinator selector', function() {
          it('with no whitespace', function() {
            accepts('Foo+Bar');
          });

          it('with leading whitespace', function() {
            accepts('Foo +Bar');
          });

          it('with trailing whitespace', function() {
            accepts('Foo+ Bar');
          });

          it('with surrounding whitespace', function() {
            accepts('Foo + Bar');
          });
        });

        describe('accepts general sibling combinator selector', function() {
          it('with no whitespace', function() {
            accepts('Foo~Bar');
          });

          it('with leading whitespace', function() {
            accepts('Foo ~Bar');
          });

          it('with trailing whitespace', function() {
            accepts('Foo~ Bar');
          });

          it('with surrounding whitespace', function() {
            accepts('Foo ~ Bar');
          });
        });
      });

      describe('multiple homogeneous combinators', function() {
        it('accepts multiple descendant combinator selectors', function() {
          accepts('Foo Bar Baz');
        });

        it('accepts multiple child combinator selectors', function() {
          accepts('Foo > Bar > Baz');
        });

        it('accepts multiple adjacent sibling combinator selectors', function() {
          accepts('Foo + Bar + Baz');
        });

        it('accepts multiple general sibling combinator selectors', function() {
          accepts('Foo ~ Bar ~ Baz');
        });
      });

      describe('multiple heterogeneous combinators', function() {
        it('accepts multiple descendant combinator selectors', function() {
          accepts('Foo Bar > Baz + Dog ~ Cat');
        });
      });

      describe('attribute selectors', function() {
        describe('has attribute', function() {
          it('accepts with leading element', function() {
            accepts('Foo[attribute]');
          });

          it('accepts without leading element', function() {
            accepts('[attribute]');
          });

          it('rejects with trailing element', function() {
            rejects('[attribute]Foo');
          });
        });

        describe('exact match', function() {
          it('accepts with leading element', function() {
            accepts('Foo[attribute="value"]');
          });

          it('accepts without leading element', function() {
            accepts('[attribute="value"]');
          });

          it('rejects with trailing element', function() {
            rejects('[attribute="value"]Foo');
          });
        });

        describe('exact no match', function() {
          it('accepts with leading element', function() {
            accepts('Foo[attribute!="value"]');
          });

          it('accepts without leading element', function() {
            accepts('[attribute!="value"]');
          });

          it('rejects with trailing element', function() {
            rejects('[attribute!="value"]Foo');
          });
        });

        describe('fuzzy match', function() {
          it('accepts with leading element', function() {
            accepts('Foo[attribute~="value"]');
          });

          it('accepts without leading element', function() {
            accepts('[attribute~="value"]');
          });

          it('rejects with trailing element', function() {
            rejects('[attribute~="value"]Foo');
          });
        });

        describe('starts with match', function() {
          it('accepts with leading element', function() {
            accepts('Foo[attribute^="value"]');
          });

          it('accepts without leading element', function() {
            accepts('[attribute^="value"]');
          });

          it('rejects with trailing element', function() {
            rejects('[attribute^="value"]Foo');
          });
        });

        describe('ends with match', function() {
          it('accepts with leading element', function() {
            accepts('Foo[attribute$="value"]');
          });

          it('accepts without leading element', function() {
            accepts('[attribute$="value"]');
          });

          it('rejects with trailing element', function() {
            rejects('[attribute$="value"]Foo');
          });
        });

        describe('contains match', function() {
          it('accepts with leading element', function() {
            accepts('Foo[attribute*="value"]');
          });

          it('accepts without leading element', function() {
            accepts('[attribute*="value"]');
          });

          it('rejects with trailing element', function() {
            rejects('[attribute*="value"]Foo');
          });
        });

        describe('deep attribute', function() {
          it('accepts a deep attribute path', function() {
            accepts('Foo[path.to.attribute]');
          });
        });
      });
    });

    describe('pseudo selectors', function() {
      describe('has selector', function() {
        it('accepts simple has selector', function() {
          accepts('Foo:has(Bar)');
        });

        it('accepts has selector with a nested combinator', function() {
          accepts('Foo:has(Bar > Baz)');
        });
      });
    });
  });

  describe('parse tree', function() {
    let parser;

    beforeEach(function() {
      parser = peg.generate(GSL_GRAMMAR);
    });

    /**
     * @param {string} input A GSL selector string.
     * @param {!Object} expected The expected parse structure.
     * @returns {void}
     */
    function matches(input, expected) {
      expect(parser.parse(input)).to.deep.equal(expected);
    }

    it('simple', function() {
      matches('Foo', {
        type: 'SelectorList',
        selectors: [{
          type: 'SimpleSelector',
          element: {
            type: 'Identifier',
            name: 'Foo'
          },
          attributes: [],
          pseudos: []
        }]
      });
    });

    it('combinator', function() {
      matches('Foo Bar', {
        type: 'SelectorList',
        selectors: [{
          type: 'DescendantCombinator',
          left: {
            type: 'SimpleSelector',
            element: {
              type: 'Identifier',
              name: 'Foo'
            },
            attributes: [],
            pseudos: []
          },
          right: {
            type: 'SimpleSelector',
            element: {
              type: 'Identifier',
              name: 'Bar'
            },
            attributes: [],
            pseudos: []
          }
        }]
      });
    });

    it('multiple heterogeneous combinators', function() {
      matches('Foo Bar > Bar + Dog ~ Cat', {
        type: 'SelectorList',
        selectors: [{
          type: 'GeneralSiblingCombinator',
          left: {
            type: 'AdjacentSiblingCombinator',
            left: {
              type: 'ChildCombinator',
              left: {
                type: 'DescendantCombinator',
                left: {
                  type: 'SimpleSelector',
                  element: {
                    type: 'Identifier',
                    name: 'Foo'
                  },
                  attributes: [],
                  pseudos: []
                },
                right: {
                  type: 'SimpleSelector',
                  element: {
                    type: 'Identifier',
                    name: 'Bar'
                  },
                  attributes: [],
                  pseudos: []
                }
              },
              right: {
                type: 'SimpleSelector',
                element: {
                  type: 'Identifier',
                  name: 'Bar'
                },
                attributes: [],
                pseudos: []
              }
            },
            right: {
              type: 'SimpleSelector',
              element: {
                type: 'Identifier',
                name: 'Dog'
              },
              attributes: [],
              pseudos: []
            }
          },
          right: {
            type: 'SimpleSelector',
            element: {
              type: 'Identifier',
              name: 'Cat'
            },
            attributes: [],
            pseudos: []
          }
        }]
      });
    });
  });
});

