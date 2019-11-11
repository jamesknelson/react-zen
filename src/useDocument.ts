import { useContext } from 'react'
import { Model } from './Model'
import { ModelContext } from './ModelContext'
import { useSnapshot, UseSnapshotOptions } from './useSnapshot'

export function useDocument<Data, Key>(
  model: Model<Data, Key>,
  key: Key,
  options: UseSnapshotOptions = {},
) {
  const modelContext = useContext(ModelContext)
  const namespacedModel = getNamespacedModel(modelContext, model)
  const handle = namespacedModel.key(key)
  return useSnapshot(handle, options)
}

function getNamespacedModel<Data, Key>(
  context: ModelContext,
  model: Model<Data, Key>,
) {
  const override = context.namespaces.get(model)
  if (override) {
    return model.namespace(override)
  }
  if (context.namespace) {
    return model.namespace(context.namespace)
  }
  return model
}
