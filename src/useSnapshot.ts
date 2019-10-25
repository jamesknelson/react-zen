import { useContext, useEffect, useMemo, useState } from 'react'
import { MirrorActions } from './MirrorActions'
import { Mirror } from './Mirror'
import { MirrorSnapshot } from './MirrorSnapshots'
import { MirrorContext } from './MirrorContext'

export interface UseSnapshotOptions {
  suspend?: boolean
  throwFailures?: boolean
}

export interface Snapshot<Data, Key>
  extends MirrorSnapshot<Data, Key>,
    MirrorActions<Data, Key> {}

useSnapshot.defaultOptions = {
  suspend: true,
  throwFailures: false,
} as UseSnapshotOptions

export function useSnapshot<Data, Key>(
  mirror: Mirror<Data, Key>,
  key: Key,
  options: UseSnapshotOptions = {},
): Snapshot<Data, Key> {
  const {
    suspend = useSnapshot.defaultOptions.suspend,
    throwFailures = useSnapshot.defaultOptions.throwFailures,
  } = options
  const mirrorContext = useContext(MirrorContext)
  const namespacedMirror = getNamespacedMirror(mirrorContext, mirror)
  const handle = namespacedMirror.key(key)
  let [snapshot, setSnapshot] = useState(handle.getLatest())

  // If the key changes, we want to immediately reflect the new key
  if (snapshot.key != key) {
    snapshot = handle.getLatest()
  }

  if (!snapshot.primed) {
    if (suspend) {
      throw handle.get()
    }
  } else if (throwFailures && snapshot.failure) {
    throw snapshot.failure.reason
  }

  useEffect(() => handle.subscribe(setSnapshot))

  const extendedSnapshot = useMemo(
    () => ({
      ...snapshot,

      hold: handle.hold.bind(handle),
      invalidate: handle.invalidate.bind(handle),
      predictUpdate: handle.predictUpdate.bind(handle),
      update: handle.update.bind(handle),
    }),
    [namespacedMirror, snapshot],
  )

  return extendedSnapshot
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
