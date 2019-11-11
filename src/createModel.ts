import {
  Model,
  ModelFetchFunction,
  ModelOptions,
  ModelPurgeScheduler,
  NamespacedModel,
} from './Model'
import NamespacedModelImplementation from './NamespacedModelImplementation'

class ModelImplementation<
  Data,
  Key,
  Context extends object
> extends NamespacedModelImplementation<Data, Key, {}> {
  _namespaces: WeakMap<Context, NamespacedModel<Data, Key, Context>>
  _options: ModelOptions<Data, Key, Context>

  constructor(options: ModelOptions<Data, Key, Context>) {
    super(options, {})

    this._namespaces = new WeakMap()
    this._options = options
  }

  namespace(context: Context) {
    let namespace = this._namespaces.get(context)
    if (!namespace) {
      namespace = new NamespacedModelImplementation(this._options, context)
      this._namespaces.set(context, namespace)
    }
    return namespace
  }
}

interface CreateModel {
  <Data, Key, Context extends object>(
    options: Partial<ModelOptions<Data, Key, Context>>,
  ): Model<Data, Key, Context>
  <Data, Key, Context extends object>(
    options: ModelFetchFunction<Data, Key, Context>,
  ): Model<Data, Key, Context>

  defaultComputeHashForKey: (key: any) => string
  defaultSchedulePurge: number | ModelPurgeScheduler<any, any, any>
}

/**
 * Create a new Model from the specified options.
 */
const createModel: CreateModel = function createModel<
  Data,
  Key,
  Context extends object
>(
  options:
    | Partial<ModelOptions<Data, Key, Context>>
    | ModelFetchFunction<Data, Key, Context>,
): Model<Data, Key, Context> {
  if (typeof options === 'function') {
    options = {
      fetch: options,
    }
  }

  return new ModelImplementation({
    computeHashForKey: createModel.defaultComputeHashForKey,
    schedulePurge: createModel.defaultSchedulePurge,

    ...options,
  })
}

createModel.defaultComputeHashForKey = (key: any) =>
  typeof key === 'string' ? key : JSON.stringify(key)

createModel.defaultSchedulePurge = 1000

export { createModel }
