interface IndexedModelOptions<Data, Key, Query, Context> {
  computeHashForKey?: (key: Key) => string
  computeHashForQuery?: (query: Query) => string

  fetchRecord?: <C extends Context>(
    key: Key,
    mirror: Mirror<Data, Context, Key>,
    context: C,
  ) => Promise<Data>
  fetchCollection?: <C extends Context>(
    query: Query,
    mirror: Mirror<Data, Context, Key>,
    context: C,
  ) => Promise<[Key, Data][]>

  // Allows you to specify a list of queries corresponding to indexes that
  // are guaranteed to have not changed, given the specified received data.
  // This is run within the record mirror's `trackDocument` handler, and all
  // queries not returned will be invalidated. If not provided, *all* queries
  // will be invalidated whenever any document changes (although any queries
  // that are currently refreshing will be continue to have a refreshing status,
  // and assuming the refresh completes successfully, the user will never see
  // an expired status)
  revalidateIndexes?: (
    queries: Query[],
    receivedDocument: Document<Data, Key>,
  ) => void

  schedulePurgeRecord?: boolean | number | PurgeScheduler<Data, Context, Key>
  schedulePurgeCollection?:
    | boolean
    | number
    | PurgeScheduler<Data, Context, Query>

  trackRecord?: (
    document: Document<Data, Key>,
    context: Context,
  ) => CleanupFunction
  trackCollection?: (
    document: Document<Data[], Query>,
    context: Context,
  ) => CleanupFunction

  // An optional hook that can be used by `useDocument` to get the
  // context at a specific point within the React tree.
  useDependencies?: () => Context
}

function createCollectionMirror<Data, Key, Query, Context>(
  options: CollectionMirrorOptions<Data, Key, Query, Context>,
): Mirror<Data, Key, Query, Context> {
  /**
   * note: there is no fetchIndex; only fetchCollection. This ensures that
   * we'll always have records for everything in the collection.
   *
   * - create indexes mirror
   * - create records mirror
   * - track indexes to hold corresponding records
   * - track records to invalidate indexes
   * - purge purges everything
   * - fetchCollection is wrapped to automatically receive a list of records,
   *   as well as an index computed from that list of records
   * - serialize/hydrate just structures/destructures the insides into an object
   * - keys returns queries
   * - hold holds queries
   * - get gets index, and maps the result to get records (should be synchronous for any keys in an index)
   * - subscribe gets index, and maps the index contents to get records (should be synchronous for any keys in an index)
   */
}
