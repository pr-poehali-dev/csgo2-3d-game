import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface Weapon {
  id: string;
  name: string;
  price: number;
  ammo: number;
  damage: number;
}

interface Bot {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  health: number;
  target: THREE.Vector3;
  lastShot: number;
}

const WEAPONS: Weapon[] = [
  { id: 'pistol', name: 'Пистолет', price: 500, ammo: 20, damage: 15 },
  { id: 'rifle', name: 'Автомат AK-47', price: 2700, ammo: 30, damage: 35 },
  { id: 'sniper', name: 'Снайперская AWP', price: 4750, ammo: 10, damage: 100 },
  { id: 'shotgun', name: 'Дробовик', price: 1200, ammo: 8, damage: 70 },
];

const Index = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMapSelect, setShowMapSelect] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [selectedMap, setSelectedMap] = useState('dust2');
  const [selectedMode, setSelectedMode] = useState('competitive');
  const [graphicsQuality, setGraphicsQuality] = useState('high');
  const [gameStarted, setGameStarted] = useState(false);
  const [showBuyMenu, setShowBuyMenu] = useState(false);
  const [showCheats, setShowCheats] = useState(false);
  const [showVisuals, setShowVisuals] = useState(false);
  const [money, setMoney] = useState(16000);
  const [health, setHealth] = useState(100);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>(WEAPONS[0]);
  const [ammo, setAmmo] = useState(20);
  const [kills, setKills] = useState(0);
  
  const shootSoundRef = useRef<HTMLAudioElement | null>(null);
  const hitSoundRef = useRef<HTMLAudioElement | null>(null);
  const killSoundRef = useRef<HTMLAudioElement | null>(null);
  const [cheatsEnabled, setCheatsEnabled] = useState({
    aimbot: false,
    esp: false,
    speed: false,
    fly: false,
    noclip: false,
  });
  const [visualsEnabled, setVisualsEnabled] = useState({
    china: false,
    fullbright: false,
    rainbow: false,
  });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const botsRef = useRef<Bot[]>([]);
  const playerPosRef = useRef(new THREE.Vector3(0, 1.2, 0));
  const playerRotRef = useRef({ yaw: 0, pitch: 0 });
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const weaponMeshRef = useRef<THREE.Group | null>(null);
  const mouseLockedRef = useRef(false);
  const [cameraMode, setCameraMode] = useState<'first' | 'third' | 'front'>('first');
  const playerModelRef = useRef<THREE.Group | null>(null);
  const chinaHatRef = useRef<THREE.Mesh | null>(null);
  const fireTrailRef = useRef<THREE.Points[]>([]);

  useEffect(() => {
    shootSoundRef.current = new Audio('data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=');
    hitSoundRef.current = new Audio('data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=');
    killSoundRef.current = new Audio('data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=');
    
    setTimeout(() => {
      setIsLoading(false);
      setShowMainMenu(true);
    }, 2000);
  }, []);

  const startGame = () => {
    setShowMainMenu(false);
    setShowModeSelect(true);
  };

  const selectMode = (mode: string) => {
    setSelectedMode(mode);
    setShowModeSelect(false);
    setShowMapSelect(true);
  };

  const selectMap = (map: string) => {
    setSelectedMap(map);
    setShowMapSelect(false);
    setGameStarted(true);
  };

  useEffect(() => {
    if (!mountRef.current || isLoading || !gameStarted) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 0, 250);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.copy(playerPosRef.current);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    scene.add(sunLight);

    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const createBox = (x: number, y: number, z: number, w: number, h: number, d: number, color: number) => {
      const geometry = new THREE.BoxGeometry(w, h, d);
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.3,
      });
      const box = new THREE.Mesh(geometry, material);
      box.position.set(x, y, z);
      box.castShadow = true;
      box.receiveShadow = true;
      scene.add(box);
      return box;
    };

    createBox(40, 2, 0, 6, 4, 6, 0xb45309);
    createBox(-40, 2, 0, 6, 4, 6, 0xb45309);
    createBox(0, 2, 40, 6, 4, 6, 0xb45309);
    createBox(0, 2, -40, 6, 4, 6, 0xb45309);
    createBox(25, 1.5, 25, 12, 3, 3, 0x6b7280);
    createBox(-25, 1.5, -25, 12, 3, 3, 0x6b7280);
    createBox(30, 4, -30, 8, 8, 8, 0x991b1b);
    createBox(-30, 3, 30, 15, 6, 6, 0x065f46);
    createBox(50, 2, 50, 10, 4, 10, 0x92400e);
    createBox(-50, 2, -50, 10, 4, 10, 0x92400e);
    createBox(60, 1.5, 0, 5, 3, 20, 0x4b5563);
    createBox(-60, 1.5, 0, 5, 3, 20, 0x4b5563);
    createBox(0, 1.5, 60, 20, 3, 5, 0x4b5563);
    createBox(0, 1.5, -60, 20, 3, 5, 0x4b5563);
    createBox(35, 2, -50, 8, 4, 8, 0x7c2d12);
    createBox(-35, 2, 50, 8, 4, 8, 0x7c2d12);

    const createWeaponMesh = () => {
      const weaponGroup = new THREE.Group();
      
      const barrelGeometry = new THREE.CylinderGeometry(0.025, 0.03, 1.0, 16);
      const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        metalness: 0.95,
        roughness: 0.2,
      });
      const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(0.5, -0.12, -0.35);
      weaponGroup.add(barrel);

      const receiverGeometry = new THREE.BoxGeometry(0.25, 0.12, 0.5);
      const receiverMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.8,
        roughness: 0.3,
      });
      const receiver = new THREE.Mesh(receiverGeometry, receiverMaterial);
      receiver.position.set(0.05, -0.12, -0.35);
      weaponGroup.add(receiver);

      const magazineGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.15);
      const magazineMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d2d2d,
        metalness: 0.6,
        roughness: 0.5,
      });
      const magazine = new THREE.Mesh(magazineGeometry, magazineMaterial);
      magazine.position.set(0.05, -0.3, -0.3);
      weaponGroup.add(magazine);

      const stockGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.3);
      const stockMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 0.8,
      });
      const stock = new THREE.Mesh(stockGeometry, stockMaterial);
      stock.position.set(-0.15, -0.12, -0.3);
      weaponGroup.add(stock);

      const gripGeometry = new THREE.BoxGeometry(0.06, 0.18, 0.1);
      const gripMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
      });
      const grip = new THREE.Mesh(gripGeometry, gripMaterial);
      grip.position.set(0, -0.28, -0.28);
      weaponGroup.add(grip);

      const sightGeometry = new THREE.BoxGeometry(0.04, 0.04, 0.06);
      const sightMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        metalness: 0.9,
      });
      const sight = new THREE.Mesh(sightGeometry, sightMaterial);
      sight.position.set(0.15, -0.05, -0.35);
      weaponGroup.add(sight);

      weaponGroup.position.set(0.35, -0.28, -0.55);
      return weaponGroup;
    };

    const weaponMesh = createWeaponMesh();
    camera.add(weaponMesh);
    scene.add(camera);
    weaponMeshRef.current = weaponMesh;

    const createPlayerModel = () => {
      const playerGroup = new THREE.Group();
      
      const bodyGeometry = new THREE.CapsuleGeometry(0.2, 0.7, 4, 8);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        roughness: 0.7,
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.6;
      playerGroup.add(body);

      const headGeometry = new THREE.SphereGeometry(0.18, 8, 8);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.1;
      playerGroup.add(head);

      playerGroup.visible = false;
      return playerGroup;
    };

    const playerModel = createPlayerModel();
    scene.add(playerModel);
    playerModelRef.current = playerModel;

    const createChinaHat = () => {
      const hatGeometry = new THREE.ConeGeometry(0.5, 0.3, 8);
      const hatMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6b6b,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
      });
      const hat = new THREE.Mesh(hatGeometry, hatMaterial);
      hat.visible = false;
      return hat;
    };

    const chinaHat = createChinaHat();
    scene.add(chinaHat);
    chinaHatRef.current = chinaHat;

    const createBot = (x: number, z: number) => {
      const botGeometry = new THREE.CapsuleGeometry(0.25, 0.8, 4, 8);
      const botMaterial = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.6,
        metalness: 0.2,
      });
      const botMesh = new THREE.Mesh(botGeometry, botMaterial);
      botMesh.position.set(x, 0.7, z);
      botMesh.castShadow = true;
      scene.add(botMesh);

      const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.7,
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.set(0, 0.7, 0);
      botMesh.add(head);

      return {
        mesh: botMesh,
        position: new THREE.Vector3(x, 0.7, z),
        velocity: new THREE.Vector3(),
        health: 100,
        target: new THREE.Vector3(),
        lastShot: 0,
      };
    };

    botsRef.current = [
      createBot(45, 20),
      createBot(-45, -20),
      createBot(55, -40),
      createBot(-30, 50),
      createBot(60, 30),
      createBot(-60, -30),
    ];

    const obstacles: THREE.Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object !== ground) {
        obstacles.push(object);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      keysRef.current[e.code] = true;

      if (e.key.toLowerCase() === 'b') {
        setShowBuyMenu((prev) => !prev);
      }
      if (e.key.toLowerCase() === 'q') {
        setShowCheats((prev) => !prev);
      }
      if (e.key.toLowerCase() === 'p') {
        setShowVisuals((prev) => !prev);
      }
      if (e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 'д') {
        setCameraMode((prev) => {
          if (prev === 'first') return 'third';
          if (prev === 'third') return 'front';
          return 'first';
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
      keysRef.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseLockedRef.current) return;

      const sensitivity = 0.002;
      playerRotRef.current.yaw -= e.movementX * sensitivity;
      playerRotRef.current.pitch -= e.movementY * sensitivity;
      playerRotRef.current.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, playerRotRef.current.pitch));
    };

    const handleClick = () => {
      if (!mouseLockedRef.current) {
        renderer.domElement.requestPointerLock();
      } else {
        if (ammo > 0) {
          setAmmo((prev) => prev - 1);
          
          if (shootSoundRef.current) {
            shootSoundRef.current.currentTime = 0;
            shootSoundRef.current.volume = 0.3;
            shootSoundRef.current.play().catch(() => {});
          }
          
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

          const intersects = raycaster.intersectObjects(
            botsRef.current.map((bot) => bot.mesh),
            true
          );

          if (intersects.length > 0) {
            const firstIntersect = intersects[0];
            const hitBot = botsRef.current.find(
              (bot) => bot.mesh === firstIntersect.object || bot.mesh === firstIntersect.object.parent
            );

            if (hitBot) {
              if (cheatsEnabled.aimbot) {
                hitBot.health = 0;
              } else {
                hitBot.health -= currentWeapon.damage;
              }
            }

            if (hitBot && hitBot.health <= 0) {
              scene.remove(hitBot.mesh);
              botsRef.current = botsRef.current.filter((bot) => bot !== hitBot);
              setKills((prev) => prev + 1);
              setMoney((prev) => prev + 300);
              
              if (killSoundRef.current) {
                killSoundRef.current.currentTime = 0;
                killSoundRef.current.volume = 0.4;
                killSoundRef.current.play().catch(() => {});
              }
            } else if (hitBot) {
              if (hitSoundRef.current) {
                hitSoundRef.current.currentTime = 0;
                hitSoundRef.current.volume = 0.3;
                hitSoundRef.current.play().catch(() => {});
              }
            }
          }

          if (weaponMeshRef.current) {
            weaponMeshRef.current.position.z += 0.1;
            setTimeout(() => {
              if (weaponMeshRef.current) weaponMeshRef.current.position.z -= 0.1;
            }, 50);
          }
        }
      }
    };

    const handlePointerLockChange = () => {
      mouseLockedRef.current = document.pointerLockElement === renderer.domElement;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    const animate = () => {
      requestAnimationFrame(animate);

      const speed = cheatsEnabled.speed ? 0.2 : 0.08;
      const moveVector = new THREE.Vector3();

      if (keysRef.current['w'] || keysRef.current['ц']) {
        moveVector.z -= speed;
      }
      if (keysRef.current['s'] || keysRef.current['ы']) {
        moveVector.z += speed;
      }
      if (keysRef.current['a'] || keysRef.current['ф']) {
        moveVector.x -= speed;
      }
      if (keysRef.current['d'] || keysRef.current['в']) {
        moveVector.x += speed;
      }
      if ((keysRef.current[' '] || keysRef.current['Space']) && cheatsEnabled.fly) {
        moveVector.y += speed;
      }
      if (keysRef.current['shift'] && cheatsEnabled.fly) {
        moveVector.y -= speed;
      }

      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotRef.current.yaw);
      
      if (!cheatsEnabled.noclip) {
        const newPosition = playerPosRef.current.clone().add(moveVector);
        let canMove = true;

        const playerBox = new THREE.Box3(
          new THREE.Vector3(newPosition.x - 0.3, newPosition.y - 0.6, newPosition.z - 0.3),
          new THREE.Vector3(newPosition.x + 0.3, newPosition.y + 0.6, newPosition.z + 0.3)
        );

        for (const obstacle of obstacles) {
          const obstacleBox = new THREE.Box3().setFromObject(obstacle);
          if (playerBox.intersectsBox(obstacleBox)) {
            canMove = false;
            break;
          }
        }

        if (canMove) {
          playerPosRef.current.add(moveVector);
        }
      } else {
        playerPosRef.current.add(moveVector);
      }

      if (!cheatsEnabled.fly && !cheatsEnabled.noclip) {
        playerPosRef.current.y = 1.2;
      }

      if (cameraMode === 'first') {
        camera.position.copy(playerPosRef.current);
        if (weaponMeshRef.current) weaponMeshRef.current.visible = true;
        if (playerModelRef.current) playerModelRef.current.visible = false;
      } else if (cameraMode === 'third') {
        const offset = new THREE.Vector3(0, 1, 3);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotRef.current.yaw);
        camera.position.copy(playerPosRef.current).add(offset);
        camera.position.y += 1;
        if (weaponMeshRef.current) weaponMeshRef.current.visible = false;
        if (playerModelRef.current) {
          playerModelRef.current.visible = true;
          playerModelRef.current.position.copy(playerPosRef.current);
          playerModelRef.current.rotation.y = playerRotRef.current.yaw;
        }
      } else if (cameraMode === 'front') {
        const offset = new THREE.Vector3(0, 1, -3);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotRef.current.yaw);
        camera.position.copy(playerPosRef.current).add(offset);
        camera.position.y += 1;
        if (weaponMeshRef.current) weaponMeshRef.current.visible = false;
        if (playerModelRef.current) {
          playerModelRef.current.visible = true;
          playerModelRef.current.position.copy(playerPosRef.current);
          playerModelRef.current.rotation.y = playerRotRef.current.yaw + Math.PI;
        }
      }
      camera.rotation.set(playerRotRef.current.pitch, playerRotRef.current.yaw, 0, 'YXZ');

      if (chinaHatRef.current && visualsEnabled.china) {
        chinaHatRef.current.visible = true;
        chinaHatRef.current.position.copy(playerPosRef.current);
        chinaHatRef.current.position.y += 1.8;
        chinaHatRef.current.rotation.y += 0.05;
      } else if (chinaHatRef.current) {
        chinaHatRef.current.visible = false;
      }

      if (moveVector.length() > 0.01) {
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 5;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
          positions[i * 3] = playerPosRef.current.x + (Math.random() - 0.5) * 0.5;
          positions[i * 3 + 1] = playerPosRef.current.y + Math.random() * 0.3;
          positions[i * 3 + 2] = playerPosRef.current.z + (Math.random() - 0.5) * 0.5;
          
          colors[i * 3] = 1.0;
          colors[i * 3 + 1] = Math.random() * 0.5;
          colors[i * 3 + 2] = 0.0;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
          size: 0.2,
          vertexColors: true,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);
        fireTrailRef.current.push(particles);
        
        setTimeout(() => {
          scene.remove(particles);
          fireTrailRef.current = fireTrailRef.current.filter(p => p !== particles);
        }, 500);
      }

      const currentTime = Date.now();
      botsRef.current.forEach((bot) => {
        const directionToPlayer = new THREE.Vector3()
          .subVectors(playerPosRef.current, bot.position)
          .normalize();

        const distanceToPlayer = bot.position.distanceTo(playerPosRef.current);
        
        if (distanceToPlayer > 8 && distanceToPlayer < 80) {
          bot.velocity.copy(directionToPlayer).multiplyScalar(0.05);
          bot.position.add(bot.velocity);
          bot.mesh.position.copy(bot.position);
        }

        bot.mesh.lookAt(new THREE.Vector3(
          playerPosRef.current.x,
          bot.position.y,
          playerPosRef.current.z
        ));

        if (distanceToPlayer < 50 && currentTime - bot.lastShot > 2000) {
          bot.lastShot = currentTime;
          
          const raycaster = new THREE.Raycaster();
          const botDirection = new THREE.Vector3()
            .subVectors(playerPosRef.current, bot.position)
            .normalize();
          raycaster.set(bot.position, botDirection);

          const intersects = raycaster.intersectObjects(obstacles, true);
          const playerDistance = bot.position.distanceTo(playerPosRef.current);
          
          const canSeePlayer = intersects.length === 0 || intersects[0].distance > playerDistance;
          
          if (canSeePlayer && Math.random() > 0.3) {
            const damage = Math.floor(Math.random() * 15) + 10;
            setHealth((prev) => Math.max(0, prev - damage));
            
            const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const flashMaterial = new THREE.MeshBasicMaterial({
              color: 0xffff00,
              transparent: true,
              opacity: 1,
            });
            const flash = new THREE.Mesh(flashGeometry, flashMaterial);
            flash.position.copy(bot.position);
            flash.position.y += 0.5;
            scene.add(flash);
            
            setTimeout(() => scene.remove(flash), 100);
          }
        }
      });

      if (visualsEnabled.fullbright) {
        scene.fog = null;
        ambientLight.intensity = 1.5;
      } else {
        scene.fog = new THREE.Fog(0x87ceeb, 0, 150);
        ambientLight.intensity = 0.6;
      }

      if (visualsEnabled.rainbow) {
        const time = Date.now() * 0.001;
        scene.background = new THREE.Color().setHSL((time % 10) / 10, 0.6, 0.7);
      } else {
        scene.background = new THREE.Color(0x87ceeb);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [ammo, currentWeapon, cheatsEnabled, visualsEnabled, isLoading, gameStarted, cameraMode]);

  const buyWeapon = (weapon: Weapon) => {
    if (money >= weapon.price) {
      setMoney(money - weapon.price);
      setCurrentWeapon(weapon);
      setAmmo(weapon.ammo);
      setShowBuyMenu(false);
    }
  };

  const toggleCheat = (cheat: keyof typeof cheatsEnabled) => {
    setCheatsEnabled((prev) => ({ ...prev, [cheat]: !prev[cheat] }));
  };

  const toggleVisual = (visual: keyof typeof visualsEnabled) => {
    setVisualsEnabled((prev) => ({ ...prev, [visual]: !prev[visual] }));
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {showMainMenu && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-black z-50">
          <div className="absolute inset-0" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100" height="100" fill="url(%23grid)" /%3E%3C/svg%3E")',
          }} />
          
          <div className="relative h-full flex flex-col items-center justify-center">
            <div className="text-center space-y-8 max-w-4xl px-8">
              <div className="space-y-4">
                <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 animate-pulse">
                  COUNTER-STRIKE
                </div>
                <div className="text-4xl font-bold text-blue-400 tracking-widest">
                  GLOBAL OFFENSIVE 2
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-12">
                <Button
                  onClick={startGame}
                  className="text-2xl py-8 px-16 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold rounded-lg shadow-2xl transform hover:scale-105 transition-all duration-200"
                >
                  <Icon name="Play" size={32} className="mr-3" />
                  ИГРАТЬ
                </Button>
                
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowSettings(true)}
                    className="text-lg py-6 px-12 bg-gray-800/80 hover:bg-gray-700/80 text-white border-gray-600 font-semibold rounded-lg backdrop-blur-sm"
                  >
                    <Icon name="Settings" size={24} className="mr-2" />
                    Настройки
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="text-lg py-6 px-12 bg-gray-800/80 hover:bg-gray-700/80 text-white border-gray-600 font-semibold rounded-lg backdrop-blur-sm"
                  >
                    <Icon name="Trophy" size={24} className="mr-2" />
                    Достижения
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="text-lg py-6 px-12 bg-gray-800/80 hover:bg-gray-700/80 text-white border-gray-600 font-semibold rounded-lg backdrop-blur-sm"
                  >
                    <Icon name="Users" size={24} className="mr-2" />
                    Друзья
                  </Button>
                </div>
              </div>

              <div className="mt-12 space-y-3">
                <div className="flex items-center justify-center gap-8 text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Онлайн: 847,291</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>В игре: 623,450</span>
                  </div>
                </div>
                
                <div className="text-gray-500 text-sm">
                  <div>WebGL Edition • Version 2.0.1 • 2025</div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 left-8 text-gray-500 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <Icon name="Shield" size={16} />
                <span>VAC Protection</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Globe" size={16} />
                <span>Region: Europe</span>
              </div>
            </div>

            <div className="absolute bottom-8 right-8 flex gap-3">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Icon name="Youtube" size={20} />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Icon name="Twitter" size={20} />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Icon name="MessageCircle" size={20} />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {showModeSelect && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-8 w-[700px] bg-gray-900/95 border-gray-700">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-2">Выбор режима игры</h2>
              <p className="text-gray-400">Выберите режим для начала матча</p>
            </div>
            <div className="grid gap-4">
              <Button
                onClick={() => selectMode('bomb')}
                className="text-xl py-8 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                <Icon name="Bomb" size={28} className="mr-3" />
                Закладка бомбы
              </Button>
              <Button
                onClick={() => selectMode('duel')}
                className="text-xl py-8 bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                <Icon name="Swords" size={28} className="mr-3" />
                Дуэль 1 на 1
              </Button>
              <Button
                onClick={() => selectMode('training')}
                className="text-xl py-8 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                <Icon name="Target" size={28} className="mr-3" />
                Тренировка с ботами
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => { setShowModeSelect(false); setShowMainMenu(true); }}
              className="mt-6 w-full text-gray-400 hover:text-white"
            >
              Назад
            </Button>
          </Card>
        </div>
      )}

      {showMapSelect && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-8 w-[900px] bg-gray-900/95 border-gray-700">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-2">Выбор карты</h2>
              <p className="text-gray-400">Режим: {selectedMode === 'bomb' ? 'Закладка бомбы' : selectedMode === 'duel' ? 'Дуэль' : 'Тренировка'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => selectMap('dust2')}
                className="text-lg py-12 bg-yellow-700 hover:bg-yellow-600 text-white font-bold flex-col"
              >
                <Icon name="Mountain" size={32} className="mb-2" />
                <div>de_dust2</div>
                <div className="text-sm opacity-70">Классика</div>
              </Button>
              <Button
                onClick={() => selectMap('mirage')}
                className="text-lg py-12 bg-orange-700 hover:bg-orange-600 text-white font-bold flex-col"
              >
                <Icon name="Sun" size={32} className="mb-2" />
                <div>de_mirage</div>
                <div className="text-sm opacity-70">Пустыня</div>
              </Button>
              <Button
                onClick={() => selectMap('inferno')}
                className="text-lg py-12 bg-red-700 hover:bg-red-600 text-white font-bold flex-col"
              >
                <Icon name="Flame" size={32} className="mb-2" />
                <div>de_inferno</div>
                <div className="text-sm opacity-70">Итальянская деревня</div>
              </Button>
              <Button
                onClick={() => selectMap('nuke')}
                className="text-lg py-12 bg-green-700 hover:bg-green-600 text-white font-bold flex-col"
              >
                <Icon name="Zap" size={32} className="mb-2" />
                <div>de_nuke</div>
                <div className="text-sm opacity-70">Ядерная станция</div>
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => { setShowMapSelect(false); setShowModeSelect(true); }}
              className="mt-6 w-full text-gray-400 hover:text-white"
            >
              Назад
            </Button>
          </Card>
        </div>
      )}

      {showSettings && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-8 w-[600px] bg-gray-900/95 border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">Настройки</h2>
              <Button
                variant="ghost"
                onClick={() => setShowSettings(false)}
                className="text-white"
              >
                <Icon name="X" size={24} />
              </Button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-white font-semibold mb-3 block">Качество графики</label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => setGraphicsQuality('low')}
                    variant={graphicsQuality === 'low' ? 'default' : 'outline'}
                    className={graphicsQuality === 'low' ? 'bg-green-600' : ''}
                  >
                    Низкое
                  </Button>
                  <Button
                    onClick={() => setGraphicsQuality('medium')}
                    variant={graphicsQuality === 'medium' ? 'default' : 'outline'}
                    className={graphicsQuality === 'medium' ? 'bg-green-600' : ''}
                  >
                    Среднее
                  </Button>
                  <Button
                    onClick={() => setGraphicsQuality('high')}
                    variant={graphicsQuality === 'high' ? 'default' : 'outline'}
                    className={graphicsQuality === 'high' ? 'bg-green-600' : ''}
                  >
                    Высокое
                  </Button>
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Разрешение:</span>
                  <span className="text-white">{window.innerWidth}x{window.innerHeight}</span>
                </div>
                <div className="flex justify-between">
                  <span>Тени:</span>
                  <span className="text-white">{graphicsQuality === 'high' ? 'Вкл' : 'Выкл'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Сглаживание:</span>
                  <span className="text-white">{graphicsQuality !== 'low' ? 'Вкл' : 'Выкл'}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center z-50">
          <div className="text-center space-y-6">
            <div className="text-6xl font-bold text-white mb-4 animate-pulse">
              CS:GO 2
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <div className="text-gray-400 text-lg mt-4">Загрузка карты...</div>
            <div className="text-gray-500 text-sm mt-8">
              <div>⚡ WebGL 3D Engine</div>
              <div>🎮 Advanced AI</div>
              <div>🔊 Sound System</div>
            </div>
          </div>
        </div>
      )}
      {gameStarted && <div ref={mountRef} className="w-full h-full" />}

      {gameStarted && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 pointer-events-none select-none z-10">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div className="bg-blue-600/90 px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold">
                  👤
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Player1</div>
                  <div className="text-blue-200 text-xs">{kills} kills</div>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              {botsRef.current.slice(0, 3).map((_, idx) => (
                <div key={idx} className="bg-red-600/90 px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-800 rounded-full flex items-center justify-center text-xs font-bold">
                    🤖
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">Bot{idx + 1}</div>
                    <div className="text-red-200 text-xs">AI</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameStarted && <div className="absolute top-20 left-4 text-white font-bold space-y-2 pointer-events-none select-none">
        <div className="bg-black/70 px-4 py-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Icon name="Heart" size={20} className="text-red-500" />
            <span className="text-xl">{health} HP</span>
          </div>
        </div>
        <div className="bg-black/70 px-4 py-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Icon name="Target" size={20} className="text-yellow-500" />
            <span className="text-xl">{ammo} / {currentWeapon.ammo}</span>
          </div>
        </div>
        <div className="bg-black/70 px-4 py-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Icon name="DollarSign" size={20} className="text-green-500" />
            <span className="text-xl">{money}$</span>
          </div>
        </div>
        <div className="bg-black/70 px-4 py-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Icon name="Skull" size={20} className="text-purple-500" />
            <span className="text-xl">{kills} Kills</span>
          </div>
        </div>
      </div>}

      {gameStarted && <div className="absolute top-4 right-4 text-white text-sm space-y-1 pointer-events-none select-none bg-black/50 px-3 py-2 rounded-lg backdrop-blur-sm">
        <div className="text-yellow-400 font-bold mb-2">Камера: {cameraMode === 'first' ? '1-е лицо' : cameraMode === 'third' ? '3-е лицо' : 'Спереди'}</div>
        <div>WASD / ФЫВА - Движение</div>
        <div>Мышь - Обзор</div>
        <div>ЛКМ - Стрельба</div>
        <div>L - Смена камеры</div>
        <div>B - Меню закупки</div>
        <div>Q - Читы</div>
        <div>P - Визуалы</div>
      </div>}

      {gameStarted && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative">
          <div className="w-0.5 h-4 bg-green-400 absolute left-1/2 -translate-x-1/2 -top-6" />
          <div className="w-0.5 h-4 bg-green-400 absolute left-1/2 -translate-x-1/2 top-2" />
          <div className="h-0.5 w-4 bg-green-400 absolute top-1/2 -translate-y-1/2 -left-6" />
          <div className="h-0.5 w-4 bg-green-400 absolute top-1/2 -translate-y-1/2 right-2" />
          <div className="w-1 h-1 bg-green-400 rounded-full" />
        </div>
      </div>}

      {gameStarted && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-bold text-xl bg-black/70 px-6 py-3 rounded-lg backdrop-blur-sm pointer-events-none select-none">
        {currentWeapon.name}
      </div>}

      {showBuyMenu && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
          <Card className="p-6 w-[500px] bg-gray-900/95 border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Icon name="ShoppingCart" size={28} />
                Меню Закупки
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBuyMenu(false)}
                className="text-white hover:bg-gray-800"
              >
                <Icon name="X" size={20} />
              </Button>
            </div>
            <div className="space-y-3">
              {WEAPONS.map((weapon) => (
                <div
                  key={weapon.id}
                  className="flex items-center justify-between p-4 bg-gray-800/80 rounded-lg hover:bg-gray-700/80 transition-colors"
                >
                  <div className="text-white">
                    <div className="font-bold text-lg">{weapon.name}</div>
                    <div className="text-sm text-gray-400">
                      Патроны: {weapon.ammo} | Урон: {weapon.damage}
                    </div>
                  </div>
                  <Button
                    onClick={() => buyWeapon(weapon)}
                    disabled={money < weapon.price}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:text-gray-400"
                  >
                    ${weapon.price}
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center text-gray-400 text-sm">
              Нажмите B чтобы закрыть
            </div>
          </Card>
        </div>
      )}

      {showCheats && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
          <Card className="p-6 w-[400px] bg-red-900/95 border-red-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Icon name="Zap" size={28} />
                Читы
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCheats(false)}
                className="text-white hover:bg-red-800"
              >
                <Icon name="X" size={20} />
              </Button>
            </div>
            <div className="space-y-3">
              {Object.entries(cheatsEnabled).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 bg-red-800/50 rounded-lg"
                >
                  <span className="text-white font-medium capitalize">
                    {key === 'aimbot' && '🎯 Aimbot'}
                    {key === 'esp' && '👁️ ESP'}
                    {key === 'speed' && '⚡ Speed'}
                    {key === 'fly' && '🚁 Fly'}
                    {key === 'noclip' && '👻 NoClip'}
                  </span>
                  <Button
                    onClick={() => toggleCheat(key as keyof typeof cheatsEnabled)}
                    className={value ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}
                    size="sm"
                  >
                    {value ? 'ON' : 'OFF'}
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center text-red-200 text-sm">
              Нажмите Q чтобы закрыть
            </div>
          </Card>
        </div>
      )}

      {showVisuals && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
          <Card className="p-6 w-[400px] bg-purple-900/95 border-purple-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Icon name="Eye" size={28} />
                Визуалы
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVisuals(false)}
                className="text-white hover:bg-purple-800"
              >
                <Icon name="X" size={20} />
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-purple-800/50 rounded-lg">
                <span className="text-white font-medium">🎩 China Hat</span>
                <Button
                  onClick={() => toggleVisual('china')}
                  className={visualsEnabled.china ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}
                  size="sm"
                >
                  {visualsEnabled.china ? 'ON' : 'OFF'}
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-800/50 rounded-lg">
                <span className="text-white font-medium">💡 FullBright</span>
                <Button
                  onClick={() => toggleVisual('fullbright')}
                  className={visualsEnabled.fullbright ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}
                  size="sm"
                >
                  {visualsEnabled.fullbright ? 'ON' : 'OFF'}
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-800/50 rounded-lg">
                <span className="text-white font-medium">🌈 Rainbow Sky</span>
                <Button
                  onClick={() => toggleVisual('rainbow')}
                  className={visualsEnabled.rainbow ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}
                  size="sm"
                >
                  {visualsEnabled.rainbow ? 'ON' : 'OFF'}
                </Button>
              </div>
            </div>
            <div className="mt-6 text-center text-purple-200 text-sm">
              Нажмите P чтобы закрыть
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Index;