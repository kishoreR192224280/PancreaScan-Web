import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeDCanvasProps {
  mode?: 'login' | 'register' | 'forgot_email' | 'forgot_verified' | 'forgot_error' | 'dashboard';
  imageSrc?: string;
  box?: { left: number; top: number; right: number; bottom: number };
}

export default function ThreeDCanvas({ mode = 'login', imageSrc, box }: ThreeDCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Scene Setup ---
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080c1a, 0.015);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    const cyanPointLight = new THREE.PointLight(0x00f0ff, 1.8, 50);
    cyanPointLight.position.set(5, 5, 5);
    scene.add(cyanPointLight);

    // --- Master Group ---
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // --- Global Background: Tiny floating dust-like particles ---
    const dustCount = 80;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustSpeeds: number[] = [];
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      dustPos[i3] = (Math.random() - 0.5) * 30;
      dustPos[i3 + 1] = (Math.random() - 0.5) * 20;
      dustPos[i3 + 2] = (Math.random() - 0.5) * 10;
      dustSpeeds.push(0.002 + Math.random() * 0.004); // Extremely slow dust drift
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.05,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);

    // --- Global Background: Soft blue ambient breathing glow ---
    const glowGeo = new THREE.SphereGeometry(25, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x007aff,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const ambientGlow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(ambientGlow);

    // ==========================================
    // LAYER MODES IMPLEMENTATIONS
    // ==========================================

    // 1. Pancreas Silhouette (rendered in 'login', 'dashboard')
    let pancreas: THREE.Mesh | null = null;
    let wireMat: THREE.MeshBasicMaterial | null = null;

    if (mode === 'login' || mode === 'dashboard') {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4, 0, 0),     // tail
        new THREE.Vector3(-2, 0.8, 0),
        new THREE.Vector3(0, 1, 0),      // body
        new THREE.Vector3(2, 0.6, 0),
        new THREE.Vector3(3.5, -0.2, 0), // neck
        new THREE.Vector3(4.5, -1, 0),   // head
      ]);
      const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.6, 8, false);
      wireMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending
      });
      pancreas = new THREE.Mesh(tubeGeo, wireMat);
      pancreas.scale.set(1.4, 1.4, 0.3);
      modelGroup.add(pancreas);
    }

    // 2. DNA Double Helix (rendered on left side in 'login' mode)
    let dnaGroup: THREE.Group | null = null;
    if (mode === 'login') {
      dnaGroup = new THREE.Group();
      const dnaPointsCount = 20;
      const dnaRadius = 0.7;
      const sphereGeom = new THREE.SphereGeometry(0.06, 8, 8);
      const cyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.6 });
      const blueMat = new THREE.MeshBasicMaterial({ color: 0x007aff, transparent: true, opacity: 0.6 });

      for (let i = 0; i < dnaPointsCount; i++) {
        const y = (i / dnaPointsCount) * 5 - 2.5;
        const theta = (i / dnaPointsCount) * Math.PI * 4;

        const x1 = Math.cos(theta) * dnaRadius;
        const z1 = Math.sin(theta) * dnaRadius;
        const s1 = new THREE.Mesh(sphereGeom, cyanMat);
        s1.position.set(x1, y, z1);
        dnaGroup.add(s1);

        const x2 = Math.cos(theta + Math.PI) * dnaRadius;
        const z2 = Math.sin(theta + Math.PI) * dnaRadius;
        const s2 = new THREE.Mesh(sphereGeom, blueMat);
        s2.position.set(x2, y, z2);
        dnaGroup.add(s2);

        if (i % 2 === 0) {
          const bridgeGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x1, y, z1),
            new THREE.Vector3(x2, y, z2)
          ]);
          const bridgeMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.15 });
          const bridge = new THREE.Line(bridgeGeom, bridgeMat);
          dnaGroup.add(bridge);
        }
      }
      dnaGroup.position.set(-6, 0.5, 0); // Position on the left side
      modelGroup.add(dnaGroup);
    }

    // 3. Soft Scan Pulse Ring (ultrasound pulse expanding)
    let pulseRing: THREE.Mesh | null = null;
    let pulseRingMat: THREE.MeshBasicMaterial | null = null;
    if (mode === 'login') {
      const pulseRingGeo = new THREE.RingGeometry(0.1, 0.25, 32);
      pulseRingMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
      pulseRing.rotation.x = Math.PI / 2;
      modelGroup.add(pulseRing);
    }

    // 4. Molecular structure (rendered in 'register' mode)
    let molGroup: THREE.Group | null = null;
    if (mode === 'register') {
      molGroup = new THREE.Group();
      const atomCount = 16;
      const atomGeom = new THREE.SphereGeometry(0.08, 8, 8);
      const atomMat = new THREE.MeshBasicMaterial({ color: 0x007aff, transparent: true, opacity: 0.7 });
      const atoms: THREE.Mesh[] = [];

      for (let i = 0; i < atomCount; i++) {
        const mesh = new THREE.Mesh(atomGeom, atomMat);
        mesh.position.set(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 4
        );
        molGroup.add(mesh);
        atoms.push(mesh);
      }

      for (let i = 0; i < atomCount; i++) {
        for (let j = i + 1; j < atomCount; j++) {
          const dist = atoms[i].position.distanceTo(atoms[j].position);
          if (dist < 3.2) {
            const lineGeom = new THREE.BufferGeometry().setFromPoints([
              atoms[i].position,
              atoms[j].position
            ]);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x007aff, transparent: true, opacity: 0.16 });
            const line = new THREE.Line(lineGeom, lineMat);
            molGroup.add(line);
          }
        }
      }
      modelGroup.add(molGroup);
    }

    // 5. ECG Heartbeat waves (rendered in 'forgot' modes)
    let ecgLine: THREE.Line | null = null;
    let ecgMat: THREE.LineBasicMaterial | null = null;
    const ecgCount = 120;
    const ecgPositionsArray = new Float32Array(ecgCount * 3);

    if (mode && mode.startsWith('forgot')) {
      const ecgGeom = new THREE.BufferGeometry();
      
      // Determine ECG color based on state
      let ecgColor = 0x00f0ff; // standard
      if (mode === 'forgot_verified') ecgColor = 0x00ffaa; // green
      if (mode === 'forgot_error') ecgColor = 0xff3355; // red

      ecgMat = new THREE.LineBasicMaterial({
        color: ecgColor,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        linewidth: 2
      });

      for (let i = 0; i < ecgCount; i++) {
        const i3 = i * 3;
        ecgPositionsArray[i3] = (i / ecgCount) * 24 - 12; // Spread across x
        ecgPositionsArray[i3 + 1] = 0;
        ecgPositionsArray[i3 + 2] = 0;
      }
      ecgGeom.setAttribute('position', new THREE.BufferAttribute(ecgPositionsArray, 3));
      ecgLine = new THREE.Line(ecgGeom, ecgMat);
      modelGroup.add(ecgLine);
    }

    // 6. Sonar Radar Pulse rings (rendered in 'dashboard' mode)
    let sonarMesh: THREE.Mesh | null = null;
    let sonarMat: THREE.MeshBasicMaterial | null = null;
    if (mode === 'dashboard') {
      const sonarGeo = new THREE.RingGeometry(0.1, 0.2, 32);
      sonarMat = new THREE.MeshBasicMaterial({
        color: 0x007aff,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide
      });
      sonarMesh = new THREE.Mesh(sonarGeo, sonarMat);
      // Place in bottom right corner coordinate
      sonarMesh.position.set(7, -4, 1);
      sonarMesh.rotation.x = Math.PI * 0.1;
      modelGroup.add(sonarMesh);
    }

    // --- Responsive alignment ---
    const isForgotMode = typeof mode === 'string' && mode.startsWith('forgot');
    if (mode === 'login') {
      modelGroup.position.set(width > 1024 ? 2 : 0, 0, 0); // Keep DNA left, shift other elements right
    } else if (mode === 'dashboard') {
      modelGroup.position.set(width > 1024 ? -2 : 0, 0.5, 0);
    } else {
      modelGroup.position.set(0, 0, 0);
    }

    if (width < 1024) {
      modelGroup.position.set(0, 1, 0);
      camera.position.z = 18;
    }

    // --- Animation Loop ---
    let frameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Soft breathing glow background
      glowMat.opacity = 0.02 + Math.sin(elapsedTime * 1.5) * 0.008;

      // Dust float particles movement
      const dPos = dustParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < dustCount; i++) {
        const i3 = i * 3;
        dPos[i3 + 1] += dustSpeeds[i];
        if (dPos[i3 + 1] > 10) {
          dPos[i3 + 1] = -10;
        }
      }
      dustParticles.geometry.attributes.position.needsUpdate = true;

      // Rotate Pancreas Mesh slowly
      if (pancreas) {
        pancreas.rotation.y += 0.0008;
      }

      // Rotate left side DNA helix
      if (dnaGroup) {
        dnaGroup.rotation.y += 0.008;
      }

      // Animate Login scan pulse ring
      if (pulseRing && pulseRingMat) {
        const progress = (elapsedTime % 3.0) / 3.0; // 0 to 1 loop
        const scaleVal = 0.1 + progress * 8.0;
        pulseRing.scale.set(scaleVal, scaleVal, scaleVal);
        pulseRingMat.opacity = 0.45 * (1.0 - progress);
      }

      // Animate Molecular register structure
      if (molGroup) {
        molGroup.rotation.y += 0.002;
        molGroup.rotation.x += 0.001;
      }

      // Animate ECG heartbeat line (Forgot password mode)
      if (ecgLine && ecgMat) {
        const pos = ecgLine.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < ecgCount; i++) {
          const i3 = i * 3;
          const x = pos[i3];
          
          // Continuous heartbeat wave traveling to the right
          const tCoord = (x + elapsedTime * 6.5) % 18 - 9;
          let yVal = 0;

          if (Math.abs(tCoord) < 0.1) {
            yVal = 2.4; // R Peak
          } else if (Math.abs(tCoord + 0.25) < 0.1) {
            yVal = -0.6; // S Peak
          } else if (Math.abs(tCoord - 0.2) < 0.1) {
            yVal = -0.3; // Q Peak
          } else if (Math.abs(tCoord - 0.6) < 0.2) {
            yVal = 0.55; // T Wave
          }

          pos[i3 + 1] = yVal;
        }
        ecgLine.geometry.attributes.position.needsUpdate = true;
      }

      // Animate Sonar dashboard mesh
      if (sonarMesh && sonarMat) {
        const progress = (elapsedTime % 2.5) / 2.5;
        const scaleVal = 0.1 + progress * 4.5;
        sonarMesh.scale.set(scaleVal, scaleVal, scaleVal);
        sonarMat.opacity = 0.3 * (1.0 - progress);
      }

      renderer.render(scene, camera);
    };

    animate();

    // --- Window Resize ---
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      if (w < 1024) {
        modelGroup.position.set(0, 1, 0);
        camera.position.z = 18;
      } else {
        if (mode === 'login') {
          modelGroup.position.set(2, 0, 0);
        } else if (mode === 'dashboard') {
          modelGroup.position.set(-2, 0.5, 0);
        } else {
          modelGroup.position.set(0, 0, 0);
        }
        camera.position.z = 15;
      }
    };
    window.addEventListener('resize', handleResize);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [mode]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} />;
}
