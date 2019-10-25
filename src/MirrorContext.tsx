import React, { useMemo } from 'react'
import { Mirror } from './Mirror'

export interface MirrorContext {
  namespace: any
  namespaces: Map<Mirror, any>
}

export const MirrorContext = React.createContext<MirrorContext>({
  namespace: null,
  namespaces: new Map(),
})

export function MirrorProvider({ children, namespace, namespaces }) {
  let context = useMemo(() => ({ namespace, namespaces }), [
    namespace,
    namespaces,
  ])

  return <MirrorContext.Provider value={context} children={children} />
}
