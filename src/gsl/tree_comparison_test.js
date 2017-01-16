import { compareTrees } from './tree_comparison';
import { Finder } from './finder';
import Baobab from 'baobab';
import chai from 'chai';
const expect = chai.expect;

describe('tree comparison', function() {
  describe('simple', function() {
    let oldFinder, newAst;

    beforeEach(function() {
      const foo = { type: 'ExpressionStatement', expression: { type: 'Identifier', name: 'Foo' } };
      const bar = { type: 'ExpressionStatement', expression: { type: 'Identifier', name: 'Bar' } };
      const baz = { type: 'ExpressionStatement', expression: { type: 'Identifier', name: 'Baz' } };

      oldFinder = Finder.of({
        type: 'Program',
        body: [foo, bar]
      });

      const tree = new Baobab(oldFinder.ast);
      const cursor = tree.select(['body']);
      cursor.set([baz, foo]);
      newAst = tree.get();
    });

    it('should return additions', function() {
      const { additions } = compareTrees(oldFinder, newAst);
      expect(additions.length).to.equal(3);
      expect(additions[0].el).to.equal(newAst);
      expect(additions[1].el).to.equal(newAst.body[0]);
      expect(additions[2].el).to.equal(newAst.body[0].expression);
    });

    it('should return deletions', function() {
      const { deletions } = compareTrees(oldFinder, newAst);
      expect(deletions.length).to.equal(3);
      expect(deletions[0].el).to.equal(oldFinder.ast);
      expect(deletions[1].el).to.equal(oldFinder.ast.body[1]);
      expect(deletions[2].el).to.equal(oldFinder.ast.body[1].expression);
    });
  });

  describe('smoketest', function() {
    let olderFinder, newAst;
    beforeEach(function() {
      const foo = {
        type: 'Identifier',
        name: 'Foo'
      };

      const bar = {
        type: 'Identifier',
        name: 'Bar'
      };

      olderFinder = Finder.of({
        type: 'Project',
        files: [{
          type: 'File',
          program: {
            type: 'Program',
            body: [{
              type: 'ExpressionStatement',
              expression: foo
            }, {
              type: 'ExpressionStatement',
              expression: bar
            }]
          }
        }, {
          type: 'File',
          program: {
            type: 'Program',
            body: [{
              type: 'ExpressionStatement',
              expression: {
                type: 'Identifier',
                name: 'Cat'
              }
            }]
          }
        }]
      });


      const tree = new Baobab(olderFinder.ast);
      const cursor = tree.select(['files', 0, 'program', 'body']);
      cursor.set([{
        type: 'ExpressionStatement',
        expression: {
          type: 'Identifier',
          name: 'Baz'
        }
      }, {
        type: 'ExpressionStatement',
        expression: foo
      }]);
      newAst = tree.get();
    });

    it('should return additions', function() {
      const { additions } = compareTrees(olderFinder, newAst);
      const additionalEls = additions.map(addition => addition.el);
      expect(additionalEls.length).to.equal(6);
      expect(additionalEls[0]).to.equal(newAst);
      expect(additionalEls[1]).to.equal(newAst.files[0]);
      expect(additionalEls[2]).to.equal(newAst.files[0].program);
      expect(additionalEls[3]).to.equal(newAst.files[0].program.body[0]);
      expect(additionalEls[4]).to.equal(newAst.files[0].program.body[0].expression);
      expect(additionalEls[5]).to.equal(newAst.files[0].program.body[1]);
    });

    it('should return deletions', function() {
      const { deletions } = compareTrees(olderFinder, newAst);
      const deletedEls = deletions.map(deletion => deletion.el);
      expect(deletedEls.length).to.equal(6);
      expect(deletedEls[0]).to.equal(olderFinder.ast);
      expect(deletedEls[1]).to.equal(olderFinder.ast.files[0]);
      expect(deletedEls[2]).to.equal(olderFinder.ast.files[0].program);
      expect(deletedEls[3]).to.equal(olderFinder.ast.files[0].program.body[0]);
      expect(deletedEls[4]).to.equal(olderFinder.ast.files[0].program.body[1]);
      expect(deletedEls[5]).to.equal(olderFinder.ast.files[0].program.body[1].expression);
    });
  });
});
