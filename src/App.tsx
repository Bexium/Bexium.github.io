/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Fallback model URL (Official Three.js high-quality sneaker)
const ASSET_URL = "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/MaterialsVariantsShoe/glTF/MaterialsVariantsShoe.gltf";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    model?: THREE.Group;
    lighting: THREE.Group;
  } | null>(null);

  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // --- THREE.JS SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Lighting
    const lighting = new THREE.Group();
    
    // Ambient for base visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    lighting.add(ambientLight);

    // Primary spotlight for dramatic highlight
    const mainSpot = new THREE.SpotLight(0xffffff, 100);
    mainSpot.position.set(5, 5, 5);
    mainSpot.angle = Math.PI / 6;
    mainSpot.penumbra = 0.5;
    lighting.add(mainSpot);

    // Rim light for silhouette
    const rimLight = new THREE.PointLight(0xffffff, 50);
    rimLight.position.set(-5, 0, -5);
    lighting.add(rimLight);

    // Top subtle fill
    const topFill = new THREE.DirectionalLight(0xffffff, 1);
    topFill.position.set(0, 10, 0);
    lighting.add(topFill);

    scene.add(lighting);

    sceneRef.current = { scene, camera, renderer, lighting };

    // --- LOAD MODEL ---
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    const tryLoadLocal = (paths: string[], index: number = 0) => {
      if (index >= paths.length) {
        // Fallback to official Three.js shoe if local files fail
        console.warn('No local model files found, using fallback asset.');
        loadModel(ASSET_URL);
        return;
      }

      loader.load(
        paths[index],
        (gltf) => {
          console.log(`Successfully loaded model: ${paths[index]}`);
          processModel(gltf);
        },
        undefined,
        () => tryLoadLocal(paths, index + 1)
      );
    };

    const processModel = (gltf: any) => {
      const model = gltf.scene;
      
      // Compute bounding box for centering and scaling
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      // Normalize scale: make the longest edge roughly 2 units
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      model.scale.set(scale, scale, scale);
      
      // Center the model relative to its pivot
      model.position.sub(center.multiplyScalar(scale));
      
      const pivot = new THREE.Group();
      pivot.add(model);
      scene.add(pivot);
      sceneRef.current!.model = pivot;

      model.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.envMapIntensity = 1.5;
            child.material.needsUpdate = true;
          }
        }
      });

      initScrollAnimations(pivot);
      setLoading(false);
    };

    const loadModel = (url: string) => {
      loader.load(url, (gltf) => processModel(gltf));
    };

    // Try user-provided filenames and root static path
    tryLoadLocal(['/shoe.glb', './shoe.glb', './airforce.glb', 'shoe.glb', 'airforce.glb']);

    // --- SCROLL ANIMATIONS ---
    function initScrollAnimations(model: THREE.Group) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.5, // Smooth lag effect
          markers: false,
        }
      });

      // Reset initial state
      model.rotation.set(0, -Math.PI / 4, 0);
      model.scale.set(0.8, 0.8, 0.8);
      camera.position.set(0, 0, 8);

      // Section 1 -> 2: Reveal & Move closer
      tl.to(model.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 2 }, 0);
      tl.to(camera.position, { z: 4, duration: 2 }, 0);
      tl.to(model.rotation, { y: Math.PI / 2, duration: 2 }, 0);

      // Section 3: Detail Showcase
      tl.to(model.rotation, { x: 0.2, y: Math.PI * 1.5, duration: 4 }, 2);
      tl.to(camera.position, { x: 1.5, y: 0.5, z: 3, duration: 4 }, 2);

      // Section 4: Deep Zoom into Detail
      tl.to(camera.position, { x: -0.8, y: -0.5, z: 2, duration: 3 }, 6);
      tl.to(model.rotation, { y: Math.PI * 2, duration: 3 }, 6);

      // Section 5: Exit
      tl.to(model.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 2 }, 9);
      tl.to(model.position, { y: -2, duration: 2 }, 9);
      tl.to(scene.background, { r: 0, g: 0, b: 0, duration: 2 }, 9);
    }

    // --- ANIMATION LOOP ---
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      
      // Subtle idle animation if no scrolling is happening (optional, but requested slow rotation)
      if (sceneRef.current?.model && !ScrollTrigger.isScrolling()) {
        // We could add a small tint of rotation here, but the user wants "Everything driven by scroll position"
        // so we stay minimal with idle.
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      ScrollTrigger.getAll().forEach(t => t.kill());
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full overflow-x-hidden bg-[#050505]">
      {/* Loading Screen */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-tighter">
              MAG
            </div>
          </div>
        </div>
      )}

      {/* Three.js Canvas */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-10">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* CONTENT SECTIONS */}
      {/* 500vh container to slow down scroll perception */}
      <div className="relative z-20 h-[600vh]">
        
        {/* Section 1: Hero */}
        <section id="section-1" className="h-screen flex items-center justify-center pointer-events-none sticky top-0">
          <div className="text-center px-6">
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white uppercase italic skew-x-[-10deg] opacity-90 drop-shadow-2xl">
              Nike Mag
            </h1>
            <p className="mt-4 text-xs md:text-sm text-white/50 tracking-[0.4em] uppercase font-medium">
              The Future is Now
            </p>
          </div>
        </section>

        {/* Section 2: Intro Transition */}
        <section id="section-2" className="h-[150vh] flex items-end justify-center pointer-events-none">
          <div className="mb-48 text-center px-6 max-w-xl">
            <p className="text-white/40 text-lg md:text-2xl font-light italic leading-relaxed">
              Step into 2015 and beyond. Experience the legendary self-lacing technology that changed everything.
            </p>
          </div>
        </section>

        {/* Section 3: GLB Showcase (Empty space for model focus) */}
        <section id="section-3" className="h-[150vh] flex items-center justify-between px-12 md:px-24 pointer-events-none">
          <div className="w-full text-right self-end mb-32">
            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-none">ILLUMINATED <br/> DETAILS</h2>
            <p className="text-white/60 mt-2 max-w-sm ml-auto">Electroluminescent panels combined with the iconic high-top silhouette.</p>
          </div>
        </section>

        {/* Section 4: Detail Reveal */}
        <section id="section-4" className="h-[150vh] flex items-center justify-start px-12 md:px-24 pointer-events-none">
           <div className="max-w-md">
            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-none uppercase">
              POWER <br/> <span className="text-white/20">LACES</span>
            </h2>
            <p className="text-white/60 mt-4">
              A revolution in adaptive fit, bringing the silver screen's most famous innovation to life.
            </p>
          </div>
        </section>

        {/* Section 5: Final Hero Exit */}
        <section id="section-5" className="h-screen flex items-center justify-center pointer-events-none sticky top-0">
          <div className="text-center">
             <h3 className="text-2xl md:text-4xl font-light text-white/80 tracking-[0.2em] uppercase">
              BECOME THE ICON
            </h3>
            <button className="mt-12 px-10 py-4 border border-white/20 hover:bg-white hover:text-black transition-all duration-700 text-white tracking-widest uppercase text-xs rounded-full pointer-events-auto">
              Explore Collection
            </button>
          </div>
        </section>

      </div>

      {/* Cinematic Overlays */}
      <div className="fixed inset-0 pointer-events-none z-30 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
      <div className="fixed inset-0 pointer-events-none z-30 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      
      {/* Floating Noise/Grain (Optionally subtle) */}
      <div className="fixed inset-0 pointer-events-none z-40 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
}
