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

  test('after an update, data should be immediately available', async () => {
    let fetched = false
    const mirror = createMirror(async (id: number) => {
      fetched = true
      return {
        test: id * 2,
      }
    })

    const handle = mirror.key(1)

    handle.update({ test: 9 })

    const latestSnapshot = handle.getLatest()
    const awaitedSnapshot = await handle.get()

    expect(latestSnapshot).toEqual(awaitedSnapshot)
    expect(fetched).toBe(false)
  })

  test('when subscribed', async () => {
    let fetched = false
    const mirror = createMirror(async (id: number) => {
      fetched = true
      return {
        test: id * 2,
      }
    })

    const handle = mirror.key(1)

    handle.update({ test: 9 })

    const latestSnapshot = handle.getLatest()
    const awaitedSnapshot = await handle.get()

    expect(awaitedSnapshot.data.test).toEqual(9)
    expect(latestSnapshot).toEqual(awaitedSnapshot)
    expect(fetched).toBe(false)
  })
})
