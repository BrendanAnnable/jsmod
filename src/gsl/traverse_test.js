import { traverse } from './traverse';
import chai from 'chai';
const expect = chai.expect;

describe('traverse', function() {
  describe('smoketest', function() {
    let ast;
    beforeEach(function() {
      ast = {
        type: 'Project',
        files: [{
          type: 'File',
          program: {
            type: 'Program',
            body: [{
              type: 'ExpressionStatement',
              expression: {
                type: 'Identifier',
                name: 'Foo'
              }
            }, {
              type: 'ExpressionStatement',
              expression: {
                type: 'Identifier',
                name: 'Bar'
              }
            }]
          }
        }]
      };
    });

    it('should skip arrays', function() {
      expect(Array.from(traverse(ast)).length).to.equal(7);
    });

    it('types', function() {
      const types = Array.from(traverse(ast)).map(item => item.el.type);
      expect(types).to.deep.equal([
        'Project', 'File', 'Program', 'ExpressionStatement', 'Identifier', 'ExpressionStatement', 'Identifier'
      ]);
    });

    it('returns shallow parent paths', function() {
      const items = Array.from(traverse(ast));
      expect(items[0].parent.path).to.deep.equal([]);
      expect(items[1].parent.path).to.deep.equal(['files', 0]);
      expect(items[2].parent.path).to.deep.equal(['program']);
      expect(items[3].parent.path).to.deep.equal(['body', 0]);
      expect(items[4].parent.path).to.deep.equal(['expression']);
      expect(items[5].parent.path).to.deep.equal(['body', 1]);
      expect(items[6].parent.path).to.deep.equal(['expression']);
    });

    // TODO (Annable): Write a real test for #children.
  });
});
