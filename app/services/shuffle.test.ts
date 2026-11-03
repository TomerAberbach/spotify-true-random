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
