import { clampPage, getPageNumbers, getTotalPages, paginateItems } from './pagination';

describe('paginateItems', () => {
  it('returns the correct slice for a given page', () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    expect(paginateItems(items, 1, 9)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(paginateItems(items, 3, 9)).toEqual([19, 20, 21, 22, 23, 24, 25]);
  });

  it('returns an empty array past the last page', () => {
    const items = [1, 2, 3];
    expect(paginateItems(items, 5, 9)).toEqual([]);
  });
});

describe('getTotalPages', () => {
  it('rounds up to the nearest full page', () => {
    expect(getTotalPages(25, 9)).toBe(3);
    expect(getTotalPages(9, 9)).toBe(1);
    expect(getTotalPages(10, 9)).toBe(2);
  });

  it('always returns at least 1 page, even for zero items', () => {
    expect(getTotalPages(0, 9)).toBe(1);
  });
});

describe('clampPage', () => {
  it('clamps below the minimum to 1', () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(-3, 5)).toBe(1);
  });

  it('clamps above the maximum to totalPages', () => {
    expect(clampPage(9, 5)).toBe(5);
  });

  it('leaves an in-range page untouched', () => {
    expect(clampPage(3, 5)).toBe(3);
  });
});

describe('getPageNumbers', () => {
  it('lists every page when there is only one page', () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
  });

  it('lists every page when 7 or fewer pages exist', () => {
    expect(getPageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('collapses the middle into ellipsis markers for many pages', () => {
    const result = getPageNumbers(10, 20);
    expect(result[0]).toBe(1);
    expect(result[result.length - 1]).toBe(20);
    expect(result).toContain(-1); // ellipsis marker
    expect(result).toContain(10); // current page always present
  });
});
