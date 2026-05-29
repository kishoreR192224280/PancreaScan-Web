import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AnalyticsDonut3DProps {
  normalPercent: number; // e.g. 70
  abnormalPercent: number; // e.g. 30
  total: number;
}

export default function AnalyticsDonut3D({ normalPercent, abnormalPercent, total }: AnalyticsDonut3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 260;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    const cyanPointLight = new THREE.PointLight(0x00f0ff, 1.5, 20);
    cyanPointLight.position.set(-2, -2, 2);
    scene.add(cyanPointLight);

    // --- Create 3D Donut Split Segments ---
    const donutGroup = new THREE.Group();
    scene.add(donutGroup);

    // Normal: Green color (#00ffaa)
    // Abnormal: Purple color (#a855f7)
    const normRad = (normalPercent / 100) * Math.PI * 2;
    const abnormRad = (abnormalPercent / 100) * Math.PI * 2;

    const radialThickness = 0.5;
    const ringRadius = 1.6;

    if (total === 0) {
      // Gray placeholder torus when no scans exist
      const torusGeom = new THREE.TorusGeometry(ringRadius, radialThickness, 16, 100);
      const torusMat = new THREE.MeshPhongMaterial({
        color: 0x334155,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const torus = new THREE.Mesh(torusGeom, torusMat);
      donutGroup.add(torus);
    } else {
      // Normal Segment (Green)
      if (normalPercent > 0) {
        const normGeom = new THREE.TorusGeometry(
          ringRadius, 
          radialThickness, 
          16, 
          100, 
          normRad
        );
        const normMat = new THREE.MeshPhongMaterial({
          color: 0x00ffaa,
          shininess: 80,
          transparent: true,
          opacity: 0.85,
          wireframe: false,
        });
        const normMesh = new THREE.Mesh(normGeom, normMat);
        normMesh.rotation.z = Math.PI * 0.5; // Start from top
        donutGroup.add(normMesh);
      }

      // Abnormal Segment (Purple)
      if (abnormalPercent > 0) {
        const abnormGeom = new THREE.TorusGeometry(
          ringRadius, 
          radialThickness, 
          16, 
          100, 
          abnormRad
        );
        const abnormMat = new THREE.MeshPhongMaterial({
          color: 0xa855f7,
          shininess: 80,
          transparent: true,
          opacity: 0.85,
          wireframe: false,
        });
        const abnormMesh = new THREE.Mesh(abnormGeom, abnormMat);
        
        // Offset rotation to align right after normal segment
        abnormMesh.rotation.z = Math.PI * 0.5 - normRad;
        donutGroup.add(abnormMesh);
      }
    }

    // Tilted planetary angle
    donutGroup.rotation.x = Math.PI * 0.25;
    donutGroup.rotation.y = Math.PI * 0.1;

    // --- Animation loop ---
    let frameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Satisfying rotating entry animation
      if (elapsedTime < 1.5) {
        const entryScale = THREE.MathUtils.lerp(0.01, 1.0, elapsedTime / 1.5);
        donutGroup.scale.set(entryScale, entryScale, entryScale);
        donutGroup.rotation.z = elapsedTime * 2.0;
      } else {
        // Continuous slow diagnostic rotation
        donutGroup.scale.set(1, 1, 1);
        donutGroup.rotation.z = 1.5 * 2.0 + (elapsedTime - 1.5) * 0.15;
      }

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [normalPercent, abnormalPercent, total]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '260px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* Three.js Canvas Container */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Centered Total Indicator Panel (floating overlay inside the donut) */}
      <div style={{
        position: 'absolute',
        textAlign: 'center',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '-10px'
      }}>
        <span style={{ 
          fontSize: '36px', 
          fontWeight: 800, 
          color: '#ffffff', 
          fontFamily: "'Space Grotesk', sans-serif",
          textShadow: '0 0 15px rgba(255,255,255,0.4)',
          lineHeight: 1
        }}>
          {total}
        </span>
        <span style={{ 
          fontSize: '10px', 
          fontWeight: 700, 
          letterSpacing: '1px', 
          color: '#7f92b0', 
          textTransform: 'uppercase',
          marginTop: '4px'
        }}>
          Total Scans
        </span>
      </div>
    </div>
  );
}
