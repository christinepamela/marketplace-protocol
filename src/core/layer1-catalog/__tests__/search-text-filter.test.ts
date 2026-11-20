/**
 * Tests for the free-text search filter builder (B30).
 *
 * B30: "search text goes into a filter string; not tested. Test with commas and
 * brackets first." These tests need no database: the builder is pure, and the
 * risk is entirely in the string it produces.
 */

import { buildTextSearchFilter } from '../search.service';

/**
 * Split a PostgREST `or=` string into clauses the way the server's parser has
 * to: a comma only separates clauses when it is not inside a double-quoted
 * value, and a backslash inside quotes escapes the next character.
 */
function splitClauses(filter: string): string[] {
  const clauses: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < filter.length; i++) {
    const ch = filter[i];

    if (inQuotes && ch === '\\') {
      current += ch + (filter[i + 1] ?? '');
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }

    if (ch === ',' && !inQuotes) {
      clauses.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  clauses.push(current);
  return clauses;
}

describe('buildTextSearchFilter', () => {
  it('returns null when there is no usable text', () => {
    expect(buildTextSearchFilter(undefined)).toBeNull();
    expect(buildTextSearchFilter(null)).toBeNull();
    expect(buildTextSearchFilter('')).toBeNull();
    expect(buildTextSearchFilter('   ')).toBeNull();
    expect(buildTextSearchFilter('\t\n\r')).toBeNull();
  });

  it('matches the previous behaviour for ordinary text', () => {
    expect(buildTextSearchFilter('wooden toys')).toBe(
      'name.ilike."%wooden toys%",' +
        'short_description.ilike."%wooden toys%",' +
        'keywords.cs.{wooden toys}'
    );
  });

  it('escapes a double quote instead of ending the value early', () => {
    expect(buildTextSearchFilter('12" ruler')).toBe(
      'name.ilike."%12\\" ruler%",' +
        'short_description.ilike."%12\\" ruler%",' +
        'keywords.cs.{12 ruler}'
    );
  });

  it('escapes a backslash', () => {
    // Input a\b, LIKE-escaped to a\\b, then quoted: each backslash doubles.
    expect(buildTextSearchFilter('a\\b')).toBe(
      'name.ilike."%a\\\\\\\\b%",' +
        'short_description.ilike."%a\\\\\\\\b%",' +
        'keywords.cs.{a b}'
    );
  });

  it('treats LIKE wildcards as literal text', () => {
    expect(buildTextSearchFilter('100%')).toBe(
      'name.ilike."%100\\\\%%",' +
        'short_description.ilike."%100\\\\%%",' +
        'keywords.cs.{100%}'
    );
    expect(buildTextSearchFilter('a_b')).toBe(
      'name.ilike."%a\\\\_b%",' +
        'short_description.ilike."%a\\\\_b%",' +
        'keywords.cs.{a_b}'
    );
  });

  // The cases B30 asks for: a comma or a bracket must not become grammar.
  // Two clauses when nothing survives the array-literal rules for `keywords`.
  const hostile: Array<[string, number]> = [
    ['toys, games', 3],
    ['toys,or(name.ilike.%x%)', 3],
    ['a(b)c', 3],
    ['a{b}c', 3],
    ['scale:1.5', 3],
    ['red, green, blue', 3],
    ['x,name.ilike.%secret%', 3],
    ['}{', 2],
    [',', 2],
    ['"""', 2],
  ];

  it.each(hostile)(
    'keeps %j inside well-formed clauses',
    (input, expectedClauses) => {
      const filter = buildTextSearchFilter(input);
      expect(filter).not.toBeNull();

      const clauses = splitClauses(filter as string);
      expect(clauses).toHaveLength(expectedClauses);

      expect(clauses[0]).toMatch(/^name\.ilike\."(?:[^"\\]|\\.)*"$/);
      expect(clauses[1]).toMatch(/^short_description\.ilike\."(?:[^"\\]|\\.)*"$/);

      if (expectedClauses === 3) {
        expect(clauses[2]).toMatch(/^keywords\.cs\.\{[^{},"]*\}$/);
      }

      // No clause may be anything but the three columns this method owns.
      for (const clause of clauses) {
        expect(clause).toMatch(
          /^(name|short_description)\.ilike\."|^keywords\.cs\.\{/
        );
      }
    }
  );

  it('keeps a comma the user typed inside the quoted value', () => {
    const filter = buildTextSearchFilter('red, green') as string;
    expect(splitClauses(filter)).toHaveLength(3);
    expect(filter).toContain('name.ilike."%red, green%"');
    expect(filter).toContain('short_description.ilike."%red, green%"');
  });

  it('collapses whitespace and caps the length', () => {
    expect(buildTextSearchFilter('  wooden    toys  ')).toBe(
      'name.ilike."%wooden toys%",' +
        'short_description.ilike."%wooden toys%",' +
        'keywords.cs.{wooden toys}'
    );

    const long = buildTextSearchFilter('x'.repeat(500)) as string;
    expect(long).toContain('name.ilike."%' + 'x'.repeat(200) + '%"');
    expect(long).not.toContain('x'.repeat(201));
  });
});
