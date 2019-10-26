import { useEffect, useMemo, useState } from 'react'
import { MirrorActions } from './MirrorActions'
import { MirrorHandle } from './MirrorHandles'
import { MirrorSnapshot } from './MirrorSnapshots'

export interface UseSnapshotOptions {
  suspend?: boolean
  throwFailures?: boolean
}

useSnapshot.defaultOptions = {
  suspend: true,
  throwFailures: false,
} as UseSnapshotOptions

export function useSnapshot<
  Output extends MirrorSnapshot<any, Key>,
  UpdateData,
  Key,
  Handle extends MirrorHandle<Key, UpdateData, Output>
>(
  handle: MirrorHandle<Key, UpdateData, Output>,
  options: UseSnapshotOptions = {},
): Output & MirrorActions<UpdateData, Key> {
  const {
    suspend = useSnapshot.defaultOptions.suspend,
    throwFailures = useSnapshot.defaultOptions.throwFailures,
  } = options
  let [snapshot, setSnapshot] = useState(handle.getLatest())

  // If the key changes, we want to immediately reflect the new key
  if (snapshot.key != handle.key) {
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
    [snapshot],
  )

  return extendedSnapshot
}
