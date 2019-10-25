export interface MirrorSnapshot<Data = any, Key = any> {
  data?: Data

  /**
   * If a fetch failed or projection failed to materialize, this will hold
   * the time, and a reason (if one is supplied) that this occurred.
   * If a subsequent fetch succeeds or `receive` is manually called, this
   * will be removed.
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
   * Starts as false, and becomes true once `data` is set for the first time.
   */
  primed: boolean

  /**
   * Stores the most recent time at which a full version of the document has
   * been received, or an update has been made. If nothing has been received
   * yet, this will be `null`.
   */
  updatedAt: null | number
}

export interface MirrorPrimedSnapshot<Data = any, Key = any>
  extends MirrorSnapshot<Data, Key> {
  data: Data
  primed: true
  updatedAt: number
}
