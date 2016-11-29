import recast from 'recast';
import types from 'ast-types';
import chai from 'chai';
import sinon from 'sinon';
import { jsmod } from './jsmod';
import { fragment } from './fragment';
const expect = chai.expect;
const build = types.builders;

describe('jsmod', function() {
  describe('use cases', function() {
    it('replace params with opts', function() {
      const program = recast.parse(`
        class Foo {
          constructor(bar, baz) {
            this.bar = bar;
            this.baz = baz;
          }
        }
      `.trim()).program;
      const newProgram = jsmod(program)
          .find('MethodDefinition[kind="constructor"]')
            .attr(['value', 'params'], [build.identifier('opts')])
            .find('AssignmentExpression > Identifier')
              .replaceWith(rightId => build.memberExpression(
                build.identifier('opts'),
                build.identifier(rightId.attr('name')),
                false
              ));
      const newProject = newProgram.getAst();

      expect(recast.print(newProject).code).to.equal(`
        class Foo {
          constructor(opts) {
            this.bar = opts.bar;
            this.baz = opts.baz;
          }
        }
      `.trim());
    });

    it('#sum', function() {
      const program = recast.parse(`
        function sum(a, b) {
          return a + b;
        }
      `.trim()).program;

      const newProgram = jsmod(program)
        .find('FunctionDeclaration')
        .attr(['params'], [build.restElement(build.identifier('numbers'))])
        .find('ReturnStatement')
        .replaceWith(() => fragment`return numbers.reduce((acc, cur) => acc + cur, 0);`);

      expect(recast.print(newProgram.getAst()).code).to.equal(`
        function sum(...numbers) {
          return numbers.reduce((acc, cur) => acc + cur, 0);
        }
      `.trim());
    });

    it('#shorthand', function() {
      const program = recast.parse(`
        ({foo: foo, bar: bar, baz: baz});
      `.trim()).program;

      const isLongHand = el => el.attr(['shorthand']) === false;
      const hasIdenticalKeyValue = el => el.attr(['key', 'name']) === el.attr(['value', 'name']);

      const newProgram = jsmod(program)
        .find('ObjectExpression > Property')
        .filter(isLongHand)
        .filter(hasIdenticalKeyValue)
        .attr('shorthand', true);

      expect(recast.print(newProgram.getAst()).code).to.equal(`
        ({foo, bar, baz});
      `.trim());
    });
  });

  describe('#map', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.Bar.baz = 1').program;
    });

    it('maps values', function() {
      const names = jsmod(program).find('Identifier').map(id => id.attr('name'));
      expect(names).to.deep.equal(['Foo', 'Bar', 'baz']);
    });
  });

  describe('#reduce', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.Bar.baz = 1').program;
    });

    it('maps values', function() {
      const names = jsmod(program).find('Identifier').reduce((list, id) => list.concat(id.attr('name')), []);
      expect(names).to.deep.equal(['Foo', 'Bar', 'baz']);
    });
  });

  describe('#filter', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.FooBar.Bar = 1').program;
    });

    it('filters values', function() {
      const ids = jsmod(program).find('Identifier').filter(id => id.attr('name').startsWith('Foo')).toArray();
      expect(ids.length).to.equal(2);
      expect(ids[0]).to.equal(program.body[0].expression.left.object.object);
      expect(ids[1]).to.equal(program.body[0].expression.left.object.property);
    });
  });

  describe('#attr', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.FooBar.Bar = 1;').program;
    });

    it('sets value on object', function() {
      const names = jsmod(program).find('Identifier').attr('name', 'Baz');
      expect(names.map(id => id.attr('name'))).to.deep.equal(['Baz', 'Baz', 'Baz']);
    });

    it('sets value on deep object', function() {
      const newProgram = jsmod(program)
        .find('MemberExpression')
          .find('Identifier[name^="Foo"]')
            .attr('name', 'Baz')
          .end()
        .attr('computed', true)
        .end();
      expect(recast.print(newProgram.getAst()).code).to.equal('Baz[Baz][Bar] = 1;');
    });

    it('can use a function', function() {
      const names = jsmod(program).find('Identifier').attr('name', oldName => oldName.toUpperCase());
      expect(names.map(id => id.attr('name'))).to.deep.equal(['FOO', 'FOOBAR', 'BAR']);
    });

    it('is chainable', function() {
      const ids = jsmod(program).find('Identifier');
      const names = ids
        .attr('name', 'Baz')
        .attr('name', 'Foo')
        .map(id => id.attr('name'));
      expect(names).to.deep.equal(['Foo', 'Foo', 'Foo']);
    });
  });

  describe('#replace', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.FooBar.Bar = 1;').program;
    });

    it('can return newly built objects', function() {
      const newProgram = jsmod(program)
        .find('Identifier')
        .replaceWith(() => build.identifier('Baz'));
      expect(recast.print(newProgram.getAst()).code).to.equal('Baz.Baz.Baz = 1;');
    });

    it('can return mutated JSMod instances', function() {
      const newProgram = jsmod(program)
        .find('Identifier')
        .replaceWith(id => id.attr('name', 'Baz'));
      expect(recast.print(newProgram.getAst()).code).to.equal('Baz.Baz.Baz = 1;');
    });

    it('can return deeply mutated JSMod instances', function() {
      program = recast.parse('Foo.Bar = 1;').program;
      const newProgram = jsmod(program)
        .find('MemberExpression')
        .replaceWith(expr => {
          return expr.find('Identifier').attr('name', 'Baz').end();
        });
      expect(recast.print(newProgram.getAst()).code).to.equal('Baz.Baz = 1;');
    });

    it('can return deeply mutated JSMod instances and find them', function() {
      const names = jsmod(program)
        .find('MemberExpression')
          .replaceWith(expr => expr.find('Identifier').attr('name', 'Baz').end())
        .end()
        .find('Identifier')
        .map(id => id.attr('name'));
      expect(names).to.deep.equal(['Baz', 'Baz', 'Baz']);
    });
  });

  describe('#remove', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('[Foo, Bar, Baz]').program;
    });

    it('removes selected elements', function() {
      const newProgram = jsmod(program).find('Identifier[name="Bar"]').remove();
      expect(recast.print(newProgram.getAst()).code).to.equal('[Foo, Baz]');
    });

    it('removes selected elements in a chainable fashion', function() {
      const newProgram = jsmod(program)
        .find('Identifier[name="Bar"]')
          .remove()
        .find('Identifier[name="Baz"]')
          .remove();
      expect(recast.print(newProgram.getAst()).code).to.equal('[Foo]');
    });

    it('removes selected paths', function() {
      const newProgram = jsmod(program)
        .find('ArrayExpression')
        .remove(['elements', 1]);
      expect(recast.print(newProgram.getAst()).code).to.equal('[Foo, Baz]');
    });

    it('removes selected paths in a chainable fashion', function() {
      const newProgram = jsmod(program)
        .find('ArrayExpression')
        .remove(['elements', 1])
        .remove(['elements', 1]);
      expect(recast.print(newProgram.getAst()).code).to.equal('[Foo]');
    });
  });

  describe('#end', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.FooBar.Bar = 1;').program;
    });

    it('allows filter chaining', function() {
      const newProgram = jsmod(program)
        .find('Identifier')
          .attr('name', 'Baz')
        .end()
        .find('Literal')
          .attr('value', 3);

      expect(recast.print(newProgram.getAst()).code).to.equal('Baz.Baz.Baz = 3;');
    });

    it('allows deep filter chaining', function() {
      const newProgram = jsmod(program)
        .find('MemberExpression')
          .find('Identifier[name^="Foo"]')
            .attr('name', 'Cat')
          .end()
        .end()
        .find('Literal')
          .attr('value', 3);

      expect(recast.print(newProgram.getAst()).code).to.equal('Cat.Cat.Bar = 3;');
    });

    it('throws when end is called too many times', function() {
      expect(() => jsmod(program).find('Identifier').end().end()).to.throw(/stack is empty/);
    });
  });

  describe('#find', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('[Foo.Bar.Baz]; Cat;').program;
    });

    it('finds matching elements', function() {
      const ids = jsmod(program).find('Identifier');
      expect(ids.length).to.equal(4);
      expect(ids.map(id => id.attr('name'))).to.deep.equal(['Foo', 'Bar', 'Baz', 'Cat']);
    });

    it('finds matching elements after initial simple find', function() {
      const ids = jsmod(program).find('ArrayExpression').find('Identifier');
      expect(ids.length).to.equal(3);
      expect(ids.map(id => id.attr('name'))).to.deep.equal(['Foo', 'Bar', 'Baz']);
    });

    it('finds matching elements after initial combinator find', function() {
      const ids = jsmod(program).find('ExpressionStatement ArrayExpression').find('Identifier');
      expect(ids.length).to.equal(3);
      expect(ids.map(id => id.attr('name'))).to.deep.equal(['Foo', 'Bar', 'Baz']);
    });
  });

  describe('#forEach', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('[Foo.Bar.Baz]').program;
    });

    it('is called per element', function() {
      const spy = sinon.spy();
      jsmod(program)
        .find('Identifier')
        .forEach(spy);
      expect(spy.calledThrice).to.be.true;
      expect(spy.firstCall.args[0].get(0)).to.equal(program.body[0].expression.elements[0].object.object);
      expect(spy.secondCall.args[0].get(0)).to.equal(program.body[0].expression.elements[0].object.property);
      expect(spy.thirdCall.args[0].get(0)).to.equal(program.body[0].expression.elements[0].property);
    });
  });

  describe('#closest', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('[[[Foo.Bar.Baz], Cat]];').program;
    });

    it('finds matching elements', function() {
      const exprs = jsmod(program).find('Identifier').closest('ArrayExpression').toArray();
      expect(exprs.length).to.equal(2);
      expect(exprs[0]).to.equal(program.body[0].expression.elements[0].elements[0]);
      expect(exprs[1]).to.equal(program.body[0].expression.elements[0]);
    });
  });

  describe('#first', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.Bar.Baz;').program;
    });

    it('gets the first element of a set', function() {
      const first = jsmod(program).find('Identifier').first();
      expect(first.length).to.equal(1);
      expect(first.attr('name')).to.equal('Foo');
    });
  });

  describe('#last', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.Bar.Baz;').program;
    });

    it('gets the last element of a set', function() {
      const first = jsmod(program).find('Identifier').last();
      expect(first.length).to.equal(1);
      expect(first.attr('name')).to.equal('Baz');
    });
  });

  describe('#is', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.Bar.Baz;').program;
    });

    it('returns true if at least one element matches', function() {
      const ids = jsmod(program).find('Identifier');
      expect(ids.is('[name="Bar"]')).to.equal(true);
    });
  });

  describe('#not', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.Bar.Baz;').program;
    });

    it('filters elements by those who do not match', function() {
      const ids = jsmod(program).find('Identifier').not('[name="Bar"]');
      expect(ids.length).to.equal(2);
      expect(ids.map(id => id.attr('name'))).to.deep.equal(['Foo', 'Baz']);
    });
  });

  describe('#sort', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('[Foo, Bar, Baz]').program;
    });

    it('sorts elements', function() {
      const ids = jsmod(program).find('Identifier').sort((a, b) => {
        return a.attr('name').localeCompare(b.attr('name'));
      });
      expect(ids.map(id => id.attr('name'))).to.deep.equal(['Bar', 'Baz', 'Foo']);
    });
  });

  describe('#get', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.Bar.Baz;').program;
    });

    it('gets element at the given index', function() {
      const ids = jsmod(program).find('Identifier');
      expect(ids.get(0)).to.equal(program.body[0].expression.object.object);
      expect(ids.get(1)).to.equal(program.body[0].expression.object.property);
      expect(ids.get(2)).to.equal(program.body[0].expression.property);
    });

    it('returns undefined on invalid index', function() {
      const ids = jsmod(program).find('Identifier');
      expect(ids.get(3)).to.equal(undefined);
    });
  });

  describe('#tap', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.Bar.Baz;').program;
    });

    it('gets called with jsmod instance', function() {
      const ids = jsmod(program).find('Identifier');
      const expectation = sinon.mock().once().withArgs(ids);
      ids.tap(expectation);
      expectation.verify();
    });

    it('ignores return value of tap', function() {
      const stub = sinon.stub().returns(false);
      const ids = jsmod(program)
        .find('Identifier')
        .tap(stub)
        .not('[name="Bar"]');
      expect(ids.length).to.equal(2);
    });
  });

  describe('#finder', function() {
    let program;
    beforeEach(function() {
      program = recast.parse('Foo.Bar.Baz;').program;
    });

    it('updates correctly after mutations', function() {
      const ids = jsmod(program)
        .find('MemberExpression')
          .first()
            .replaceWith(() => {
              return build.identifier('Foo');
            })
          .end()
        .end()
        .find('Identifier');
      expect(ids.length).to.equal(1);
    });

    it('updates correctly after new types are added', function() {
      const literals = jsmod(program)
        .find('MemberExpression')
          .first()
            .replaceWith(() => {
              return build.literal(5);
            })
          .end()
        .end()
        .find('Literal');
      expect(literals.length).to.equal(1);
    });
  });
});
