import { describe, expect, it } from 'vitest';
import { pageItems } from './pageItems';

describe('pageItems', () => {
  it.each<[number, number, (number | 'gap')[]]>([
    [1, 1, [1]],
    [3, 7, [1, 2, 3, 4, 5, 6, 7]],
    [1, 84, [1, 2, 'gap', 84]],
    [3, 84, [1, 2, 3, 4, 'gap', 84]],
    [5, 84, [1, 'gap', 4, 5, 6, 'gap', 84]],
    [82, 84, [1, 'gap', 81, 82, 83, 84]],
    [84, 84, [1, 'gap', 83, 84]],
  ])('page %i of %i', (current, count, expected) => {
    expect(pageItems(current, count)).toEqual(expected);
  });
});
