import {
  MirrorEffectFunction,
  MirrorFetchManyFunction,
  MirrorOptions,
  MirrorPurgeScheduler,
  MirrorSnapshotComparator,
  NamespacedMirror,
} from './Mirror'
import { MirrorHandle } from './MirrorHandle'
import { MirrorSnapshot, MirrorPrimedSnapshot } from './MirrorSnapshots'

interface ScheduledPurge {
  canceller?: () => void
}

interface Subscription<Data, Key> {
  hashes: string[]
  callback: (snapshots: MirrorSnapshot<Data, Key>[]) => void
}

export default class NamespacedMirrorImplementation<
  Data,
  Key,
  Context extends object
> implements NamespacedMirror<Data, Key, Context> {
  readonly context: Context

  _config: {
    computeHashForKey: (key: Key) => string
    effect?: MirrorEffectFunction<Data, Key, Context>
    fetchMany: MirrorFetchManyFunction<Data, Key, Context>
    schedulePurge: MirrorPurgeScheduler<Data, Key, Context>
  }
  _effectCleanups: {
    [hash: string]: () => void
  }
  _fetches: {
    [hash: string]: Promise<any>
  }
  _holds: {
    [hash: string]: number
  }
  _scheduledPurges: {
    [hash: string]: ScheduledPurge
  }
  _subscriptions: {
    [hash: string]: Subscription<Data, Key>[]
  }
  _snapshots: {
    [hash: string]: MirrorSnapshot<Data, Key>
  }

  constructor(options: MirrorOptions<Data, Key, Context>, context: Context) {
    this.context = context

    let fetchMany: MirrorFetchManyFunction<Data, Key, Context>
    if (options.fetchMany) {
      fetchMany = options.fetchMany
    } else if (options.fetch) {
      // When not using nested collections, it's okay to fetchMany using
      // fetch.
      const fetch = options.fetch
      fetchMany = (keys: Key[]) =>
        Promise.all(keys.map(key => fetch(key, context, this)))
    } else {
      fetchMany = async (keys: Key[]) => {
        // Wait for a small delay, then if the snapshot is still pending,
        // assume that the data ain't coming and throw an error.
        await new Promise(resolve => setTimeout(resolve))
        const datas: Data[] = []
        for (let snapshot of this._get(keys)) {
          if (snapshot === null || !snapshot.primed) {
            throw new Error(`Unable to fetch`)
          } else {
            datas.push(snapshot.data!)
          }
        }
        return datas
      }
    }

    this._config = {
      computeHashForKey: options.computeHashForKey,
      effect: options.effect,
      fetchMany,
      schedulePurge:
        typeof options.schedulePurge === 'number'
          ? createTimeoutPurgeScheduler(options.schedulePurge)
          : options.schedulePurge,
    }
    this._effectCleanups = {}
    this._fetches = {}
    this._holds = {}
    this._scheduledPurges = {}
    this._subscriptions = {}
    this._snapshots = {}
  }

  hydrateFromState(snapshots: any) {
    // TODO: can't just set state; need to actually update any subscriptions
    // on hydration.
    throw new Error('Unimplemented')
  }

  key(key: Key) {
    // we can't hold on to all snapshots, or we'll end up with a memory leak.
    // instead, snapshots need to hold on to us.
    return new MirrorKeyHandle(this, key)
  }

  keys(keys: Key[]): MirrorHandle<Data[], Key[]> {
    // Need a separate handle implementation for multiple keys
    throw new Error('Unimplemented')
  }

  knownKeys() {
    return Object.values(this._snapshots).map(snapshot => snapshot.key)
  }

  purge() {
    // TODO: can't just clear state; need to actually update any subscriptions
    // on hydration.
    throw new Error('Unimplemented')
  }

  extractState(): any {
    return this._snapshots
  }

  _cancelScheduledPurge(hash: string) {
    const scheduledPurge = this._scheduledPurges[hash]
    if (scheduledPurge) {
      if (scheduledPurge.canceller) {
        scheduledPurge.canceller()
      }
      delete this._scheduledPurges[hash]
    }
  }

  _computeHashes(keys: Key[]) {
    return keys.map(this._config.computeHashForKey)
  }

  async _fetch(keys: Key[], hashes: string[]) {
    const pendingSnapshotsToStore: MirrorSnapshot<Data, Key>[] = []
    const keysToFetch: Key[] = []
    const hashesToFetch: string[] = []

    // Hold the pending snapshots while fetching
    const unhold = this._hold(hashes)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const hash = hashes[i]

      // If there's already a fetch for this key, then don't interrupt it.
      if (this._fetches[hash]) {
        continue
      }

      keysToFetch.push(key)
      hashesToFetch.push(hash)

      // Fetching will change `pending` to true, if it isn't already so.
      let snapshot = this._snapshots[hash]
      if (!snapshot || !snapshot.pending) {
        snapshot = getPendingSnapshot(key, snapshot)
        pendingSnapshotsToStore.push(snapshot)
      }
    }

    // Store any pending statuses
    this._store(pendingSnapshotsToStore)

    if (keysToFetch.length > 0) {
      let updatedSnapshots: MirrorSnapshot<Data, Key>[] = []
      try {
        const promise = this._config.fetchMany(keysToFetch, this.context, this)
        for (let i = 0; i < hashesToFetch.length; i++) {
          this._fetches[hashesToFetch[i]] = promise
        }

        // Careful, this could fail -- and the fetches need to be cleaned up in either case.
        const datas = await promise

        const updatedAt = Date.now()
        for (let i = 0; i < hashesToFetch.length; i++) {
          delete this._fetches[hashesToFetch[i]]
          updatedSnapshots.push(
            getUpdatedSnapshot(keysToFetch[i], datas[i], false, updatedAt),
          )
        }
      } catch (reason) {
        const failedAt = Date.now()
        for (let i = 0; i < hashesToFetch.length; i++) {
          const hash = hashesToFetch[i]
          delete this._fetches[hash]
          updatedSnapshots.push(
            getFailureSnapshot(this._snapshots[hash], reason, failedAt),
          )
        }
      }

      this._store(updatedSnapshots)
    }

    unhold()
  }

  _get(keys: Key[]): (MirrorSnapshot<Data, Key> | null)[] {
    return keys.map(
      key => this._snapshots[this._config.computeHashForKey(key)] || null,
    )
  }

  _hold(hashes: string[]): () => void {
    for (let i = 0; i < hashes.length; i++) {
      // Cancel any scheduled purges of the given keys.
      const hash = hashes[i]
      this._cancelScheduledPurge(hash)

      // Update hold count
      let currentHoldCount = this._holds[hash] || 0
      this._holds[hash] = currentHoldCount + 1
    }

    return () => {
      const hashesToSchedulePurge: string[] = []
      for (let i = 0; i < hashes.length; i++) {
        const hash = hashes![i]
        const currentHoldCount = this._holds[hash]
        if (currentHoldCount > 1) {
          this._holds[hash] = currentHoldCount - 1
        } else {
          delete this._holds[hash]
          hashesToSchedulePurge.push(hash)
        }
      }
      this._schedulePurge(hashesToSchedulePurge)
    }
  }

  _invalidate(keys: Key[]): void {
    const hashes = this._computeHashes(keys)
    const snapshotsToStore: MirrorSnapshot<Data, Key>[] = []
    const keysToFetch: Key[] = []
    const hashesToFetch: string[] = []
    for (let i = 0; i < hashes.length; i++) {
      const key = keys[i]
      const hash = hashes[i]
      const snapshot = this._snapshots[hash]

      // If the has doesn't exist or is already invalid, then there's no need
      // to touch it.
      if (!snapshot || snapshot.invalidated) {
        continue
      }

      snapshotsToStore.push({
        ...snapshot,
        invalidated: true,
      })

      // If the hash has an active subscription, then we'll want to initiate a
      // fetch. We don't worry about held-but-not-subscribed keys, as if a
      // subscription is made, then invalidated snapshots will be fetched then.
      if (this._subscriptions[hash]) {
        keysToFetch.push(key)
        hashesToFetch.push(hash)
      }
    }

    // TODO: This can result in a double update.
    this._store(snapshotsToStore)
    if (keysToFetch.length) {
      this._fetch(keysToFetch, hashesToFetch)
    }
  }

  _performScheduledPurge(hash: string) {
    // Wait a tick to avoid purging something that gets held again in the
    // next tick.
    Promise.resolve().then(() => {
      const scheduledPurge = this._scheduledPurges[hash]
      if (scheduledPurge) {
        // Clean up effects
        const effectCleanup = this._effectCleanups[hash]
        if (effectCleanup) {
          effectCleanup()
          delete this._effectCleanups[hash]
        }

        // Remove stored snapshot data, and remove the scheduled purge
        delete this._snapshots[hash]
        delete this._scheduledPurges[hash]
      }
    })
  }

  _schedulePurge(hashes: string[]) {
    // Schedule purges individually, as purging, scheduling purges and
    // cancelling scheduled purges will never result in UI updates, and thus
    // they don't need batching -- but there *are* situations where we'll need
    // to cancel individual purges from the group.
    for (let i = 0; i < hashes.length; i++) {
      const hash = hashes[i]
      const snapshot = this._snapshots[hash]

      if (this._scheduledPurges[hash] || !snapshot) {
        continue
      }

      const scheduledPurge: ScheduledPurge = {}
      const purge = this._performScheduledPurge.bind(this, hash)
      this._scheduledPurges[hash] = scheduledPurge
      scheduledPurge.canceller = this._config.schedulePurge(
        purge,
        snapshot,
        this.context,
      )
    }
  }

  _store(snapshots: MirrorSnapshot<Data, Key>[]): void {
    const hashes: string[] = []
    const hashesToSchedulePurge: string[] = []
    const updatedSubscriptions: Set<Subscription<Data, Key>> = new Set()

    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i]
      const hash = this._config.computeHashForKey(snapshot.key)

      hashes.push(hash)

      // Update the stored snapshot
      this._snapshots[hash] = snapshot

      // Mark down any subscriptions which need to be run, to run them
      // all in a single update
      let subscriptions = this._subscriptions[hash]
      if (subscriptions) {
        subscriptions.forEach(subscription =>
          updatedSubscriptions.add(subscription),
        )
      }

      // If this snapshot isn't held, schedule a purge
      if (!this._holds[hash]) {
        hashesToSchedulePurge.push(hash)
      }
    }

    // Notify subscribers in a single update
    let subscriptions = Array.from(updatedSubscriptions.values())
    for (let i = 0; i < subscriptions.length; i++) {
      const { hashes, callback } = subscriptions[i]
      callback(hashes.map(hash => this._snapshots[hash]))
    }

    // Run effects, and clean up any previously run effects
    const effect = this._config.effect
    if (effect) {
      for (let i = 0; i < hashes.length; i++) {
        const hash = hashes[i]

        // Get latest snapshot values in case they've changed within the
        // subscription callbacks
        const snapshot = this._snapshots[hash]

        const previousCleanup = this._effectCleanups[hash]
        this._effectCleanups[hash] = effect(snapshot, this.context)
        previousCleanup()
      }
    }

    if (hashesToSchedulePurge.length) {
      this._schedulePurge(hashesToSchedulePurge)
    }
  }

  _subscribe(
    keys: Key[],
    callback: (snapshots: MirrorSnapshot<Data, Key>[]) => void,
  ): () => void {
    const keysToFetch: Key[] = []
    const hashes: string[] = this._computeHashes(keys)
    const hashesToFetch: string[] = []

    const unhold = this._hold(hashes)

    const subscription = {
      hashes,
      callback,
    }

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const hash = hashes[i]

      // Add the same subscription object for every key's hash. This will create
      // duplicates, but they can be easily deduped when changes actually occur.
      let subscriptions = this._subscriptions[hash]
      if (!subscriptions) {
        this._subscriptions[hash] = subscriptions = []
      }
      subscriptions.push(subscription)

      // If there's no snapshot, or a pending snapshot with no fetch, then
      // add this id to the list of ids to fetch.
      if (!this._fetches[hash]) {
        const snapshot = this._snapshots[hash]
        if (!snapshot || snapshot.pending || snapshot.invalidated) {
          keysToFetch.push(key)
          hashesToFetch.push(hash)
        }
      }
    }

    if (keysToFetch.length) {
      this._fetch(keysToFetch, hashesToFetch)
    }

    return () => {
      // Remove subscriptions
      for (let i = 0; i < hashes.length; i++) {
        const hash = hashes[i]
        const subscriptions = this._subscriptions[hash]
        if (subscriptions.length === 1) {
          delete this._subscriptions[hash]
        } else {
          subscriptions.splice(subscriptions.indexOf(subscription), 1)
        }
      }

      unhold()
    }
  }
}

