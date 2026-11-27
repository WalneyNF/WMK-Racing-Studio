
        // =========================================================
        // 1. GERADOR DE TEXTURAS (ASFALTO, LAMA DE RALLY E NEON)
        // =========================================================
        let currentBiome = 'GP';

        function generateRoadTexture(biome) {
            const canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');

            if (biome === 'GP') {
                ctx.fillStyle = '#262626'; ctx.fillRect(0, 0, 512, 512);
                for (let i = 0; i < 35000; i++) {
                    ctx.fillStyle = Math.random() > 0.5 ? '#303030' : '#1c1c1c';
                    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
                }
                // Zebras Vermelhas e Brancas nas laterais (Esquerda e Direita da fita)
                for (let y = 0; y < 512; y += 64) {
                    ctx.fillStyle = (y / 64) % 2 === 0 ? '#ef4444' : '#ffffff';
                    ctx.fillRect(0, y, 28, 64);
                    ctx.fillRect(484, y, 28, 64);
                }
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(32, 0, 6, 512); ctx.fillRect(474, 0, 6, 512);
            } 
            else if (biome === 'RALLY') {
                // Textura de Terra e Lama com sulcos de pneu
                ctx.fillStyle = '#5c3a21'; ctx.fillRect(0, 0, 512, 512);
                for (let i = 0; i < 40000; i++) {
                    ctx.fillStyle = Math.random() > 0.5 ? '#4a2c16' : '#6e472b';
                    ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 4);
                }
                // Bordas de lama escura
                ctx.fillStyle = '#38200f';
                ctx.fillRect(0, 0, 45, 512); ctx.fillRect(467, 0, 45, 512);
                // Trilhos dos pneus na lama
                ctx.fillStyle = 'rgba(40, 20, 5, 0.4)';
                ctx.fillRect(140, 0, 50, 512); ctx.fillRect(320, 0, 50, 512);
            } 
            else if (biome === 'NIGHT') {
                ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 512, 512);
                ctx.fillStyle = '#00d2ff'; ctx.fillRect(10, 0, 14, 512); ctx.fillRect(488, 0, 14, 512);
                ctx.fillStyle = '#f43f5e'; ctx.fillRect(252, 0, 8, 512);
            }

            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
            tex.anisotropy = 16;
            return tex;
        }

        // =========================================================
        // 2. CENA 3D, LUZES E CONTROLES DO EDITOR
        // =========================================================
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x6897bb);
        scene.fog = new THREE.FogExp2(0x6897bb, 0.0018);

        const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 2500);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(renderer.domElement);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334433, 0.65);
        scene.add(hemiLight);

        const sunLight = new THREE.DirectionalLight(0xfff4d6, 1.1);
        sunLight.position.set(180, 280, 120);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024; sunLight.shadow.mapSize.height = 1024;
        const d = 320;
        sunLight.shadow.camera.left = -d; sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d; sunLight.shadow.camera.bottom = -d;
        scene.add(sunLight);

        // Chão (Fora da Pista - Grama/Lama)
        const groundGeo = new THREE.PlaneGeometry(3000, 3000);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = "OFFROAD";
        scene.add(ground);

        // Controles do Editor (Agora com Eixo Y liberado para fazer Rampas e Pontes!)
        const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
        orbitControls.enabled = false;
        orbitControls.maxPolarAngle = Math.PI / 2 - 0.03;

        const transformControls = new THREE.TransformControls(camera, renderer.domElement);
        transformControls.showY = true; // EIXO Y ATIVADO PARA SUBIDAS E DESCIDAS!
        scene.add(transformControls);

        transformControls.addEventListener('dragging-changed', e => orbitControls.enabled = !e.value);
        transformControls.addEventListener('objectChange', () => {
            if (gameState === 'EDITOR' && transformControls.object) {
                // Não deixa afundar debaixo da terra
                if (transformControls.object.position.y < 0.2) transformControls.object.position.y = 0.2;
                scheduleRebuild();
            }
        });

        // =========================================================
        // 3. SISTEMA DE PARTÍCULAS (FUMAÇA, LAMA E GRAMA)
        // =========================================================
        const particles = [];
        const particleGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
        
        function spawnParticle(x, y, z, colorHex) {
            if (particles.length >= 70) return;
            const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.8 });
            const p = new THREE.Mesh(particleGeo, mat);
            p.position.set(x + (Math.random()-0.5)*1.5, y + 0.2, z + (Math.random()-0.5)*1.5);
            p.userData = { vy: Math.random() * 0.15 + 0.05, life: 1.0 };
            scene.add(p);
            particles.push(p);
        }

        function updateParticles() {
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.position.y += p.userData.vy;
                p.rotation.x += 0.1; p.rotation.y += 0.1;
                p.userData.life -= 0.04;
                p.material.opacity = p.userData.life;
                if (p.userData.life <= 0) {
                    scene.remove(p); p.material.dispose();
                    particles.splice(i, 1);
                }
            }
        }

        // =========================================================
        // 4. CARROS E CONFIGURAÇÕES DE PILOTAGEM REALISTA
        // =========================================================
        let gameState = 'RACE';
        const keys = { w: false, a: false, s: false, d: false, space: false };

        // 4 Carros (Incluindo o Rally WRC que ignora parte da penalidade de lama!)
        const carSpecs = window.WMK_VEHICLES.map(v=>({...v}));

        let tuning = { ...carSpecs[0], steerReturn: 0.86 };
        let car, carTiltGroup, wheelFL, wheelFR;
        let phys = { x: 0, y: 0.5, z: 0, vy: 0, speed: 0, angle: 0, steerAngle: 0, vx: 0, vz: 0, pitch: 0, onTrack: true };

        let rollingWheels=[]; let cameraMode=0; let reverseHold=0;
        function buildCar(typeIdx) { rollingWheels=[]; typeIdx=["formula", "rally", "drift", "muscle", "gt", "compact", "kart", "monster", "hover", "cyber", "sportbike", "motocross", "streetbike"].indexOf(tuning.model);
            if (car) { scene.remove(car); disposeTree(car); }
            if(typeIdx>=10){const bike=makeBike(tuning);car=bike.root;carTiltGroup=bike.lean;wheelFL=wheelFR=bike.front;rollingWheels=bike.rolls;scene.add(car);return;}
            car = new THREE.Group();
            carTiltGroup = new THREE.Group();
            car.add(carTiltGroup);

            const matPaint = new THREE.MeshStandardMaterial({ color: tuning.color, roughness: 0.25, metalness: 0.5 });
            const matDark = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 });
            const matYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

            if(typeIdx===8 || typeIdx===9 || typeIdx===6){
 const piece=(w,h,l,x,y,z,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),mat);m.position.set(x,y,z);carTiltGroup.add(m);return m;};
 if(typeIdx===8){piece(1.7,.35,4.5,0,1.0,0,matPaint);piece(.9,.45,1.5,0,1.4,.2,matDark);for(const x of [-1.2,1.2]){piece(.55,.35,3.2,x,.85,-.3,matPaint);piece(.35,.13,2.7,x,.58,-.3,new THREE.MeshBasicMaterial({color:0x00ffff}));}}
 else if(typeIdx===6){piece(1.65,.25,2.7,0,.3,0,matPaint);piece(.7,.65,.6,0,.75,-.4,matDark);piece(1.5,.25,.4,0,.4,1.25,matPaint);}
 else {piece(2.2,.5,4.7,0,.6,0,matPaint);piece(1.5,.5,2,0,1.05,0,matDark);for(const x of [-1,1])piece(.12,.13,4,x,.5,0,new THREE.MeshBasicMaterial({color:0x00ffff}));}
 } else if (typeIdx === 0) { // F1
                const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 4.8), matPaint);
                body.position.y = 0.45; body.castShadow = true; carTiltGroup.add(body);
                const wingR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.6), matDark);
                wingR.position.set(0, 1.05, -2.2); carTiltGroup.add(wingR);
                const wingF = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.5), matDark);
                wingF.position.set(0, 0.28, 2.4); carTiltGroup.add(wingF);
            } else { // WRC, Tuner, Muscle
                const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.3), matPaint);
                body.position.y = 0.65; body.castShadow = true; carTiltGroup.add(body);
                const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.6, 2.2), matDark);
                cabin.position.set(0, 1.25, -0.2); cabin.castShadow = true; carTiltGroup.add(cabin);
                if(typeIdx===2||typeIdx===4){body.scale.y=.72; cabin.scale.y=.72; cabin.position.y=1.02;}
                if(typeIdx===5){body.scale.z=.78; cabin.scale.z=.8;}
                if(typeIdx===3){body.scale.z=1.15; cabin.scale.z=.82; cabin.position.z=-.45;}
                for(const x of [-.65,.65]) { for(const front of [true,false]){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.48,.17,.08),new THREE.MeshBasicMaterial({color:front?0xfff4cf:0xff2535})); lamp.position.set(x,.72,(front?2.18:-2.18)*(typeIdx===3?1.15:1)); carTiltGroup.add(lamp);}}
                const glass = new THREE.MeshStandardMaterial({color:0x253d54,roughness:.18,metalness:.35});
                const detail=(w,h,l,x,y,z,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),mat);m.position.set(x,y,z);carTiltGroup.add(m);return m;};
                detail(1.55,.35,.05,0,1.12,.88,glass).rotation.x=-.3;
                detail(1.55,.32,.05,0,1.12,-1.28,glass).rotation.x=.3;
                for(const x of [-.92,.92]){detail(.08,.28,1.4,x,1.14,-.15,glass);detail(.32,.18,.28,x*1.13,1.1,.7,matPaint);detail(.09,.12,2.8,x,.35,0,matDark);}
                detail(1.55,.19,.1,0,.5,2.2,matDark);detail(1.6,.12,.16,0,.36,-2.2,matDark);
                const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.45), matPaint);
                spoiler.position.set(0, 1.2, -2.0); carTiltGroup.add(spoiler);
                
                if (typeIdx === 1) { // Faróis de Milha de Rally no teto!
                    const rallyLights = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.2), matYellow);
                    rallyLights.position.set(0, 1.6, 0.8); carTiltGroup.add(rallyLights);
                }
            }

            const radius=typeIdx===7?.85:typeIdx===6?.32:.45; const wheelGeo = new THREE.CylinderGeometry(radius,radius,typeIdx===7?.7:.42,20);
            wheelGeo.rotateZ(Math.PI / 2);
            function addWheel(x, z) {
                const pivot = new THREE.Group();
                pivot.position.set(x, radius, z);
                const m = new THREE.Mesh(wheelGeo, matDark); m.castShadow = true;
                const roll=new THREE.Group();pivot.add(roll);roll.add(m);rollingWheels.push(roll); const rim=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.43,12),new THREE.MeshStandardMaterial({color:0x9da9b6,metalness:.7,roughness:.3})); rim.rotation.z=Math.PI/2; roll.add(rim); car.add(pivot); return pivot;
            }
            if(typeIdx===8){wheelFL=new THREE.Group();wheelFR=new THREE.Group();}else{const w=typeIdx===7?1.45:typeIdx===6?.9:1.1;wheelFL=addWheel(-w,tuning.wheelbase/2);wheelFR=addWheel(w,tuning.wheelbase/2);addWheel(-w,-tuning.wheelbase/2);addWheel(w,-tuning.wheelbase/2);if(typeIdx===7){carTiltGroup.position.y=.65;carTiltGroup.scale.set(1.22,1.2,1.25);}}

            const glass=new THREE.MeshStandardMaterial({color:0x183347,metalness:.55,roughness:.18});
            if(typeIdx!==8){for(const x of [-1,1]){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.32,.10,.08),new THREE.MeshBasicMaterial({color:0xff3344}));lamp.position.set(x*.65,typeIdx===7?1.2:.52,typeIdx===6?-1.35:-2.15);carTiltGroup.add(lamp);}}
            if(typeIdx!==0&&typeIdx!==6&&typeIdx!==8){const windshield=new THREE.Mesh(new THREE.BoxGeometry(1.45,.48,.06),glass);windshield.position.set(0,1.12,.87);windshield.rotation.x=-.38;carTiltGroup.add(windshield);}
            scene.add(car);
        }

        function selectCar(idx, btn) {
            raceActive=false; document.querySelectorAll('.car-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            tuning = { ...carSpecs[idx], steerReturn: parseFloat(document.getElementById('sl-assist').value) };
            
            document.getElementById('sl-speed').value = tuning.maxSpeed;
            document.getElementById('sl-accel').value = tuning.accel;
            document.getElementById('sl-steer').value = tuning.steerSpeed;
            document.getElementById('sl-grip').value = tuning.grip;
            updateTuning();
            buildCar(idx); document.getElementById("vehicle-status").textContent=tuning.name+" · "+tuning.drivetrain+" · "+tuning.powerCV+" cv";
        }

        function updateTuning() {
            tuning.steerReturn = parseFloat(document.getElementById('sl-assist').value);
            tuning.maxSpeed = parseFloat(document.getElementById('sl-speed').value);
            tuning.accel = parseFloat(document.getElementById('sl-accel').value);
            tuning.steerSpeed = parseFloat(document.getElementById('sl-steer').value);
            tuning.grip = parseFloat(document.getElementById('sl-grip').value);

            document.getElementById('val-speed').innerText = Math.round(tuning.maxSpeed * 216) + " km/h";
            document.getElementById('val-accel').innerText = (tuning.accel * 1000).toFixed(0);
            document.getElementById('val-steer').innerText = (tuning.steerSpeed * 1000).toFixed(0);
            document.getElementById('val-grip').innerText = Math.round(tuning.grip * 100) + "%";
        }

        function setBiome(biome, btn) {
            currentBiome = biome; raceActive=false;
            document.querySelectorAll('.env-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');

            if (biome === 'GP') {
                scene.background.setHex(0x6897bb); scene.fog.color.setHex(0x6897bb);
                groundMat.color.setHex(0x2d5a27);
            } else if (biome === 'RALLY') {
                scene.background.setHex(0x8d99ae); scene.fog.color.setHex(0x8d99ae);
                groundMat.color.setHex(0x3b2313); // Barro escuro fora da pista
            } else if (biome === 'NIGHT') {
                scene.background.setHex(0x050811); scene.fog.color.setHex(0x050811);
                groundMat.color.setHex(0x090d16);
            }
            rebuildTrack();
        }

        // =========================================================
        // 5. GERADOR DE PISTA 3D COM ELEVAÇÃO (PONTES/RAMPAS) E CENÁRIO
        // =========================================================
        let trackMesh, pillarsGroup = new THREE.Group(), sceneryGroup = new THREE.Group();
        scene.add(pillarsGroup); scene.add(sceneryGroup);
        let controlPoints = [], selectedPoint = null, trackCurve = null;

        // Circuito Inicial com uma Ponte/Elevação já pronta para demonstrar!
        const defaultPts = [[0, 0.2, 0], [0, 0.2, -140], [-65, 0.2, -205], [-155, 0.2, -140], [-155, 0.2, 90], [-70, 0.2, 160], [0, 0.2, 90]];

        function initTrack() {
            const geo = new THREE.SphereGeometry(3.8, 16, 16);
            defaultPts.forEach(p => createPointMesh(p[0], p[1], p[2], geo));
            rebuildTrack();
            generateScenery();
        }

        function createPointMesh(x, y, z, geo) {
            const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
            const m = new THREE.Mesh(geo || new THREE.SphereGeometry(3.8, 16, 16), mat);
            m.position.set(x, y, z);
            m.visible = (gameState === 'EDITOR');
            scene.add(m);
            controlPoints.push(m);
            return m;
        }

        // Construtor de Malha de Estrada 3D Plana (Suporta Montanhas e Rampas sem torcer a pista!)
        function rebuildTrack() {
            if (trackMesh) { scene.remove(trackMesh); disposeTree(trackMesh); }
            disposeChildren(pillarsGroup);

            const pts = controlPoints.map(cp => cp.position.clone());
            if (pts.length < 3) return;

            trackCurve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
            const width = parseFloat(document.getElementById('sl-width').value);
            document.getElementById('val-width').innerText = width + "m";

            const segments = pts.length * 55;
            const positions = [], uvs = [], indices = [];
            const up = new THREE.Vector3(0, 1, 0);

            for (let i = 0; i <= segments; i++) {
                const u = i / segments;
                const pt = trackCurve.getPointAt(u);
                const tangent = trackCurve.getTangentAt(u).normalize();
                const side = new THREE.Vector3().crossVectors(tangent, up).normalize().multiplyScalar(width / 2);

                const left = pt.clone().sub(side);
                const right = pt.clone().add(side);

                positions.push(left.x, left.y + 0.15, left.z);
                positions.push(right.x, right.y + 0.15, right.z);

                const vRepeat = u * (trackCurve.getLength() / 12);
                uvs.push(0, vRepeat, 1, vRepeat);

                if (i < segments) {
                    const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
                    indices.push(a, b, c, b, d, c);
                }

                // Cria Pilares de Concreto automaticamente se a pista estiver alta (Viaduto/Rampa)
                if (i % 12 === 0 && pt.y > 2.5) {
                    const pGeo = new THREE.CylinderGeometry(1.2, 1.5, pt.y, 12);
                    const pMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
                    const pillar = new THREE.Mesh(pGeo, pMat);
                    pillar.position.set(pt.x, pt.y / 2, pt.z);
                    pillar.castShadow = true;
                    pillarsGroup.add(pillar);
                }
            }

            const roadGeo = new THREE.BufferGeometry();
            roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            roadGeo.setIndex(indices);
            roadGeo.computeVertexNormals();

            const roadMat = new THREE.MeshStandardMaterial({
                map: generateRoadTexture(currentBiome),
                roughness: currentBiome === 'RALLY' ? 0.95 : 0.7,
                side: THREE.DoubleSide
            });

            trackMesh = new THREE.Mesh(roadGeo, roadMat);
            trackMesh.receiveShadow = true;
            trackMesh.castShadow = true;
            trackMesh.name = "TRACK";
            scene.add(trackMesh); const info=document.getElementById("track-info");if(info)info.textContent=Math.round(trackCurve.getLength())+" m · "+controlPoints.length+" pontos";
        }

        // Gerador Procedural de Árvores e Pedras longe do meio da pista
        function generateScenery() {
            disposeChildren(sceneryGroup);
            if (!trackCurve) return;

            const trunkGeo = new THREE.CylinderGeometry(0.6, 0.9, 3, 7);
            const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a2c11 });
            const leavesGeo = new THREE.ConeGeometry(3.5, 8, 7);
            const leavesMat = new THREE.MeshLambertMaterial({ color: currentBiome === 'RALLY' ? 0x3a5a40 : 0x1b4332 });
            const rockGeo = new THREE.DodecahedronGeometry(2.5, 0);
            const rockMat = new THREE.MeshLambertMaterial({ color: 0x555555 });

            for (let i = 0; i < 95; i++) {
                const x = (Math.random() - 0.5) * 450;
                const z = (Math.random() - 0.5) * 450;
                
                // Verifica se não está em cima da pista
                let tooClose = false;
                for (let u = 0; u < 1; u += 0.02) {
                    const pt = trackCurve.getPointAt(u);
                    if (Math.hypot(pt.x - x, pt.z - z) < 22) { tooClose = true; break; }
                }
                if (tooClose) continue;

                if (Math.random() > 0.25) {
                    const tree = new THREE.Group();
                    const t = new THREE.Mesh(trunkGeo, trunkMat); t.position.y = 1.5;
                    const l = new THREE.Mesh(leavesGeo, leavesMat); l.position.y = 6.5; l.castShadow = true;
                    tree.add(t); tree.add(l);
                    tree.position.set(x, 0, z);
                    const s = 0.8 + Math.random() * 0.8; tree.scale.set(s, s, s);
                    sceneryGroup.add(tree);
                } else {
                    const rock = new THREE.Mesh(rockGeo, rockMat);
                    rock.position.set(x, 1, z); rock.castShadow = true;
                    sceneryGroup.add(rock);
                }
            }
        }

        // --- FUNÇÕES DO EDITOR ---
        function toggleEditor(enable) {
            gameState = enable ? 'EDITOR' : 'RACE'; raceActive=false; Object.keys(keys).forEach(k=>keys[k]=false);
            for(const id of ['sidebar','tuning-panel','environment','race-panel','map-panel']) document.getElementById(id).style.display=enable?'none':'block'; document.getElementById('editor-props').style.display=enable?'block':'none';
            document.getElementById('telemetry-hud').style.display = enable ? 'none' : 'flex';
            document.getElementById('editor-ui').style.display = enable ? 'block' : 'none';
            
            controlPoints.forEach(cp => cp.visible = enable);
            orbitControls.enabled = enable;

            if (enable) {
                camera.position.set(60, 180, 140);
                orbitControls.target.set(-50, 0, -40);
                orbitControls.update();
                selectPoint(controlPoints[2]); // Seleciona o ponto da ponte
            } else {
                transformControls.detach();
                resetCarPosition();
            }
        }

        function selectPoint(mesh) {
            if (selectedPoint) selectedPoint.material.color.setHex(0xfacc15);
            selectedPoint = mesh;
            if (selectedPoint) {
                selectedPoint.material.color.setHex(0x00d2ff);
                transformControls.attach(selectedPoint);
            }
        }

        function elevateSelectedPoint(amount) {
            if (!selectedPoint) return;
            selectedPoint.position.y = Math.max(.2,selectedPoint.position.y+amount);
            rebuildTrack();
        }

        function flattenTrack() {
            controlPoints.forEach(cp => cp.position.y = 0.2);
            rebuildTrack();
        }

        function addTrackPoint() {
            let idx = controlPoints.indexOf(selectedPoint);
            if (idx === -1) idx = controlPoints.length - 1;
            const nextIdx = (idx + 1) % controlPoints.length;
            const p1 = controlPoints[idx].position, p2 = controlPoints[nextIdx].position;
            const newM = createPointMesh((p1.x + p2.x)/2, (p1.y + p2.y)/2, (p1.z + p2.z)/2);
            controlPoints.pop(); controlPoints.splice(nextIdx, 0, newM);
            selectPoint(newM); rebuildTrack();
        }

        function deleteSelectedPoint() {
            if (controlPoints.length <= 3 || !selectedPoint) return;
            const idx = controlPoints.indexOf(selectedPoint);
            transformControls.detach(); scene.remove(selectedPoint);
            controlPoints.splice(idx, 1);
            selectPoint(controlPoints[0]); rebuildTrack();
        }

        function resetCarPosition() {
            resetJump(); clearRaceBots(); raceFinished=false;
            raceActive=false;
            if (!trackCurve) return;
            const p0 = trackCurve.getPointAt(0), p1 = trackCurve.getPointAt(0.01);
            phys.x = p0.x; phys.y = p0.y + 0.15; phys.z = p0.z;
            phys.speed = 0; phys.vx = 0; phys.vz = 0; phys.vy = 0; phys.steerAngle = 0;
            phys.angle = Math.atan2(p1.x - p0.x, p1.z - p0.z);
        }

        // Cliques no Editor
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        window.addEventListener('pointerdown', e => {
            if (gameState !== 'EDITOR' || e.button !== 0 || e.target!==renderer.domElement || transformControls.dragging) return;
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const hits = raycaster.intersectObjects(controlPoints.concat(propGroup.children));
            if (hits.length > 0) {const o=hits[0].object;if(o.parent===propGroup){transformControls.attach(o);}else selectPoint(o);}
        });

        window.addEventListener('dblclick', e => {
            if (gameState !== 'EDITOR' || e.target !== renderer.domElement) return;
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const hits = raycaster.intersectObject(ground);
            if (hits.length > 0) {
                const pt=hits[0].point; let best=Infinity, index=0; for(let i=0;i<controlPoints.length;i++){const a=controlPoints[i].position,b=controlPoints[(i+1)%controlPoints.length].position; const ab=b.clone().sub(a); const t=THREE.MathUtils.clamp(pt.clone().sub(a).dot(ab)/Math.max(.001,ab.lengthSq()),0,1); const dist=pt.distanceToSquared(a.clone().addScaledVector(ab,t)); if(dist<best){best=dist;index=i+1;}} const newM=createPointMesh(pt.x,.2,pt.z); controlPoints.pop(); controlPoints.splice(index,0,newM); selectPoint(newM); rebuildTrack();
            }
        });

        // =========================================================
        // 6. MOTOR FÍSICO 3D (DETECÇÃO DE PISTA/LAMA, RAMPAS E HUD)
        // =========================================================
        window.addEventListener('keydown', e => {
            if(e.target.matches('input,select,textarea,button'))return; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
            const k = e.key.toLowerCase();
            if (k === 'w' || e.key === 'ArrowUp') keys.w = true;
            if (k === 's' || e.key === 'ArrowDown') keys.s = true;
            if (k === 'a' || e.key === 'ArrowLeft') keys.a = true;
            if (k === 'd' || e.key === 'ArrowRight') keys.d = true;
            if (k === ' ') keys.space = true;
            if (k === 'r') resetCarPosition(); if(k==='v'&&!e.repeat)cameraMode=(cameraMode+1)%3;
        });
        window.addEventListener('keyup', e => {
            const k = e.key.toLowerCase();
            if (k === 'w' || e.key === 'ArrowUp') keys.w = false;
            if (k === 's' || e.key === 'ArrowDown') keys.s = false;
            if (k === 'a' || e.key === 'ArrowLeft') keys.a = false;
            if (k === 'd' || e.key === 'ArrowRight') keys.d = false;
            if (k === ' ') keys.space = false;
        });

        const surfaceRay = new THREE.Raycaster();
        const downVec = new THREE.Vector3(0, -1, 0);

        function disposeTree(root){const g=new Set(),m=new Set(),t=new Set();root.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material){for(const mat of [].concat(o.material)){m.add(mat);if(mat.map)t.add(mat.map);}}});g.forEach(x=>x.dispose());m.forEach(x=>x.dispose());t.forEach(x=>x.dispose());}
        function disposeChildren(group){disposeTree(group);while(group.children.length)group.remove(group.children[0]);}
        let pending=false; function scheduleRebuild(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;rebuildTrack();});}
        function trackData(){return {version:1,name:document.getElementById("track-name").value,props:propGroup.children.map(o=>({type:o.userData.kind,position:o.position.toArray(),rotation:o.rotation.y})),biome:currentBiome,width:Number(document.getElementById('sl-width').value),points:controlPoints.map(o=>o.position.toArray())};}
        function saveTrack(){const blob=new Blob([JSON.stringify(trackData(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='wmk-pista.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
        async function importTrack(file){if(!file)return;try{const d=JSON.parse(await file.text());if(d.version!==1||!['GP','RALLY','NIGHT'].includes(d.biome)||!Number.isFinite(d.width)||d.width<10||d.width>28||!Array.isArray(d.points)||d.points.length<3||d.points.length>100||!d.points.every(p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isFinite(n)&&Math.abs(n)<=1000)&&p[1]>=.2))throw Error('Formato inválido');if(d.props!==undefined&&(!Array.isArray(d.props)||d.props.length>100||!d.props.every(validProp)))throw Error("Objetos inválidos"); transformControls.detach();controlPoints.forEach(o=>{scene.remove(o);disposeTree(o);});controlPoints=[];selectedPoint=null;d.points.forEach(p=>createPointMesh(...p));document.getElementById('sl-width').value=d.width;setBiome(d.biome,document.querySelectorAll('.env-btn')[['GP','RALLY','NIGHT'].indexOf(d.biome)]);generateScenery();disposeChildren(propGroup);(d.props||[]).forEach(createProp);document.getElementById("track-name").value=String(d.name||"Pista importada").slice(0,80);resetCarPosition();if(gameState==='EDITOR')selectPoint(controlPoints[0]);document.getElementById('editor-status').textContent='Pista importada';}catch(e){document.getElementById('editor-status').textContent='Importação: '+e.message;}}
        let raceActive=false;
        window.addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
        window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)&&e.target===document.body)e.preventDefault();if(e.key.toLowerCase()==='r')raceActive=false;});
        const presets=window.WMK_TRACKS;
        const propGroup=new THREE.Group();scene.add(propGroup);
        function validProp(p){return p&&['cone','barrier','stand'].includes(p.type)&&Array.isArray(p.position)&&p.position.length===3&&p.position.every(n=>Number.isFinite(n)&&Math.abs(n)<=1000)&&Number.isFinite(p.rotation);}
        function createProp(p){const m=new THREE.Mesh(p.type==='cone'?new THREE.ConeGeometry(.45,1,10):p.type==='barrier'?new THREE.BoxGeometry(4,1,.5):new THREE.BoxGeometry(9,3,5),new THREE.MeshStandardMaterial({color:p.type==='cone'?0xff7315:p.type==='barrier'?0xd5d9df:0x45657e}));m.position.fromArray(p.position);m.rotation.y=p.rotation;m.userData.kind=p.type;m.castShadow=true;propGroup.add(m);return m;}
        function addProp(type){if(propGroup.children.length>=100)return;const p=(selectedPoint||controlPoints[0]).position.clone();p.x+=type==='stand'?16:5;p.y+=type==='stand'?1.5:.5;createProp({type,position:p.toArray(),rotation:0});}
        function removeProp(){const p=transformControls.object?.parent===propGroup?transformControls.object:propGroup.children.at(-1);if(p){if(transformControls.object===p)transformControls.detach();propGroup.remove(p);disposeTree(p);}}
        function checkProps(){for(const p of propGroup.children){const r=p.userData.kind==='stand'?4:p.userData.kind==='barrier'?2:.5;if(Math.abs(phys.y-p.position.y)<2&&Math.hypot(phys.x-p.position.x,phys.z-p.position.z)<r+1){phys.x-=phys.vx;phys.z-=phys.vz;phys.speed*=.25;phys.vx*=.2;phys.vz*=.2;car.position.set(phys.x,phys.y,phys.z);break;}}}
        function reverseTrack(){controlPoints.reverse();rebuildTrack();}
        function loadPreset(i){return importTrack(new Blob([JSON.stringify(presets[i])],{type:'application/json'}));}
        function downloadJSON(data,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
        function saveVehicle(){downloadJSON({version:1,...tuning},'wmk-'+tuning.model+'.json');}
        async function importVehicle(file){if(!file)return;const status=document.getElementById('vehicle-status');try{const d=JSON.parse(await file.text());const ranges={color:[0,16777215],maxSpeed:[.3,1.4],accel:[.0005,.006],steerSpeed:[.008,.05],grip:[.02,.25],offroadSkill:[.1,1],wheelbase:[1.2,4],massKg:[90,3000],powerCV:[10,1500],brakeMS2:[3,15],steerReturn:[.7,.94]};if(d.version!==1||typeof d.name!=='string'||d.name.length>80||!["formula", "rally", "drift", "muscle", "gt", "compact", "kart", "monster", "hover", "cyber", "sportbike", "motocross", "streetbike"].includes(d.model)||!['FWD','RWD','AWD'].includes(d.drivetrain)||!Object.entries(ranges).every(([k,[lo,hi]])=>Number.isFinite(d[k])&&d[k]>=lo&&d[k]<=hi))throw Error('Configuração inválida');const i=carSpecs.findIndex(c=>c.model===d.model);carSpecs[i]=d;document.getElementById('sl-assist').value=d.steerReturn;selectCar(i,document.querySelectorAll('.car-btn')[i]);resetCarPosition();status.textContent=d.name+' importado';}catch(e){status.textContent=e.message;}}
        initTrack();
        selectCar(5, document.querySelectorAll('.car-btn')[5]);
        resetCarPosition();

        function step() {
            updateParticles();
            if(raceActive && countdown>0){updateRace();return;}

            if (gameState === 'RACE' && car && trackMesh) {
                // 1. SENSOR DE TERRENO E ALTURA 3D (Raycaster apontando para baixo)
                surfaceRay.set(new THREE.Vector3(phys.x, phys.y + 1.2, phys.z), downVec);
                const hits = surfaceRay.intersectObjects([trackMesh, ground]);

                let groundHeight = 0;
                phys.onTrack = false;

                if (hits.length > 0) {
                    groundHeight = hits[0].point.y;
                    if (hits[0].object.name === "TRACK") phys.onTrack = true;
                }

                jumpPhysics(groundHeight);

                // 2. PENALIDADE DE LAMA / FORA DA PISTA
                let surfaceMult = 1.0;
                let surfaceGrip = tuning.grip;
                const badge = document.getElementById('surface-badge');

                if (!phys.onTrack) {
                    // Caiu na grama ou lama fora do traçado!
                    surfaceMult = tuning.offroadSkill; // F1 sofre muito (0.45), Rally WRC anda bem (0.92)
                    surfaceGrip = tuning.grip * 0.45;
                    badge.innerText = "⚠️ FORA DA PISTA (LAMA/GRAMA)";
                    badge.style.background = "#ef4444"; badge.style.color = "#fff";
                    if (Math.abs(phys.speed) > 0.08 && Math.random() > 0.3) {
                        spawnParticle(phys.x, phys.y, phys.z, currentBiome === 'RALLY' ? 0x3b2313 : 0x2d5a27);
                    }
                } else if (currentBiome === 'RALLY') {
                    surfaceGrip = tuning.grip * 0.72; // Pista de Rally escorrega de forma divertida
                    badge.innerText = "🌧️ PISTA DE LAMA RALLY (SLIDE)";
                    badge.style.background = "#f59e0b"; badge.style.color = "#000";
                    if (Math.abs(phys.speed) > 0.15 && Math.random() > 0.4) {
                        spawnParticle(phys.x, phys.y, phys.z, 0x5c3a21);
                    }
                } else {
                    badge.innerText = "🏁 NO ASFALTO (100% GRIP)";
                    badge.style.background = "#10b981"; badge.style.color = "#000";
                }

                // 3. ACELERAÇÃO E FREIO
                const effectiveMaxSpeed = tuning.maxSpeed * surfaceMult;
                if (keys.w && !keys.s) { reverseHold=0;
                    phys.speed += tuning.accel * surfaceMult * (1-.65*Math.min(1,Math.abs(phys.speed)/effectiveMaxSpeed));
                } else if (keys.s) {
                    if (phys.speed > 0) {phys.speed=Math.max(0,phys.speed-tuning.brakeMS2/3600);reverseHold=0;} else if (++reverseHold>24 && !isBike(tuning)) phys.speed -= tuning.accel * 0.5;
                } else {
                    reverseHold=0; phys.speed *= phys.onTrack ? 0.997 : 0.98; // Fora da pista freia o carro sozinho
                }
                phys.speed = Math.max(-effectiveMaxSpeed * 0.35, Math.min(effectiveMaxSpeed, phys.speed));
                if (Math.abs(phys.speed) < 0.001) phys.speed = 0;

                // 4. DIREÇÃO ASSISTIDA E PROGRESSIVA (Muito melhor de dirigir!)
                const speedRatio = Math.abs(phys.speed) / tuning.maxSpeed;
                const mode=document.getElementById('assist-mode').value;
                const v=Math.abs(phys.speed)*60, mu=(phys.onTrack?(currentBiome==='RALLY'?.58:1):.42)*(mode==='easy'?1.15:1);
                const sens=Number(document.getElementById('sensitivity').value)/100;
                const response=Number(document.getElementById('response').value)/100;
                const input=Number(keys.a)-Number(keys.d);
                const maxSteer=.50*sens/(1+v*.035);
                const target=input*maxSteer;
                const tau=input?response*(.025/Math.max(.008,tuning.steerSpeed)):response*.65;
                phys.steerAngle+=(target-phys.steerAngle)*(1-Math.exp(-1/(60*tau)));
                if(mode==='easy'&&document.getElementById('curve-brake').checked&&input&&phys.speed>0){const limit=Math.sqrt(mu*9.81*tuning.wheelbase/Math.max(.015,Math.abs(Math.tan(maxSteer))))/60;if(phys.speed>limit)phys.speed=Math.max(limit,phys.speed-10/3600);}
                wheelFL.rotation.y=wheelFR.rotation.y=phys.steerAngle;
                const lateralCap=mu*9.81/Math.max(2,Math.abs(phys.speed)*60)/60;
                const yaw=phys.speed/tuning.wheelbase*Math.tan(phys.steerAngle);
                phys.angle+=THREE.MathUtils.clamp(yaw,-lateralCap,lateralCap);
                if(mode==='easy'&&!keys.space) surfaceGrip=Math.max(surfaceGrip,.45);
                // 5. DRIFT E VETORES DE MOVIMENTO
                if (keys.space) {
                    surfaceGrip = 0.015;
                    phys.speed *= 0.985;
                    if (Math.abs(phys.speed) > 0.15) spawnParticle(phys.x, phys.y, phys.z, 0xdddddd); // Fumaça de pneu!
                }

                const targetVx = Math.sin(phys.angle) * phys.speed;
                const targetVz = Math.cos(phys.angle) * phys.speed;
                phys.vx += (targetVx - phys.vx) * surfaceGrip;
                phys.vz += (targetVz - phys.vz) * surfaceGrip;

                phys.x += phys.vx;
                phys.z += phys.vz;

                car.position.set(phys.x, phys.y, phys.z);
                car.rotation.y = phys.angle; rollingWheels.forEach(w=>w.rotation.x+=phys.speed/.45); checkProps();

                // Inclinação da suspensão (Curvas + Rampas)
                carTiltGroup.rotation.z = THREE.MathUtils.lerp(carTiltGroup.rotation.z, isBike(tuning)?-Math.atan2(yaw*3600*phys.speed,9.81)*.65:-phys.steerAngle*speedRatio*.3,.12);
                carTiltGroup.rotation.x = phys.pitch;

                // 6. CÂMERA QUE SEGUE SUBIDAS E DESCIDAS
                const camDist = cameraMode===0?9+speedRatio*3:cameraMode===1?5:-1.3;
                const targetCamX = car.position.x - Math.sin(phys.angle) * camDist;
                const targetCamZ = car.position.z - Math.cos(phys.angle) * camDist;
                const targetCamY = car.position.y + (cameraMode===0?5.2:cameraMode===1?2.5:1.5);

                camera.position.x += (targetCamX - camera.position.x) * 0.1;
                camera.position.z += (targetCamZ - camera.position.z) * 0.1;
                camera.position.y += (targetCamY - camera.position.y) * 0.1;
                camera.lookAt(car.position.x + Math.sin(phys.angle) * 6, car.position.y + 1.2, car.position.z + Math.cos(phys.angle) * 6);

                // 7. ATUALIZA CONTROLES E TELEMETRIA NA TELA
                const kmh = Math.round(Math.hypot(phys.vx,phys.vz) * 216);
                document.getElementById('speed-display').innerText = kmh;

                // Volante na tela gira em graus reais
                const wheelDeg = Math.round(-phys.steerAngle * 220);
                document.getElementById('visual-wheel').style.transform = `rotate(${wheelDeg}deg)`;
                document.getElementById('steer-deg').innerText = `${Math.abs(wheelDeg)}°`;

                // Barras dos Pedais
                document.getElementById('bar-throttle').style.height = keys.w ? "100%" : "0%";
                document.getElementById('bar-brake').style.height = keys.s ? "100%" : "0%";
                document.getElementById('bar-handbrake').style.height = keys.space ? "100%" : "0%";

                // Cálculo de Marchas e Barra de RPM
                let gear = 'N', rpmPercent = 10;
                if (phys.speed < -0.01) { gear = 'R'; rpmPercent = Math.min(100, (kmh / 60) * 100); }
                else if (kmh > 0) {
                    const gearNum = Math.min(6, Math.ceil(kmh / 46));
                    gear = gearNum;
                    rpmPercent = ((kmh % 46) / 46) * 85 + 15;
                    if (gearNum === 6 && kmh > 250) rpmPercent = 100;
                }
                document.getElementById('gear-display').innerText = gear;
                document.getElementById('rpm-bar').style.width = rpmPercent + "%";
            }

            updateRace();
        }

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        let last=performance.now(), accumulator=0;
        function animate(now=performance.now()) { requestAnimationFrame(animate); accumulator+=Math.min(.1,Math.max(0,(now-last)/1000)); last=now; while(accumulator>=1/60){step(); accumulator-=1/60;} renderer.render(scene,camera); }
        animate();
    