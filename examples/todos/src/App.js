import React, { Suspense, useState, useEffect } from 'react'
import { createMirror, useSnapshot } from 'react-zen'
import './App.css'

const BaseURL = 'https://jsonplaceholder.typicode.com'

// A mirror automatically fetches data as it is required, and purges it
// once it is no longer in use.
const api = createMirror(async url => {
  let response = await fetch(BaseURL + url)
  return response.json()
})

function Screen({ id }) {
  // useSnapshot returns your data, loading status, etc.
  let snapshot = useSnapshot(api, `/todos/${id}`)

  const handleToggle = async () => {
    let request = await fetch(BaseURL + `/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        completed: !snapshot.data.completed,
      }),
      headers: {
        'Content-type': 'application/json; charset=UTF-8',
      },
    })
    snapshot.update(await request.json())
  }

  return (
    <label>
      <input
        type="checkbox"
        checked={snapshot.data.completed}
        onChange={handleToggle}
      />{' '}
      {snapshot.data.title}
    </label>
  )
}

function App() {
  let [knownKeys, setKnownKeys] = useState(api.knownKeys().join(','))
  let [id, setId] = useState(1)

  // Keep re-rendering the known keys
  useEffect(() => {
    let interval = setInterval(() => {
      setKnownKeys(api.knownKeys().join(','))
    }, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="App">
      <h1>Todos</h1>
      <p>
        id:{' '}
        <input
          value={String(id)}
          onChange={event => setId(parseInt(event.target.value || 0))}
        />
      </p>
      {/*
        Make sure to wrap your any component that use `useSnapshot()`
        with a <Suspense> tag.
      */}
      <Suspense fallback={<div>Loading</div>}>
        <Screen id={id} />
      </Suspense>
      <p>cached keys: {knownKeys}</p>
    </div>
  )
}

export default App
