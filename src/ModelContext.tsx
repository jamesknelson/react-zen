import React, { useMemo } from 'react'
import { Model } from './Model'

export interface ModelContext {
  namespace: any
  namespaces: Map<Model, any>
}

export const ModelContext = React.createContext<ModelContext>({
  namespace: null,
  namespaces: new Map(),
})

export function ModelProvider({ children, namespace, namespaces }) {
  let context = useMemo(() => ({ namespace, namespaces }), [
    namespace,
    namespaces,
  ])

  return <ModelContext.Provider value={context} children={children} />
}
