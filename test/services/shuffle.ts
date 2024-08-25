import { fc, test } from '@fast-check/vitest'
import { expect } from 'vitest'
import shuffle from '~/services/shuffle.ts'

test.prop([fc.array(fc.anything())])(
  `shuffle keeps the same elements`,
  array => {
    const arrayCopy = [...array]

    const shuffledArray = shuffle(array)

    expect(shuffledArray).toIncludeSameMembers(arrayCopy)
  },
)

test.prop([fc.array(fc.anything())])(
  `shuffle returns the same array instance`,
  array => {
    const shuffledArray = shuffle(array)

    expect(shuffledArray).toBe(array)
  },
)
