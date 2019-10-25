import { MirrorActions } from './MirrorActions'
import { MirrorSnapshot, MirrorPrimedSnapshot } from './MirrorSnapshots'

export type MirrorSubscribeCallback<Data = any, Key = any> = (
  snapshot: MirrorSnapshot<Data, Key>,
) => void
export type MirrorUnsubscribeFunction = () => void

export interface MirrorHandle<Data, Key> extends MirrorActions<Data, Key> {
  key: Key

  /**
   * Returns a promise to a mirrored snapshot for this key.
   */
  get(): Promise<MirrorPrimedSnapshot<Data>>

  /**
   * Returns the latest snapshot for the given data.
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
}
