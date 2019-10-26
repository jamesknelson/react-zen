import { createMirror } from '../src'

describe('MirrorKeyHandle', () => {
  test('supports get', async () => {
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
})
