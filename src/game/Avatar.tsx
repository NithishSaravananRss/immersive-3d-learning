import { Html, useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AnimationAction,
  AnimationClip,
  Box3,
  Group,
  MathUtils,
  Mesh,
  Object3D,
  Vector3
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useWorld } from "./world";

const desiredAvatarHeight = 1.8;
const avatarModelPath = "/models/jake.glb";
const walkingAnimationPath = "/models/Walking.fbx";

type AvatarProps = {
  animatePreview?: boolean;
  floatingLabel: string;
  mode: "player" | "preview" | "remote";
  position: [number, number, number];
  rotationY?: number;
  showLabel?: boolean;
  speed?: number;
  visible?: boolean;
};

type GltfAvatar = {
  animations: AnimationClip[];
  scene: Group;
};

function findAction(
  actions: Record<string, AnimationAction | null>,
  matcher: RegExp
) {
  const name = Object.keys(actions).find((key) => matcher.test(key));

  return name ? actions[name] : null;
}

function prepareAvatarMeshes(object: Object3D) {
  object.traverse((child) => {
    if ((child as Mesh).isMesh) {
      const mesh = child as Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

export function Avatar({
  animatePreview = true,
  floatingLabel,
  mode,
  position,
  rotationY = 0,
  showLabel = true,
  speed = 0,
  visible = true
}: AvatarProps) {
  const groupRef = useRef<Group>(null);
  const avatarRef = useRef<Group>(null);
  const currentActionRef = useRef<AnimationAction | null>(null);
  const playerPosition = useWorld((state) => state.playerPosition);
  const playerSpeed = useWorld((state) => state.playerSpeed);
  const playerYaw = useWorld((state) => state.playerYaw);

  const gltf = useGLTF(avatarModelPath) as unknown as GltfAvatar;
  const walkingFbx = useFBX(walkingAnimationPath) as unknown as GltfAvatar;
  const scene = useMemo(() => clone(gltf.scene) as Group, [gltf.scene]);
  const walkingClips = useMemo(
    () =>
      walkingFbx.animations.map((clip, index) => {
        const next = clip.clone();
        next.name = `walking-fbx-${index}`;

        return next;
      }),
    [walkingFbx.animations]
  );
  const animationClips = useMemo(
    () => [...walkingClips, ...(gltf.animations ?? [])],
    [gltf.animations, walkingClips]
  );
  const { actions } = useAnimations(animationClips, avatarRef);

  useEffect(() => {
    if (!avatarRef.current) {
      return;
    }

    const bounds = new Box3().setFromObject(scene);
    const size = new Vector3();
    const center = new Vector3();

    bounds.getSize(size);
    bounds.getCenter(center);

    const safeHeight = size.y || 1;
    const scale = desiredAvatarHeight / safeHeight;

    avatarRef.current.scale.setScalar(scale);
    avatarRef.current.position.set(-center.x * scale, -(bounds.min.y * scale), -center.z * scale);
    prepareAvatarMeshes(scene);
  }, [scene]);

  useEffect(() => {
    if (!actions) {
      return;
    }

    const idleAction =
      findAction(actions, /idle|stand|breath|wait/i) ??
      Object.values(actions).find(Boolean) ??
      null;
    const walkAction =
      findAction(actions, /walk|walking-fbx|jog|locomotion|move|mixamo|take/i) ??
      Object.values(actions).find(Boolean) ??
      null;
    const runAction = findAction(actions, /run|sprint/i);

    const activeSpeed = mode === "player" ? playerSpeed : speed;
    const targetAction =
      activeSpeed > 6.7 ? runAction ?? walkAction ?? idleAction
      : activeSpeed > 0.25 ? walkAction ?? idleAction
      : idleAction;

    if (!targetAction) {
      return;
    }

    const previousAction = currentActionRef.current;

    if (targetAction !== previousAction) {
      if (previousAction) {
        previousAction.fadeOut(0.2);
      }

      targetAction.reset().fadeIn(0.2).play();
      currentActionRef.current = targetAction;
    }

    const activeAction = currentActionRef.current;

    if (!activeAction) {
      return;
    }

    if (walkAction && activeAction === walkAction) {
      if (activeSpeed <= 0.08) {
        activeAction.paused = true;
      } else {
        activeAction.paused = false;
        activeAction.setEffectiveTimeScale(MathUtils.clamp(activeSpeed / 3.4, 0.8, 1.75));
      }
    } else {
      activeAction.paused = false;
      activeAction.setEffectiveTimeScale(1);
    }
  }, [actions, mode, playerSpeed, speed]);

  useEffect(() => {
    return () => {
      Object.values(actions ?? {}).forEach((action) => action?.stop());
      currentActionRef.current = null;
    };
  }, [actions]);

  useFrame((state, delta) => {
    const root = groupRef.current;

    if (!root) {
      return;
    }

    if (mode === "player") {
      root.position.set(
        playerPosition[0],
        playerPosition[1] - 0.95,
        playerPosition[2]
      );
      root.rotation.y = MathUtils.damp(root.rotation.y, playerYaw, 10, delta);
      root.visible = visible;
      return;
    }

    if (mode === "remote") {
      root.position.set(position[0], position[1] - 0.95, position[2]);
      root.rotation.y = MathUtils.damp(root.rotation.y, rotationY, 10, delta);
      root.visible = visible;
      return;
    }

    if (animatePreview) {
      root.rotation.y += delta * 0.45;
      root.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.15) * 0.08;
      return;
    }

    root.rotation.y = rotationY;
    root.position.y = position[1];
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation-y={rotationY}
      visible={visible}
    >
      <group ref={avatarRef}>
        <primitive object={scene} />
      </group>

      {showLabel ? (
        <Html position={[0, 2.4, 0]} center distanceFactor={14}>
          <div className="avatar-label">{floatingLabel}</div>
        </Html>
      ) : null}
    </group>
  );
}

useGLTF.preload(avatarModelPath);
useFBX.preload(walkingAnimationPath);
