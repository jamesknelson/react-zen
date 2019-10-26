import {
  MirrorDocumentSnapshot,
  MirrorPrimedDocumentSnapshot,
  MirrorSnapshot,
  MirrorPrimedSnapshot,
} from './MirrorSnapshots'
import { MirrorActions } from './MirrorActions'

export type MirrorCancelHoldFunction = () => void
export type MirrorSubscribeCallback<Output = any> = (output: Output) => void
export type MirrorUnsubscribeFunction = () => void
export type MirrorUpdaterCallback<Data, Key> = (data: Data, key: Key) => Data

export interface MirrorHandle<
  Key,
  UpdateData,
  Output extends MirrorSnapshot<any, Key>,
  PrimedOutput extends Output = Output
> extends MirrorActions<UpdateData, Key> {
  key: Key

  /**
   * Returns a promise to a mirrored snapshot for this key.
   */
  get(): Promise<PrimedOutput>

  /**
   * Returns the latest snapshot for the given data.
   */
  getLatest(): Output

  /**
   * Subscribe to updates to snapshots for the given key. Note that this will
   * not immediately emit a snapshot unless subscribing triggers a fetch, and
   * adds/updates a snapshot in the process.
   */
  subscribe(
    callback: MirrorSubscribeCallback<Output>,
  ): MirrorUnsubscribeFunction
}

export interface MirrorDocumentHandle<Data, Key>
  extends MirrorHandle<
    Key,
    Data,
    MirrorDocumentSnapshot<Data, Key>,
    MirrorPrimedDocumentSnapshot<Data, Key>
  > {}

export interface MirrorDocumentListHandle<Data, Key>
  extends MirrorHandle<
    Key[],
    Data[],
    MirrorSnapshot<MirrorDocumentSnapshot<Data, Key>[], Key[]>,
    MirrorPrimedSnapshot<MirrorDocumentSnapshot<Data, Key>[], Key[]>
  > {}

export interface MirrorCollectionHandle<Data, Key, Query>
  extends MirrorHandle<
    Query,
    { key: Key; data: Data }[],
    MirrorDocumentSnapshot<MirrorDocumentSnapshot<Data, Key>[], Query>,
    MirrorPrimedDocumentSnapshot<
      MirrorPrimedDocumentSnapshot<Data, Key>[],
      Query
    >
  > {}
