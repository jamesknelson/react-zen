import { createMirror } from '../src'

describe('createMirror', () => {
  test('supports namespaces', async () => {
    const mirror = createMirror(
      async (id: number, context: { multiplier: number }) => {
        return {
          test: id * context.multiplier,
        }
      },
    )

    const doubleNamespace = mirror.namespace({ multiplier: 2 })
    const tripleNamespace = mirror.namespace({ multiplier: 3 })

    const doubleSnapshot = await doubleNamespace.key(1).get()
    const tripleSnapshot = await tripleNamespace.key(1).get()

    expect(doubleSnapshot.data).toEqual({
      test: 2,
    })
    expect(tripleSnapshot.data).toEqual({
      test: 3,
    })
  })
})
