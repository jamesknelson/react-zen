import { createMirror } from '../src'

describe('createMirror', () => {
  test('returns successfuly', async () => {
    const mirror = createMirror(async (id: number) => {
      return {
        test: id * 2,
      }
    })

    const snapshot = await mirror.key(1).get()

    expect(snapshot).toEqual({
      data: { test: 2 },
      failure: null,
      key: 1,
      invalidated: false,
      pending: false,
      primed: true,
      updatedAt: snapshot.updatedAt,
    })
  })

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
