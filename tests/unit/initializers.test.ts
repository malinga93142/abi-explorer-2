import { describe, expect, it } from 'vitest';
import { recordInitializers } from '$core/initializers';

describe('recordInitializers', () => {
  it('reads designated C initializers', () => {
    const source = `
      struct node { int key; struct node *next; };
      int main(void) {
        struct node n = {.key = 0x20, .next = NULL};
      }
    `;

    expect(recordInitializers(source, 'struct', 'node', ['key', 'next'])).toEqual([
      {
        variable: 'n',
        fields: new Map([
          ['key', '0x20'],
          ['next', 'NULL'],
        ]),
      },
    ]);
  });

  it('keeps nested expressions together and supports positional values', () => {
    const source = 'struct pair p = { make_value(1, 2), {.x = 3, .y = 4} };';

    expect(recordInitializers(source, 'struct', 'pair', ['first', 'second'])).toEqual([
      {
        variable: 'p',
        fields: new Map([
          ['first', 'make_value(1, 2)'],
          ['second', '{.x = 3, .y = 4}'],
        ]),
      },
    ]);
  });

  it('does not confuse a type definition with an object initializer', () => {
    const source = 'struct node { int key; };';
    expect(recordInitializers(source, 'struct', 'node', ['key'])).toEqual([]);
  });
});
