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
}

const WEAPONS: Weapon[] = [
  { id: 'pistol', name: 'Пистолет', price: 500, ammo: 20, damage: 15 },
  { id: 'rifle', name: 'Автомат AK-47', price: 2700, ammo: 30, damage: 35 },
  { id: 'sniper', name: 'Снайперская AWP', price: 4750, ammo: 10, damage: 100 },
  { id: 'shotgun', name: 'Дробовик', price: 1200, ammo: 8, damage: 70 },
];

const Index = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [showBuyMenu, setShowBuyMenu] = useState(false);
  const [showCheats, setShowCheats] = useState(false);
  const [showVisuals, setShowVisuals] = useState(false);
  const [money, setMoney] = useState(16000);
  const [health, setHealth] = useState(100);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>(WEAPONS[0]);
  const [ammo, setAmmo] = useState(20);
  const [kills, setKills] = useState(0);
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
  const playerPosRef = useRef(new THREE.Vector3(0, 1.6, 0));
  const playerRotRef = useRef({ yaw: 0, pitch: 0 });
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const weaponMeshRef = useRef<THREE.Group | null>(null);
  const mouseLockedRef = useRef(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 0, 150);
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

    const groundGeometry = new THREE.PlaneGeometry(200, 200);
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

    createBox(20, 2, 0, 4, 4, 4, 0xb45309);
    createBox(-20, 2, 0, 4, 4, 4, 0xb45309);
    createBox(0, 2, 20, 4, 4, 4, 0xb45309);
    createBox(0, 2, -20, 4, 4, 4, 0xb45309);
    createBox(10, 1.5, 10, 8, 3, 2, 0x6b7280);
    createBox(-10, 1.5, -10, 8, 3, 2, 0x6b7280);
    createBox(15, 4, -15, 6, 8, 6, 0x991b1b);
    createBox(-15, 3, 15, 10, 6, 4, 0x065f46);

    const createWeaponMesh = () => {
      const weaponGroup = new THREE.Group();
      
      const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8);
      const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        metalness: 0.9,
        roughness: 0.3,
      });
      const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(0.4, -0.15, -0.3);
      weaponGroup.add(barrel);

      const bodyGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.4);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x374151,
        metalness: 0.7,
        roughness: 0.4,
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.set(0.1, -0.15, -0.3);
      weaponGroup.add(body);

      const handleGeometry = new THREE.BoxGeometry(0.05, 0.15, 0.08);
      const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x4b5563,
      });
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.position.set(0, -0.25, -0.25);
      weaponGroup.add(handle);

      weaponGroup.position.set(0.3, -0.3, -0.5);
      return weaponGroup;
    };

    const weaponMesh = createWeaponMesh();
    camera.add(weaponMesh);
    scene.add(camera);
    weaponMeshRef.current = weaponMesh;

    const createBot = (x: number, z: number) => {
      const botGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
      const botMaterial = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.6,
        metalness: 0.2,
      });
      const botMesh = new THREE.Mesh(botGeometry, botMaterial);
      botMesh.position.set(x, 1, z);
      botMesh.castShadow = true;
      scene.add(botMesh);

      const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.7,
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.set(0, 1, 0);
      botMesh.add(head);

      return {
        mesh: botMesh,
        position: new THREE.Vector3(x, 1, z),
        velocity: new THREE.Vector3(),
        health: 100,
        target: new THREE.Vector3(),
      };
    };

    botsRef.current = [
      createBot(25, 10),
      createBot(-25, -10),
      createBot(30, -20),
      createBot(-15, 25),
    ];

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
          
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

          const intersects = raycaster.intersectObjects(
            botsRef.current.map((bot) => bot.mesh),
            true
          );

          if (intersects.length > 0) {
            const hitBot = botsRef.current.find(
              (bot) => bot.mesh === intersects[0].object || bot.mesh === intersects[0].object.parent
            );

            if (hitBot && cheatsEnabled.aimbot) {
              hitBot.health = 0;
            } else if (hitBot) {
              hitBot.health -= currentWeapon.damage;
            }

            if (hitBot && hitBot.health <= 0) {
              scene.remove(hitBot.mesh);
              botsRef.current = botsRef.current.filter((bot) => bot !== hitBot);
              setKills((prev) => prev + 1);
              setMoney((prev) => prev + 300);
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

      const speed = cheatsEnabled.speed ? 0.3 : 0.15;
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
      playerPosRef.current.add(moveVector);

      if (!cheatsEnabled.fly && !cheatsEnabled.noclip) {
        playerPosRef.current.y = 1.6;
      }

      camera.position.copy(playerPosRef.current);
      camera.rotation.set(playerRotRef.current.pitch, playerRotRef.current.yaw, 0, 'YXZ');

      botsRef.current.forEach((bot) => {
        const directionToPlayer = new THREE.Vector3()
          .subVectors(playerPosRef.current, bot.position)
          .normalize();

        if (cheatsEnabled.aimbot) {
          bot.mesh.lookAt(playerPosRef.current);
        }

        const distanceToPlayer = bot.position.distanceTo(playerPosRef.current);
        
        if (distanceToPlayer > 5) {
          bot.velocity.copy(directionToPlayer).multiplyScalar(0.05);
          bot.position.add(bot.velocity);
          bot.mesh.position.copy(bot.position);
        }

        bot.mesh.lookAt(new THREE.Vector3(
          playerPosRef.current.x,
          bot.position.y,
          playerPosRef.current.z
        ));
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
  }, [ammo, currentWeapon, cheatsEnabled, visualsEnabled]);

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
      <div ref={mountRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 text-white font-bold space-y-2 pointer-events-none select-none">
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
      </div>

      <div className="absolute top-4 right-4 text-white text-sm space-y-1 pointer-events-none select-none bg-black/50 px-3 py-2 rounded-lg backdrop-blur-sm">
        <div>WASD / ФЫВА - Движение</div>
        <div>Мышь - Обзор</div>
        <div>ЛКМ - Стрельба</div>
        <div>B - Меню закупки</div>
        <div>Q - Читы</div>
        <div>P - Визуалы</div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative">
          <div className="w-0.5 h-4 bg-green-400 absolute left-1/2 -translate-x-1/2 -top-6" />
          <div className="w-0.5 h-4 bg-green-400 absolute left-1/2 -translate-x-1/2 top-2" />
          <div className="h-0.5 w-4 bg-green-400 absolute top-1/2 -translate-y-1/2 -left-6" />
          <div className="h-0.5 w-4 bg-green-400 absolute top-1/2 -translate-y-1/2 right-2" />
          <div className="w-1 h-1 bg-green-400 rounded-full" />
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-bold text-xl bg-black/70 px-6 py-3 rounded-lg backdrop-blur-sm pointer-events-none select-none">
        {currentWeapon.name}
      </div>

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
