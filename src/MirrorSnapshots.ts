export interface MirrorSnapshot<Data = any, Key = any> {
  data?: Data

  /**
   * If a fetch failed or projection failed to materialize, this will hold
   * the time, and a reason (if one is supplied) that this occurred.
   * If a subsequent fetch succeeds or `receive` is manually called, this
   * will be removed.
   *
   * In cases where the data comes from multiple sources, this will contain
   * any current failure on any of the sources.
   */
  failure: null | {
    at: number
    reason: any
  }

  /**
   * The document's primary key
   */
  key: Key

  /**
   * Starts as false, and becomes true once `data` is set for the first time.
   *
   * In the case where the data comes from multiple sources, this will only be
   * primed if all sources are primed.
   */
  primed: boolean
}

export interface MirrorPrimedSnapshot<Data = any, Key = any>
  extends MirrorSnapshot<Data, Key> {
  data: Data
  primed: true
}

export interface MirrorDocumentSnapshot<Data = any, Key = any>
  extends MirrorSnapshot<Data, Key> {
  /**
   * Set to true after `invalidate` has been called, and stays true until a
   * more recent version of the document is received.
   */
  invalidated: boolean

  /**
   * Indicates that a fetch is currently taking place, is scheduled to take
   * place, or a change is projected to be received in the near future.
   */
  pending: boolean

  /**
   * Stores the most recent time at which a full version of the document has
   * been received, or an update has been made. If nothing has been received
   * yet, this will be `null`.
   */
  updatedAt: null | number
}

export interface MirrorPrimedDocumentSnapshot<Data = any, Key = any>
  extends MirrorDocumentSnapshot<Data, Key> {
  data: Data
  primed: true
  updatedAt: number
}

export interface MirrorCollectionSnapshot<Data = any, Key = any, Query = any>
  extends MirrorSnapshot<MirrorDocumentSnapshot<Data, Key>, Query> {
  /**
   * Set to true after `invalidate` has been called, and stays true until a
   * more recent version of the full collection is received.
   */
  invalidated: boolean

  /**
   * Indicates that a fetch for the full collection is taking place, or is
   * scheduled to take place. This does not become active when you're fetching
   * individual documents within the collection.
   */
  pending: boolean

  /**
   * Stores the most recent time at which the full collection with index has
   * been received, or an update has been made. If nothing has been received
   * yet, this will be `null`.
   */
  updatedAt: null | number
}

export interface MirrorPrimedCollectionSnapshot<
  Data = any,
  Key = any,
  Query = any
> extends MirrorCollectionSnapshot<Data, Key, Query> {
  data: MirrorDocumentSnapshot<Data, Key>
  primed: true
  updatedAt: number
}
