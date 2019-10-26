import { createMirror } from '../src'

describe('MirrorKeyListHandle', () => {
  test('supports get', async () => {
    const mirror = createMirror(async (id: number) => {
      return {
        test: id * 2,
      }
    })

    const snapshot = await mirror.keys([1, 2]).get()
    const updatedAt = snapshot.data[0].updatedAt

    expect(snapshot).toEqual({
      data: [
        {
          data: { test: 2 },
          failure: null,
          key: 1,
          invalidated: false,
          pending: false,
          primed: true,
          updatedAt,
        },
        {
          data: { test: 4 },
          failure: null,
          key: 2,
          invalidated: false,
          pending: false,
          primed: true,
          updatedAt,
        },
      ],
      failure: null,
      key: [1, 2],
      primed: true,
    })
  })

  test('after an update, data should be immediately available', async () => {
    let fetched = false
    const mirror = createMirror(async (id: number) => {
      fetched = true
      return {
        test: id * 2,
      }
    })

    const handle = mirror.keys([1, 2])

    handle.update([{ test: 8 }, { test: 9 }])

    const latestSnapshot = handle.getLatest()
    const awaitedSnapshot = await handle.get()

    expect(awaitedSnapshot.data.map(snapshot => snapshot.data.test)).toEqual([
      8,
      9,
    ])
    expect(latestSnapshot).toEqual(awaitedSnapshot)
    expect(fetched).toBe(false)
  })
})