class MirrorKeyHandle<Data, Key> implements MirrorHandle<Data, Key> {
  readonly key: Key
  readonly impl: NamespacedMirrorImplementation<Data, Key, any>

  constructor(impl: NamespacedMirrorImplementation<Data, Key, any>, key: Key) {
    this.key = key
    this.impl = impl
  }

  getLatest() {
    let snapshot = this.impl._get([this.key])[0]
    if (snapshot === null) {
      snapshot = getInitialSnapshot(this.key)
      this.impl._store([snapshot])
    }
    return snapshot
  }

  get(): Promise<MirrorPrimedSnapshot<Data, Key>> {
    const currentSnapshot = this.impl._get([this.key])[0]
    if (currentSnapshot && currentSnapshot.primed) {
      return Promise.resolve(currentSnapshot as MirrorPrimedSnapshot<Data, Key>)
    } else {
      return new Promise<MirrorPrimedSnapshot<Data, Key>>((resolve, reject) => {
        const unsubscribe = this.impl._subscribe([this.key], ([snapshot]) => {
          if (!snapshot.pending) {
            unsubscribe()
            if (snapshot.primed) {
              resolve(snapshot as MirrorPrimedSnapshot<Data, Key>)
            } else {
              reject(snapshot.failure && snapshot.failure.reason)
            }
          }
        })
      })
    }
  }

