import { useContext } from 'react'
import { Mirror } from './Mirror'
import { MirrorContext } from './MirrorContext'
import { useHandle, UseHandleOptions } from './useHandle'

export interface UseSnapshotOptions {
  suspend?: boolean
  throwFailures?: boolean
}

export function useDocument<Data, Key>(
  mirror: Mirror<Data, Key>,
  key: Key,
  options: UseHandleOptions = {},
) {
  const mirrorContext = useContext(MirrorContext)
  const namespacedMirror = getNamespacedMirror(mirrorContext, mirror)
  const handle = namespacedMirror.key(key)
  return useHandle(handle, options)
}

function getNamespacedMirror<Data, Key>(
  context: MirrorContext,
  mirror: Mirror<Data, Key>,
) {
  const override = context.namespaces.get(mirror)
  if (override) {
    return mirror.namespace(override)
  }
  if (context.namespace) {
    return mirror.namespace(context.namespace)
  }
  return mirror
}
