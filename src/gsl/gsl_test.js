import { astQuerySelector } from './gsl';
import recast from 'recast';
import chai from 'chai';
const expect = chai.expect;

describe('gsl', function() {
  describe('simple', function() {
    it('simple selector', function() {
      const ast = recast.parse('Foo.Bar.baz = 3;').program;
      const ids = astQuerySelector('Identifier', ast).map(match => match.name);
      expect(ids).to.deep.equal(['Foo', 'Bar', 'baz']);
    });

    it('list of simple selectors', function() {
      const ast = recast.parse('Foo.Bar.baz = 3;').program;
      const types = astQuerySelector('Identifier, Literal', ast).map(node => node.type);
      expect(types).to.deep.equal(['Identifier', 'Identifier', 'Identifier', 'Literal']);
    });
  });

  describe('combinators', function() {
    it('simple child combinator', function() {
      const ast = recast.parse('Foo.Bar.baz = 3;').program;
      const nodes = astQuerySelector('AssignmentExpression > MemberExpression', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0].expression.left);
    });

    it('simple descendant combinator', function() {
      const ast = recast.parse('foo[0] = 1;').program;
      const nodes = astQuerySelector('MemberExpression Literal', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0].expression.left.property);
    });

    it('multiple homogeneous child combinators', function() {
      const ast = recast.parse('Foo.Bar.baz = 3;').program;
      const nodes = astQuerySelector('AssignmentExpression > MemberExpression > MemberExpression', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0].expression.left.object);
    });

    it('multiple heterogeneous child combinators', function() {
      const ast = recast.parse('const foo = (1 + 2) / 5;').program;
      const nodes = astQuerySelector('VariableDeclarator > BinaryExpression Literal', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0].declarations[0].init.right);
    });

    it('handles ast types that are within arrays', function() {
      const ast = recast.parse('class Foo { constructor() {} }').program;
      const nodes = astQuerySelector('ClassDeclaration > ClassBody > MethodDefinition', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0].body.body[0]);
    });
  });

  describe('attribute', function() {
    it('has attribute selector', function() {
      const ast = recast.parse('class Foo { constructor() {} bar() {} }').program;
      const nodes = astQuerySelector('[kind]', ast);
      expect(nodes.length).to.equal(2);
      expect(nodes[0]).to.equal(ast.body[0].body.body[0]);
      expect(nodes[1]).to.equal(ast.body[0].body.body[1]);
    });

    it('exact value attribute selector', function() {
      const ast = recast.parse('class Foo { constructor() {} bar() {} }').program;
      const nodes = astQuerySelector('[kind="constructor"]', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0].body.body[0]);
    });

    it('starts with value attribute selector', function() {
      const ast = recast.parse('class Foo { constructor() {} bar() {} }').program;
      const nodes = astQuerySelector('[kind^="cons"]', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0].body.body[0]);
    });

    it('ends with value attribute selector', function() {
      const ast = recast.parse('class Foo { constructor() {} bar() {} }').program;
      const nodes = astQuerySelector('[kind$="tor"]', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0].body.body[0]);
    });

    it('element and attribute selector', function() {
      const ast = recast.parse('class Foo { constructor() {} bar() {} }').program;
      const nodes = astQuerySelector('MethodDefinition[kind="constructor"]', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0].body.body[0]);
    });

    it('starts with value attribute selector', function() {
      const ast = recast.parse('class Foo { constructor() {} bar() {} }').program;
      const nodes = astQuerySelector('[kind^="cons"]', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0].body.body[0]);
    });

    it('ends with value attribute selector', function() {
      const ast = recast.parse('class Foo { constructor() {} bar() {} }').program;
      const nodes = astQuerySelector('[kind$="tor"]', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0].body.body[0]);
    });

    it('deep attribute selector', function() {
      const ast = recast.parse('class Foo {} class Bar {}').program;
      const nodes = astQuerySelector('ClassDeclaration[id.name="Foo"]', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0]);
    });

    it('deep attribute selector with array access', function() {
      const ast = recast.parse('[Foo, Bar]').program;
      const nodes = astQuerySelector('[elements.1.name="Bar"]', ast);
      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(ast.body[0].expression);
    });

    it('deep attribute selector with incorrect array access', function() {
      const ast = recast.parse('[Foo, Bar]').program;
      const nodes = astQuerySelector('[elements.0.name="Bar"]', ast);
      expect(nodes.length).to.equal(0);
    });
  });

  describe('pseudo selectors', function() {
    describe('has selector', function() {
      it('simple', function() {
        const ast = recast.parse('[[Foo], [Bar]]').program;
        const nodes = astQuerySelector('ArrayExpression:has(Identifier[name="Foo"])', ast);
        expect(nodes.length).to.equal(2);
        expect(nodes[0]).to.equal(ast.body[0].expression);
        expect(nodes[1]).to.equal(ast.body[0].expression.elements[0]);
      });

      it('with child combinator', function() {
        const ast = recast.parse('[[Foo.FooBar], [Bar]]').program;
        const nodes = astQuerySelector('ArrayExpression:has(ArrayExpression > MemberExpression)', ast);
        expect(nodes.length).to.equal(1);
        expect(nodes[0]).to.equal(ast.body[0].expression);
      });

      it('with descendant combinator', function() {
        const ast = recast.parse('[[Foo.FooBar], [Bar]]').program;
        const nodes = astQuerySelector('ArrayExpression:has(ArrayExpression MemberExpression)', ast);
        expect(nodes.length).to.equal(1);
        expect(nodes[0]).to.equal(ast.body[0].expression);
      });

      it('nested', function() {
        const ast = recast.parse('[[Foo.FooBar], [Bar]]').program;
        const nodes = astQuerySelector('ArrayExpression:has(ArrayExpression:has(MemberExpression))', ast);
        expect(nodes.length).to.equal(1);
        expect(nodes[0]).to.equal(ast.body[0].expression);
      });
    });
  });
});

