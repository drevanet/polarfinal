
"use client";

import {
  Canvas,
  useThree,
} from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
} from "@react-three/drei";
import {
  Suspense,
  useEffect,
  useState,
} from "react";
import * as THREE from "three";

export type FaceKey =
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom";

export type FaceImages = Record<FaceKey, string | null>;

export const EMPTY_IMAGES: FaceImages = {
  front: null,
  back: null,
  left: null,
  right: null,
  top: null,
  bottom: null,
};

type BoxSceneProps = {
  images: FaceImages;
  width: number;
  height: number;
  depth: number;
  boxColor: string;
  backgroundColor: string;
  rotationY: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

/**
 * Loads one independent texture for one material slot.
 */
function FaceMaterial({
  attachTo,
  imageUrl,
  boxColor,
}: {
  attachTo: string;
  imageUrl: string | null;
  boxColor: string;
}) {
  const [texture, setTexture] =
    useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedTexture: THREE.Texture | null = null;

    setTexture(null);

    if (!imageUrl) {
      return () => {
        cancelled = true;
      };
    }

    const loader = new THREE.TextureLoader();

    loader.load(
      imageUrl,
      (loaded) => {
        if (cancelled) {
          loaded.dispose();
          return;
        }

        loadedTexture = loaded;

        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.wrapS = THREE.ClampToEdgeWrapping;
        loaded.wrapT = THREE.ClampToEdgeWrapping;
        loaded.minFilter = THREE.LinearMipmapLinearFilter;
        loaded.magFilter = THREE.LinearFilter;
        loaded.anisotropy = 8;
        loaded.needsUpdate = true;

        setTexture(loaded);
      },
      undefined,
      (error) => {
        if (!cancelled) {
          console.error(
            `Unable to load artwork for ${attachTo}:`,
            error
          );
        }
      }
    );

    return () => {
      cancelled = true;

      if (loadedTexture) {
        loadedTexture.dispose();
      }
    };
  }, [imageUrl, attachTo]);

  return (
    <meshStandardMaterial
      attach={attachTo}
      key={texture?.uuid ?? `empty-${attachTo}`}
      map={texture}
      color={texture ? "#ffffff" : boxColor}
      roughness={0.78}
      metalness={0}
    />
  );
}

/**
 * Reports the WebGL canvas to the editor for PNG export.
 */
function CanvasReporter({
  onCanvasReady,
}: {
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}) {
  const { gl } = useThree();

  useEffect(() => {
    onCanvasReady?.(gl.domElement);
  }, [gl, onCanvasReady]);

  return null;
}

export default function BoxScene({
  images,
  width,
  height,
  depth,
  boxColor,
  backgroundColor,
  rotationY,
  onCanvasReady,
}: BoxSceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{
        position: [65, 48, 75],
        fov: 38,
        near: 0.1,
        far: 1000,
      }}
      gl={{
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl, scene }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        scene.background = new THREE.Color(backgroundColor);
      }}
    >
      <CanvasReporter onCanvasReady={onCanvasReady} />

      <color attach="background" args={[backgroundColor]} />

      <ambientLight intensity={1.1} />

      <directionalLight
        position={[5, 10, 8]}
        intensity={2.2}
      />

      <directionalLight
        position={[-6, 4, -5]}
        intensity={1.1}
      />

      <Suspense fallback={null}>
        <group
          rotation={[
            0,
            THREE.MathUtils.degToRad(rotationY),
            0,
          ]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry
              args={[
                width / 10,
                height / 10,
                depth / 10,
              ]}
            />

            {/* BoxGeometry material slots must remain separate. */}

            <FaceMaterial
              attachTo="material-0"
              imageUrl={images.right}
              boxColor={boxColor}
            />

            <FaceMaterial
              attachTo="material-1"
              imageUrl={images.left}
              boxColor={boxColor}
            />

            <FaceMaterial
              attachTo="material-2"
              imageUrl={images.top}
              boxColor={boxColor}
            />

            <FaceMaterial
              attachTo="material-3"
              imageUrl={images.bottom}
              boxColor={boxColor}
            />

            <FaceMaterial
              attachTo="material-4"
              imageUrl={images.front}
              boxColor={boxColor}
            />

            <FaceMaterial
              attachTo="material-5"
              imageUrl={images.back}
              boxColor={boxColor}
            />
          </mesh>

          {/* Subtle box edges */}
          <lineSegments>
            <edgesGeometry
              args={[
                new THREE.BoxGeometry(
                  width / 10,
                  height / 10,
                  depth / 10
                ),
              ]}
            />
            <lineBasicMaterial
              color="#000000"
              transparent
              opacity={0.22}
            />
          </lineSegments>
        </group>

        <Environment preset="studio" />
      </Suspense>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={25}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
