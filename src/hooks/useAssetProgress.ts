import { useEffect, useState } from 'react'
import * as THREE from 'three'

export function useAssetProgress() {
  const [progress, setProgress] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const mgr = THREE.DefaultLoadingManager

    mgr.onProgress = (_url, itemsLoaded, itemsTotal) => {
      setProgress(itemsTotal > 0 ? itemsLoaded / itemsTotal : 0)
    }

    mgr.onLoad = () => {
      setProgress(1)
      setLoaded(true)
    }

    return () => {
      mgr.onProgress = undefined as unknown as typeof mgr.onProgress
      mgr.onLoad = undefined as unknown as typeof mgr.onLoad
    }
  }, [])

  return { progress, loaded }
}
