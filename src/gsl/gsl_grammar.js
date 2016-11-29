export const GSL_GRAMMAR = String.raw`
{
  function formatSelector(head, tail) {
    if (tail.length === 0) {
      return head;
    }
    const last = tail.pop();
	return {
      type: last.type,
      left: formatSelector(head, tail),
      right: last.selector
    };
  }
}

Start = list:List {
  return { type: 'SelectorList', selectors: list };
}

List = head:ListItem tail:ListTail* {
  return [head, ...tail];
}

ListItem = _ selector:Selector _ {
  return selector;
}

ListTail = ',' item:ListItem {
  return item;
}

Selector = head:SimpleSelector tail:CombinatorSelector* {
  return formatSelector(head, tail);
}

SimpleSelector = element:Identifier tail:SimpleSelector2? {
  return Object.assign({ type: 'SimpleSelector', element, attributes: [], pseudos: [] }, tail);
} / tail:SimpleSelector2 {
  return Object.assign({ type: 'SimpleSelector', element: null, attributes: [], pseudos: [] }, tail);
}

SimpleSelector2 = attributes:AttributeSelector+ tail:SimpleSelector3? {
  return Object.assign({ attributes }, tail);
} / tail:SimpleSelector3

SimpleSelector3 = pseudos:PseudoSelector+ {
  return { pseudos };
}

PseudoSelector = HasPseudoSelector

HasPseudoSelector = ':has(' _ selectors:List _ ')' {
  return { type: 'HasPseudo', selectors };
}

AttributeSelector = HasAttribute
                  / ExactValueAttribute
                  / ExactNotValueAttribute
                  / FuzzyValueAttribute
                  / StartsWithValueAttribute
                  / EndsWithValueAttribute
                  / ContainsValueAttribute

HasAttribute = '[' attribute:AttributePath ']' {
  return { type: 'HasAttribute', attribute };
}

ExactValueAttribute= '[' attribute:AttributePath '=' value:Literal ']' {
  return { type: 'ExactValueAttribute', attribute, value };
}

ExactNotValueAttribute= '[' attribute:AttributePath '!=' value:Literal ']' {
  return { type: 'ExactNotValueAttribute', attribute, value };
}

FuzzyValueAttribute= '[' attribute:AttributePath '~=' value:Literal ']' {
  return { type: 'FuzzyValueAttribute', attribute, value };
}

StartsWithValueAttribute= '[' attribute:AttributePath '^=' value:Literal ']' {
  return { type: 'StartsWithValueAttribute', attribute, value };
}

EndsWithValueAttribute= '[' attribute:AttributePath '$=' value:Literal ']' {
  return { type: 'EndsWithValueAttribute', attribute, value };
}

ContainsValueAttribute= '[' attribute:AttributePath '*=' value:Literal ']' {
  return { type: 'ContainsValueAttribute', attribute, value };
}

AttributePath = name:AttributePart tail:AttributePathTail* {
  return { type: 'AttributePath', path: [name, ...tail] };
}

AttributePathTail = '.' name:AttributePart { return name; }

AttributePart = name:(Identifier / Integer)

CombinatorSelector = DescendantCombinator
                   / ChildCombinator
                   / AdjacentSiblingCombinator
                   / GeneralSiblingCombinator

DescendantCombinator = __ selector:SimpleSelector {
  return { type: 'DescendantCombinator', selector };
}

ChildCombinator = _ '>' _ selector:SimpleSelector {
  return { type: 'ChildCombinator', selector };
}

AdjacentSiblingCombinator = _ '+' _ selector:SimpleSelector {
  return { type: 'AdjacentSiblingCombinator', selector };
}

GeneralSiblingCombinator = _ '~' _ selector:SimpleSelector {
  return { type: 'GeneralSiblingCombinator', selector };
}

Identifier = [A-Za-z][A-Za-z0-9]* {
  return { type: 'Identifier', name: text() };
}

Integer = [0-9]+ {
  return { type: 'Integer', name: parseInt(text(), 10) };
}

Literal = '"' value:(NonEscapedChar / EscapedChar)* '"' {
  return { type: 'Literal', value: value.join('') };
}

NonEscapedChar = [^"\\]

EscapedChar = '\\"' { return '"'; }
            / '\\\\' { return '\\'; }
            / '\\/' { return '/'; }
            / '\\b' { return '\b'; }
            / '\\f' { return '\f'; }
            / '\\n' { return '\n'; }
            / '\\r' { return '\r'; }
            / '\\t' { return '\t'; }

_ = [ \t\r\n]*
__ = [ \t\r\n]+
`;
