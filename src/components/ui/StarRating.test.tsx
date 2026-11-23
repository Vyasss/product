import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STAR_PATH } from './icons';
import { filledWidth, ratingLabel, starAt, StarRating, starFills } from './StarRating';

describe('starFills', () => {
  it.each<[number, number[]]>([
    [4.3, [1, 1, 1, 1, 0.3]],
    [5, [1, 1, 1, 1, 1]],
    [1, [1, 0, 0, 0, 0]],
    [3.5, [1, 1, 1, 0.5, 0]],
    [2.95, [1, 1, 0.95, 0, 0]],
    [0, [0, 0, 0, 0, 0]],
  ])('fills %d stars as %j', (value, expected) => {
    expect(starFills(value)).toEqual(expected);
  });

  it('clamps values outside the range and ignores NaN', () => {
    expect(starFills(7)).toEqual([1, 1, 1, 1, 1]);
    expect(starFills(-2)).toEqual([0, 0, 0, 0, 0]);
    expect(starFills(Number.NaN)).toEqual([0, 0, 0, 0, 0]);
  });

  it('supports a different maximum', () => {
    expect(starFills(2.5, 3)).toEqual([1, 1, 0.5]);
  });
});

describe('StarRating', () => {
  it('exposes the rating as one sentence and hides the decorative parts', () => {
    const { container } = render(<StarRating value={4.3} />);
    expect(screen.getByText('Rated 4.3 out of 5')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('4.3')).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws the partial star at the decimal width', () => {
    const { container } = render(<StarRating value={4.3} />);
    // One SVG; the filled path is clipped to one rect: 4 full stars (4 x 27 units) + 0.3 of a 24-unit star.
    const rects = Array.from(container.querySelectorAll('clipPath rect')).map((rect) => Number(rect.getAttribute('width')));
    expect(rects.map((width) => Math.round(width * 100) / 100)).toEqual([115.2]);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('svg path')).toHaveLength(2);
  });
});

describe('ratingLabel and review counts', () => {
  it('describes rating and review count in one sentence', () => {
    expect(ratingLabel(4.3)).toBe('Rated 4.3 out of 5');
    expect(ratingLabel(4.3, 5, 1284)).toBe('Rated 4.3 out of 5 from 1,284 reviews');
    expect(ratingLabel(5, 5, 1)).toBe('Rated 5.0 out of 5 from 1 review');
    expect(ratingLabel(3.8, 5, 0)).toBe('Rated 3.8 out of 5, no reviews yet');
  });

  it('shows the count visually and exposes the full sentence', () => {
    render(<StarRating value={4.3} reviewCount={1284} />);
    expect(screen.getByText('(1,284)')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Rated 4.3 out of 5 from 1,284 reviews')).toBeInTheDocument();
  });
});

describe('star geometry', () => {
  it('shifts the star outline without changing its shape', () => {
    expect(starAt(0)).toBe(STAR_PATH);
  });

  it('fills contiguously from the left', () => {
    expect(filledWidth(starFills(5))).toBe(4 * 27 + 24);
    expect(filledWidth(starFills(1))).toBe(24);
    expect(filledWidth(starFills(0))).toBe(0);
    expect(Math.round(filledWidth(starFills(2.5)) * 100) / 100).toBe(27 + 27 + 12);
  });
});
