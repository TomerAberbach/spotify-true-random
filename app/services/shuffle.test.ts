import { fc, test } from '@fast-check/vitest'
import { expect } from 'vitest'
import shuffle from './shuffle.ts'

const compareNumbers = (left: number, right: number): number => left - right

test.prop([fc.array(fc.integer())])(
  `shuffle keeps the same elements`,
  array => {
    const arrayCopy = [...array]

    const shuffledArray = shuffle(array)

    expect(shuffledArray.toSorted(compareNumbers)).toStrictEqual(
      arrayCopy.toSorted(compareNumbers),
    )
  },
)

test.prop([fc.array(fc.anything())])(
  `shuffle returns the same array instance`,
  array => {
    const shuffledArray = shuffle(array)

    expect(shuffledArray).toBe(array)
  },
)

test(`shuffle produces every permutation about equally often`, () => {
  const shuffles = Array.from({ length: 60_000 }, () => shuffle([1, 2, 3]))

  const permutationCounts = Object.values(
    Object.groupBy(shuffles, shuffledArray => shuffledArray.join(`,`)),
  ).map(permutations => permutations!.length)

  // Each bound is more than 5 standard deviations from the expected 10,000, so
  // an unbiased shuffle fails less than once in a million runs
  expect(permutationCounts).toHaveLength(6)
  expect(Math.min(...permutationCounts)).toBeGreaterThan(9500)
  expect(Math.max(...permutationCounts)).toBeLessThan(10_500)
})
