import * as THREE from 'three'

export function screenToWorld(nx: number, ny: number, camera: THREE.Camera, targetZ = 0) {
  const ndc = new THREE.Vector3(nx * 2 - 1, -(ny * 2 - 1), 0.5)
  ndc.unproject(camera)
  const dir = ndc.sub(camera.position).normalize()
  const t = (targetZ - camera.position.z) / dir.z
  return camera.position.clone().add(dir.multiplyScalar(t))
}
