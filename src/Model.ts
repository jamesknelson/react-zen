import { ModelDocumentHandle, ModelDocumentListHandle } from './ModelHandles'
import { ModelDocumentSnapshot } from './ModelSnapshots'

export interface Model<Data = any, Key = any, Context extends object = any>
  extends NamespacedModel<Data, Key, {}> {
  /**
   * Returns a namespace to hold data associated with the specified context.
   */
  namespace(context: Context): NamespacedModel<Data, Key, Context>
}

export interface NamespacedModel<Data, Key, Context extends object> {
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
  key(key: Key): ModelDocumentHandle<Data, Key>

  /**
   * Return a handle for an array of keys, from which you can get
   * and subscribe to multiple values at once.
   */
  keys(keys: Key[]): ModelDocumentListHandle<Data, Key>

  /**
   * Return a list of the keys currently stored in the model for the given
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

export interface ModelOptions<Data, Key, Context extends object> {
  /**
   * An optional function for computing string keys from model keys,
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
   * For example, if this model contains lists of keys, you could create an
   * effect to hold those keys within another model. Similarly, if this
   * model contains items that are indexed in another model, you coudl use
   * an effect to invalidate indexes as the indexed items change.
   */
  effect?: ModelEffectFunction<Data, Key, Context>

  /**
   * This function is called by the model to fetch data once a subscription
   * has been made to the specified key.
   *
   * At minimum, the function should return the data associated with the
   * specified key, or `null` if there is no data associated with the given
   * key.
   *
   * If nested data is also available in the response, it can be stored by
   * calling `store` or `update` on this or other model namespaces.
   */
  fetch?: ModelFetchFunction<Data, Key, Context>

  // If supplied, this will be used instead of fetch, and can fetch multiple
  // keys in a single call.
  fetchMany?: ModelFetchManyFunction<Data, Key, Context>

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
  schedulePurge: number | ModelPurgeScheduler<Data, Key, Context>
}

export type ModelCancelScheduledPurgeFunction = () => void

export type ModelCleanupEffectFunction = () => void

export type ModelEffectFunction<Data, Key, Context extends object> = (
  snapshot: ModelDocumentSnapshot<Data, Key>,
  context: Context,
) => void | undefined | ModelCleanupEffectFunction

export type ModelFetchFunction<Data, Key, Context extends object> = (
  key: Key,
  context: Context,
  model: NamespacedModel<Data, Key, Context>,
) => Promise<Data>

export type ModelFetchManyFunction<Data, Key, Context extends object> = (
  key: Key[],
  context: Context,
  model: NamespacedModel<Data, Key, Context>,
) => Promise<Data[]>

export type ModelPurgeScheduler<Data, Key, Context extends object> = (
  purge: () => void,
  snapshot: ModelDocumentSnapshot<Data, Key>,
  context: Context,
) => void | undefined | ModelCancelScheduledPurgeFunction
