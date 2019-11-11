import { createModel } from '../src'

describe('createModel', () => {
  test('supports namespaces', async () => {
    const model = createModel(
      async (id: number, context: { multiplier: number }) => {
        return {
          test: id * context.multiplier,
        }
      },
    )

    const doubleNamespace = model.namespace({ multiplier: 2 })
    const tripleNamespace = model.namespace({ multiplier: 3 })

    const doubleSnapshot = await doubleNamespace.key(1).get()
    const tripleSnapshot = await tripleNamespace.key(1).get()

    expect(doubleSnapshot.data).toEqual({
      test: 2,
    })
    expect(tripleSnapshot.data).toEqual({
      test: 3,
    })
  })

  test('supports effects', async () => {
    let effectEvents = []

    const model = createModel({
      effect: snapshot => {
        effectEvents.push({ type: 'run', snapshot })
        return () => {
          effectEvents.push({ type: 'cleanup' })
        }
      },
      fetch: async (id: number, context: { multiplier: number }) => {
        return {
          test: id * context.multiplier,
        }
      },
      schedulePurge: purge => {
        purge()
      },
    })

    const handle = model.key(1)

    const initialSnapshot = await handle.get()
    handle.update({ test: 9 })
    await new Promise(resolve => setTimeout(resolve))

    console.log(effectEvents)

    expect(effectEvents.length).toBe(4)
  })
})
