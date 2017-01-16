import { Finder } from './finder';
import chai from 'chai';
const expect = chai.expect;

describe('finder', function() {
  describe('path', function() {
    let finder;

    beforeEach(function() {
      finder = Finder.of({
        type: 'Program',
        body: [{
          type: 'ExpressionStatement',
          expression: {
            type: 'Identifier',
            name: 'Foo'
          }
        }]
      });
    });

    it('should get path', function() {
      const ids = [...finder.findByType('Identifier')];
      const path = finder.getPath(ids[0]);
      expect(path).to.deep.equal(['body', 0, 'expression']);
    });
  });
});
