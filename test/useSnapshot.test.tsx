import React, { Suspense } from 'react'
import TestRenderer from 'react-test-renderer'
import { createModel, useSnapshot } from '../src'

const act = TestRenderer.act

describe('useSnapshot', () => {
  test('immediately returns primed snapshots', async () => {
    const model = createModel(async (id: number) => {
      return {
        test: id * 2,
      }
    })

    await model.key(2).get()

    function App() {
      let snapshot = useSnapshot(model.key(2))
      return <>{snapshot.data.test}</>
    }

    let component = TestRenderer.create(<App />)

    expect(component.toJSON()).toEqual('4')
  })

  test('when used with { suspend: false }, immediately returns unprimed snapshots', async () => {
    const model = createModel(async (id: number) => {
      return {
        test: id * 2,
      }
    })

    function App() {
      let snapshot = useSnapshot(model.key(2), { suspend: false })
      return (
        <>
          {JSON.stringify({
            data: snapshot.data,
            pending: snapshot.pending,
            primed: snapshot.primed,
          })}
        </>
      )
    }

    let component = TestRenderer.create(<App />)

    expect(component.toJSON()).toEqual(
      JSON.stringify({
        data: undefined,
        pending: true,
        primed: false,
      }),
    )
  })

  // test('when used without { suspend }, suspends then renders expected data', async () => {
  //   const model = createModel(async (id: number) => {
  //     return {
  //       test: id * 2,
  //     }
  //   })

  //   function App() {
  //     let snapshot = useSnapshot(model, 2)
  //     return <>{snapshot.data.test}</>
  //   }

  //   let component
  //   await act(async () => {
  //     component = TestRenderer.create(
  //       <Suspense fallback={<div />}>
  //         <App />
  //       </Suspense>,
  //     )
  //   })

  //   expect(component.toJSON()).toEqual(
  //     JSON.stringify({
  //       data: undefined,
  //       pending: true,
  //       primed: false,
  //     }),
  //   )
  // })
})