  hold() {
    return this.impl._hold(this.impl._computeHashes([this.key]))
  }

  invalidate() {
    this.impl._invalidate([this.key])
  }

  async predictUpdate(dataOrUpdater) {
    // TODO:
    // - should be possible to store predicted state for a short period of
    //   time, setting a flag noting that the state is just a prediction.
    throw new Error('Unimplemented')
  }

  subscribe(callback) {
    return this.impl._subscribe([this.key], ([snapshot]) => {
      callback(snapshot)
    })
  }

  update(dataOrUpdater) {
    let data: Data
    let [currentSnapshot] = this.impl._get([this.key])
    if (typeof dataOrUpdater === 'function') {
      if (!currentSnapshot || !currentSnapshot.primed) {
        throw new MissingDataError()
      }
      data = dataOrUpdater(currentSnapshot.data!)
    } else {
      data = dataOrUpdater
    }

    this.impl._store([
      getUpdatedSnapshot(
        this.key,
        data,
        currentSnapshot ? currentSnapshot.pending : false,
        Date.now(),
      ),
    ])
  }
}

function getFailureSnapshot<Data, Key>(
  currentSnapshot: MirrorSnapshot<Data, Key>,
  reason: any,
  failedAt: number,
): MirrorSnapshot<Data, Key> {
  return {
    ...currentSnapshot,
    failure: {
      reason,
      at: failedAt,
    },
    pending: false,
  }
}

