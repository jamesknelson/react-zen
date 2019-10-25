import {
  Mirror,
  MirrorFetchFunction,
  MirrorOptions,
  MirrorPurgeScheduler,
  MirrorSnapshotComparator,
  NamespacedMirror,
} from './Mirror'
import { MirrorSnapshot } from './MirrorSnapshots'
import NamespacedMirrorImplementation from './NamespacedMirrorImplementation'

class MirrorImplementation<
  Data,
  Key,
  Context extends object
> extends NamespacedMirrorImplementation<Data, Key, {}> {
  _namespaces: WeakMap<Context, NamespacedMirror<Data, Key, Context>>
  _options: MirrorOptions<Data, Key, Context>

  constructor(options: MirrorOptions<Data, Key, Context>) {
    super(options, {})

    this._namespaces = new WeakMap()
    this._options = options
  }

  namespace(context: Context) {
    let namespace = this._namespaces.get(context)
    if (!namespace) {
      namespace = new NamespacedMirrorImplementation(this._options, context)
      this._namespaces.set(context, namespace)
    }
    return namespace
  }
}

interface CreateMirror {
  <Data, Key, Context extends object>(
    options: Partial<MirrorOptions<Data, Key, Context>>,
  ): Mirror<Data, Key, Context>
  <Data, Key, Context extends object>(
    options: MirrorFetchFunction<Data, Key, Context>,
  ): Mirror<Data, Key, Context>

  defaultCompareSnapshots: MirrorSnapshotComparator<any, any>
  defaultComputeHashForKey: (key: any) => string
  defaultSchedulePurge: number | MirrorPurgeScheduler<any, any, any>
}

/**
 * Create a new Mirror from the specified options.
 */
const createMirror: CreateMirror = function createMirror<
  Data,
  Key,
  Context extends object
>(
  options:
    | Partial<MirrorOptions<Data, Key, Context>>
    | MirrorFetchFunction<Data, Key, Context>,
): Mirror<Data, Key, Context> {
  if (typeof options === 'function') {
    options = {
      fetch: options,
    }
  }

  return new MirrorImplementation({
    computeHashForKey: createMirror.defaultComputeHashForKey,
    schedulePurge: createMirror.defaultSchedulePurge,

    ...options,
  })
}

createMirror.defaultCompareSnapshots = (
  x: MirrorSnapshot<any, any>,
  y: MirrorSnapshot<any, any>,
) => (x.updatedAt && y.updatedAt ? x.updatedAt - y.updatedAt : 0)

createMirror.defaultComputeHashForKey = (key: any) =>
  typeof key === 'string' ? key : JSON.stringify(key)

createMirror.defaultSchedulePurge = 1000

export { createMirror }
