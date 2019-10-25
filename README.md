react-zen
=========

<a href="https://www.npmjs.com/package/react-zen"><img alt="NPM" src="https://img.shields.io/npm/v/react-zen.svg"></a>

**A collection of simple utilities for React**

```bash
yarn add react-zen
```

What?
-----

Currently, react-zen contains just two utilities:

- `createMirror(fetcher)`
- `useSnapshot(mirror, key)`

Together, these two functions let you easily consume asynchronous data in your React components. For example, here's how you'd load and display data from a REST API:

```js
import { Suspense } from 'react'
import { createMirror, useSnapshot } from 'react-zen'

// A mirror automatically fetches data as it is required, and purges it
// once it is no longer in use.
const api = createMirror(async url => {
  let response = await fetch(BaseURL+url)
  return response.json()
})

function Screen() {
  // useSnapshot returns your data, loading status, etc.
  let { data } = useSnapshot(api, '/todos/1')
  return <div>{data.complete ? '✔️' : '❌'} {data.title}</div>
}

function App() {
  return (
    // Make sure to wrap your any component that use `useSnapshot()`
    // with a <Suspense> tag.
    <Suspense fallback={<div>Loading</div>}>
      <Screen />
    </Suspense>
  )
}
```

Of course, you'll also want to be able to refresh and update your data. Mirrors and snapshots both have a suite of methods to make this easy. You can see how this works at the live example:

[See a full featured example at CodeSandbox](https://codesandbox.io/s/broken-water-48o94)



API
---

### `useSnapshot()`

Returns a snapshot of one key's data within a mirror.

```typescript
export function useSnapshot(
  mirror: Mirror,
  key: string,
): {
  data: Data
  key: Key

  /**
   * Set to true after `invalidate` has been called, and stays true until a
   * more recent version of the document is received.
   */
  invalidated: boolean

  /**
   * Indicates that a fetch is currently taking place.
   */
  pending: boolean

  /**
   * Starts as false, and becomes true once `data` is set for the first time.
   */
  primed: boolean

  /**
   * Marks this key's currently stored snapshot as invalid.
   *
   * If there's an active subscription, a new version of the data will be
   * fetched.
   */
  invalidate(): void

  /**
   * Stores the given data. If there is no subscription for it, then the data
   * will be immediately scheduled for purge.
   *
   * In the case a function is given, if this key has a non-empty snapshot,
   * then the updater callback will be called and the returned value will be
   * set as the current data. If the key's snapshot is empty or is not yet
   * primed, then an error will be thrown.
   *
   * This will not change the `pending` status of your data.
   */
  update(dataOrUpdater: Data | MirrorUpdaterCallback): void
}
```


### `createMirror()`

Create a mirror of the data in some asynchronous source, where data is automatically fetched as required, and purged when no longer needed.

```typescript
createMirror(fetch: (
  snapshot: Snapshot,
  context: Context
) => Promise<Data>)
```


### `Mirror`

The object returned by `createMirror()`.

```typescript
interface Mirror {
  /**
   * Return a handle for the specified key, from which you can get
   * and subscribe to its value.
   */
  key(key: string): MirrorHandle

  /**
   * Return a list of the keys currently stored in the mirror for the given
   * deps array.
   */
  knownKeys(): Key[]
}
```


### `MirrorHandle`

As returned by `mirror.key(key)`

```typescript
interface MirrorHandle {
  key: Key

  /**
   * Returns a promise to a mirrored snapshot for this key.
   */
  get(): Promise<MirrorPrimedSnapshot<Data>>

  /**
   * Returns the latest snapshot for the given data if any exists, otherwise
   * returns `null`.
   */
  getLatest(): MirrorSnapshot<Data>

  /**
   * Subscribe to updates to snapshots for the given key. Note that this will
   * not immediately emit a snapshot unless subscribing triggers a fetch, and
   * adds/updates a snapshot in the process.
   */
  subscribe(
    callback: MirrorSubscribeCallback<Data, Key>,
  ): MirrorUnsubscribeFunction

  /**
   * Marks this key's currently stored snapshot as invalid.
   *
   * If there's an active subscription, a new version of the data will be
   * fetched.
   */
  invalidate(): void

  /**
   * Stores the given data. If there is no subscription for it, then the data
   * will be immediately scheduled for purge.
   *
   * In the case a function is given, if this key has a non-empty snapshot,
   * then the updater callback will be called and the returned value will be
   * set as the current data. If the key's snapshot is empty or is not yet
   * primed, then an error will be thrown.
   *
   * This will not change the `pending` status of your data.
   */
  update(dataOrUpdater: Data | MirrorUpdaterCallback): void
}
```


Contributing / Plans
--------------------

A number of undocumented placeholder functions currently exist, which throw an exception when called. PRs implementing theses would be very welcome. Functions include:

- `mirror.keys()`, which should allow you to get/subscribe to a list of keys at once. 
- `mirror.hydrateFromState()`, which should allow serialized data to be passed from the server to the client.
- `mirror.purge()`, which should allow all data within a mirror to be immediately purged.
- `handle.predictUpdate()`, which should allow for optimistic updates to be recorded against a key.

A number of *other* features have already been implemented, but need documentation and testing. These include namespaces and `extractState()`, both of which would be useful for server side rendering.

Finally, once `mirror.keys()` has been implemented, it should be possible to create a `CollectionMirror`, which allows you to subscribe to queries/collections as well as individual records.


License
-------

react-zen is MIT licensed.