function getInitialSnapshot<Key>(key: Key): MirrorSnapshot<any, Key> {
  return {
    data: undefined,
    failure: null,
    key,
    invalidated: false,
    pending: true,
    primed: false,
    updatedAt: null,
  }
}

function getPendingSnapshot<Data, Key>(
  key: Key,
  currentSnapshot: null | MirrorSnapshot<Data, Key>,
): MirrorSnapshot<Data, Key> {
  if (!currentSnapshot) {
    return getInitialSnapshot(key)
  } else if (!currentSnapshot.pending) {
    return {
      ...currentSnapshot,
      pending: true,
    }
  }
  return currentSnapshot
}

function getUpdatedSnapshot<Data, Key>(
  key: Key,
  data: Data,
  pending: boolean,
  updatedAt: number,
): MirrorSnapshot<Data, Key> {
  return {
    data,
    failure: null,
    key,
    invalidated: false,
    pending,
    primed: true,
    updatedAt,
  }
}

function createTimeoutPurgeScheduler<Data, Key, Context extends object>(
  milliseconds: number,
): MirrorPurgeScheduler<Data, Key, Context> {
  return (purge: () => void) => {
    const timeout = setTimeout(purge, milliseconds)
    return () => {
      clearTimeout(timeout)
    }
  }
}

class MissingDataError extends Error {}
