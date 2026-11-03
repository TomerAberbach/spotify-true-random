const shuffle = <Value>(array: Value[]): Value[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const value = array[i]!
    array[i] = array[j]!
    array[j] = value
  }
  return array
}

export default shuffle
