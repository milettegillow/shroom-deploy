import * as THREE from 'three'

export function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}


export function lerpOpacity(mat: THREE.MeshBasicMaterial, target: number, rate = 0.15) {
  mat.opacity += (target - mat.opacity) * rate
}
