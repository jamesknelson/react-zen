import { MirrorHandle } from './MirrorHandle'
import { MirrorSnapshot } from './MirrorSnapshots'

export interface Mirror<Data = any, Key = any, Context extends object = any>
  extends NamespacedMirror<Data, Key, {}> {
  /**
   * Returns a namespace to hold data associated with the specified context.
   */
  namespace(context: Context): NamespacedMirror<Data, Key, Context>
}

export interface NamespacedMirror<Data, Key, Context extends object> {
  context: Context

  /**
   * Allows the current state for a given set of context to be extracted
   * so that it can be sent with a server-rendered page, and then
   * hydrated on the client.
   */
  extractState(): any

  /**
   * Call this with the state returned from `serializeState()` to hydrate the
   * store with data fetched on the server.
   */
  hydrateFromState(extractedState: any): void

  /**
   * Return a handle for the specified key, from which you can get
   * and subscribe to its value.
   */
  key(key: Key): MirrorHandle<Data, Key>

  /**
   * Return a handle for an array of keys, from which you can get
   * and subscribe to multiple values at once.
   */
  keys(keys: Key[]): MirrorHandle<Data[], Key[]>

  /**
   * Return a list of the keys currently stored in the mirror for the given
   * deps array.
   */
  knownKeys(): Key[]

  /**
   * Immediately purges all cached data for this context.
   *
   * Note that even if `purge` is *not* called, data will usually be cleaned up
   * after it no longer has any subscriptions -- depending on how schedulePurge
   * is configured.
   *
   * This is useful for server-side rendering, where once the request is done,
   * you probably don't want any of the data to stick around.
   */
  purge(): void
}

export interface MirrorOptions<Data, Key, Context extends object> {
  /**
   * An optional function for computing string keys from mirror keys,
   * which is required as documents are stored with string keys internally.
   *
   * By default, this uses JSON.stringify()
   */
  computeHashForKey: (key: Key) => string

  /**
   * If provided, this will be called whenever the latest snapshot changes.
   * Then, if a function is returned, it will be called after the snapshot
   * changes again, or after the data is purged.
   *
   * Use this function to perform side effects based on the currently stored
   * data.
   *
   * For example, if this mirror contains lists of keys, you could create an
   * effect to hold those keys within another mirror. Similarly, if this
   * mirror contains items that are indexed in another mirror, you coudl use
   * an effect to invalidate indexes as the indexed items change.
   */
  effect?: MirrorEffectFunction<Data, Key, Context>

  /**
   * This function is called by the mirror to fetch data once a subscription
   * has been made to the specified key.
   *
   * At minimum, the function should return the data associated with the
   * specified key, or `null` if there is no data associated with the given
   * key.
   *
   * If nested data is also available in the response, it can be stored by
   * calling `store` or `update` on this or other mirror namespaces.
   */
  fetch?: MirrorFetchFunction<Data, Key, Context>

  // If supplied, this will be used instead of fetch, and can fetch multiple
  // keys in a single call.
  fetchMany?: MirrorFetchManyFunction<Data, Key, Context>

  /**
   * Configures how to purge data when there are no longer any active
   * subscriptions.
   *
   * If a number is given, data will be purged that many milliseconds after
   * it is no longer required.
   *
   * If a function is given, it'll be called with a purge function that should
   * be called once the data should be purged. This function should also
   * return a function which can be called to *cancel* a purge, should the
   * data become required before the purge takes place.
   */
  schedulePurge: number | MirrorPurgeScheduler<Data, Key, Context>
}

export type MirrorCancelScheduledPurgeFunction = () => void

export type MirrorCleanupEffectFunction = () => void

export type MirrorEffectFunction<Data, Key, Context extends object> = (
  snapshot: MirrorSnapshot<Data, Key>,
  context: Context,
) => MirrorCleanupEffectFunction

export type MirrorFetchFunction<Data, Key, Context extends object> = (
  key: Key,
  context: Context,
  mirror: NamespacedMirror<Data, Key, Context>,
) => Promise<Data>

export type MirrorFetchManyFunction<Data, Key, Context extends object> = (
  key: Key[],
  context: Context,
  mirror: NamespacedMirror<Data, Key, Context>,
) => Promise<Data[]>

export type MirrorPurgeScheduler<Data, Key, Context extends object> = (
  purge: () => void,
  snapshot: MirrorSnapshot<Data, Key>,
  context: Context,
) => MirrorCancelScheduledPurgeFunction

export type MirrorSnapshotComparator<Data, Key> = (
  x: MirrorSnapshot<Data, Key>,
  y: MirrorSnapshot<Data, Key>,
) => number
