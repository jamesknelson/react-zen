export type ModelCancelHoldFunction = () => void
export type ModelUpdaterCallback<UpdateData, Key> = (
  data: UpdateData,
  key: Key,
) => UpdateData

export interface ModelActions<UpdateData, Key> {
  /**
   * Instructs the model to keep any snapshots of this key, even when there
   * is no active subscription.
   *
   * Note that holding a key will not actively fetch its contents.
   */
  hold(): ModelCancelHoldFunction

  /**
   * Marks this key's currently stored snapshot as invalid.
   *
   * If there's an active subscription, a new version of the data will be
   * fetched if possible.
   */
  invalidate(): void

  /**
   * Indicate that you expect the snapshot for this key to change in the near
   * future.
   *
   * This prevents any fetches from taking place, sets the `pending`
   * indicator to `true`, and if an updater is provided, sets a temporary
   * value for `data` from until the returned promise resolves. If the
   * returned promise is rejected, the reason will be added to `failure`.
   */
  predictUpdate(
    dataOrUpdater?: UpdateData | ModelUpdaterCallback<UpdateData, Key>,
  ): Promise<void>

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
  update(
    dataOrUpdater: UpdateData | ModelUpdaterCallback<UpdateData, Key>,
  ): void
}
