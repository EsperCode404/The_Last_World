// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Global variables
let stars;
let controls;
const solarSystem = new THREE.Group();
const planets = {};

// Create loading manager
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = function() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
};

// Create skybox
function createSkybox() {
    const skyGeometry = new THREE.SphereGeometry(5000, 60, 60);
    skyGeometry.scale(-1, 1, 1);
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const skyTexture = textureLoader.load('textures/backgrounds/milkyway.jpg', undefined, undefined, (err) => {
        console.error('Error loading skybox texture:', err);
    });
    const skyMaterial = new THREE.MeshBasicMaterial({
        map: skyTexture,
        side: THREE.BackSide
    });
    const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skybox);
    return skybox;
}

// Create stars
function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
    });

    const starsVertices = [];
    for (let i = 0; i < 5000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// Create the Sun with honeycomb shield
function createSun() {
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const texture = textureLoader.load('textures/sun.jpg', undefined, undefined, (err) => {
        console.error('Error loading sun texture:', err);
    });
    
    // Create sun core (smaller than before)
    const geometry = new THREE.SphereGeometry(12, 64, 64);
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        color: 0xffff00
    });
    const sun = new THREE.Mesh(geometry, material);
    
    // Add inner glow (smaller than before)
    const innerGlowGeometry = new THREE.SphereGeometry(14, 32, 32);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.5,
        side: THREE.BackSide
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    sun.add(innerGlow);
    
    // Create honeycomb shield (larger radius to surround the sun)
    const shield = createHoneycombShield(20, 20);
    sun.add(shield);
    
    // Add pulsing animation to shield
    sun.userData.update = function(time) {
        if (shield && shield.children) {
            shield.children.forEach((hex) => {
                if (hex.userData.time !== undefined) {
                    hex.userData.time += 0.01;
                    const scale = 0.9 + Math.sin(hex.userData.time * hex.userData.speed) * 0.1;
                    hex.scale.set(scale, scale, scale);
                    hex.material.opacity = 0.3 + Math.sin(hex.userData.time * 0.5) * 0.2;
                }
            });
        }
    };

    return sun;
}
// Create honeycomb shield
function createHoneycombShield(radius, segments) {
    const shieldGroup = new THREE.Group();
    
    // Create hexagon geometry
    const hexSize = radius * 0.15; // Slightly larger hexagons
    const hexGeometry = new THREE.CircleGeometry(hexSize, 6);
    const hexMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        wireframe: true
    });

    // Create a sphere of hexagons
    const hexCount = 300; // Increased number of hexagons for better coverage
    
    // Use the golden ratio for even distribution
    const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle in radians
    
    for (let i = 0; i < hexCount; i++) {
        const hex = new THREE.Mesh(hexGeometry, hexMaterial.clone());
        
        // Distribute points on a sphere
        const y = 1 - (i / (hexCount - 1)) * 2; // y goes from 1 to -1
        const r = Math.sqrt(1 - y * y); // radius at y
        
        const theta = phi * i; // golden angle increment
        
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        
        // Position the hex on the sphere (slightly larger than the sun)
        const shieldRadius = radius * 1.3; // 30% larger than the sun
        hex.position.set(x * shieldRadius, y * shieldRadius, z * shieldRadius);
        
        // Make the hex face outward from the center
        hex.lookAt(hex.position.clone().multiplyScalar(2));
        
        // Random rotation around the normal for natural look
        hex.rotation.z = Math.random() * Math.PI * 2;
        
        // Add pulsing animation
        hex.userData = {
            time: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 1.5
        };
        
        shieldGroup.add(hex);
    }

    // Create outer glow
    const glowGeometry = new THREE.SphereGeometry(radius * 1.4, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    shieldGroup.add(glow);

    return shieldGroup;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const time = Date.now() * 0.001;
    
    // Update sun shield animation
    if (planets.sun) {
        planets.sun.rotation.y += 0.001;
        if (planets.sun.userData.update) {
            planets.sun.userData.update(time);
        }
    }
    
    if (stars) {
        stars.rotation.y += 0.0001;
        stars.material.opacity = 0.7 + Math.sin(Date.now() * 0.001) * 0.3;
    }
    
    if (controls) controls.update();
    renderer.render(scene, camera);
}

// Initialize the scene
function init() {
    scene.add(solarSystem);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    // Add sun light
    const sunLight = new THREE.PointLight(0xffaa55, 1, 1000);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    
    // Set camera position
    camera.position.z = 200;
    
    // Set up controls
    // In the init() function, after creating the controls:
// In your OrbitControls configuration:
controls = new THREE.OrbitControls(camera, renderer.domElement);

// Make these adjustments:
controls.zoomSpeed = 0.001;  // Even slower zoom (was 0.5)
controls.enableDamping = true;
controls.dampingFactor = 0.25;  // More damping for smoother stops
controls.enableZoom = true;
controls.enablePan = true;

// Touch-specific settings
controls.touchZoomSpeed = 0.001;  // Much slower touch zoom (was 0.5)
controls.touchDampingFactor = 0.25;  // Smoother touch movement
controls.touchRotateSpeed = 0.3;  // Slower rotation on touch

// For mobile devices specifically
if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    controls.zoomSpeed = 0.0002;  // Even slower for mobile
    controls.touchZoomSpeed = 0.02;  // Very slow pinch-to-zoom
    controls.panSpeed = 0.2;  // Slower panning
    controls.rotateSpeed = 0.2;  // Slower rotation
    controls.minDistance = 40;  // Don't zoom too close
    controls.maxDistance = 800;  // Don't zoom too far
    controls.enableDamping = true;
    controls.dampingFactor = 0.35;
    controls.touchDampingFactor = 0.4; // Even more resistance for touch
}

// Add event listener to handle touch events better
renderer.domElement.addEventListener('touchstart', (e) => {
    // Prevent default to avoid page scroll on touch devices
    if (e.touches.length === 2) {
        e.preventDefault();
    }
}, { passive: false });

    // Create scene elements
    createSkybox();
    createStars();
    
    // Create just the sun
    planets.sun = createSun();
    solarSystem.add(planets.sun);
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    
    // Start animation
    animate();
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize everything when the page loads
window.addEventListener('load', () => {
    init();
    
    // Hide loading screen after a short delay
    setTimeout(() => {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }, 1000);
});