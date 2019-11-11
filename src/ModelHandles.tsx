import {
  ModelDocumentSnapshot,
  ModelPrimedDocumentSnapshot,
  ModelSnapshot,
  ModelPrimedSnapshot,
} from './ModelSnapshots'
import { ModelActions } from './ModelActions'

export type ModelCancelHoldFunction = () => void
export type ModelSubscribeCallback<Output = any> = (output: Output) => void
export type ModelUnsubscribeFunction = () => void
export type ModelUpdaterCallback<Data, Key> = (data: Data, key: Key) => Data

export interface ModelHandle<
  Key,
  UpdateData,
  Output extends ModelSnapshot<any, Key>,
  PrimedOutput extends Output = Output
> extends ModelActions<UpdateData, Key> {
  key: Key

  /**
   * Returns a promise to a modeled snapshot for this key.
   */
  get(): Promise<PrimedOutput>

  /**
   * Returns the latest snapshot for the given data.
   */
  getCurrentValue(): Output

  /**
   * Subscribe to updates to snapshots for the given key. Note that this will
   * not immediately emit a snapshot unless subscribing triggers a fetch, and
   * adds/updates a snapshot in the process.
   */
  subscribe(callback: ModelSubscribeCallback<Output>): ModelUnsubscribeFunction
}

export interface ModelDocumentHandle<Data, Key>
  extends ModelHandle<
    Key,
    Data,
    ModelDocumentSnapshot<Data, Key>,
    ModelPrimedDocumentSnapshot<Data, Key>
  > {}

export interface ModelDocumentListHandle<Data, Key>
  extends ModelHandle<
    Key[],
    Data[],
    ModelSnapshot<ModelDocumentSnapshot<Data, Key>[], Key[]>,
    ModelPrimedSnapshot<ModelDocumentSnapshot<Data, Key>[], Key[]>
  > {}

export interface ModelCollectionHandle<Data, Key, Query>
  extends ModelHandle<
    Query,
    { key: Key; data: Data }[],
    ModelDocumentSnapshot<ModelDocumentSnapshot<Data, Key>[], Query>,
    ModelPrimedDocumentSnapshot<ModelPrimedDocumentSnapshot<Data, Key>[], Query>
  > {}
