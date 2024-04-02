import { ExtendedObject3D, THREE } from "enable3d";
import { item } from "./models/item";
import { Item } from "./models/item2";
import { CustomScene } from "./models/scene";
import { Utils } from "./utils";


export class Entity {
	mesh!: ExtendedObject3D;
	entityData!: item;

	physics!: typeof CustomScene.prototype.physics;
	scene!: CustomScene;

	items = 0;

	inventory: Item[] = [];

	isRunning = false;
	isJumping = false;
	isSneaking = false;
	fast = false;
	move = false;
  moveTop = 0;
  moveRight = 0;
	runDirection = {
		x: 0,
		y: 0,
		z: 0
	};

	speed = 10;
	speedBoost = 0;
	rotationSpeed = 10;

	canJump = true;

	targetLocation : null | THREE.Vector3 = null;

	health = {
		base: 10,
		current: 10
	}

	defense = {
		base: 0,
		current: 0
	}

	damage = {
		base: 1,
		current: 1
	}

	constructor(scene: CustomScene, mesh: ExtendedObject3D, data: item){
		this.mesh = mesh;
		this.entityData = data;
		this.physics = scene.physics;
		this.scene = scene;

		scene.entities.push(this);


		if(this.mesh.body) this.mesh.body.on.collision((otherObjecr) => {
			if(otherObjecr.name == 'chunk' && this.canJump == false){
				this.canJump = true;
			}
		});


	}

	private _animationTimeout: any = 0;
	private _playAnimation(action: string, speed = 1, loop = true, callback?: () => void){

		let name = action;
		if(this.entityData.config?.animations?.[name]) name = this.entityData.config?.animations[name];
		if(Array.isArray(name)) name = Utils.pickRandom(...name);

		let anim = this.entityData.load.animations.find(anim => anim.name == name);

		if(this.mesh.anims.mixer.timeScale != speed) this.mesh.anims.mixer.timeScale = speed;
		this.mesh.anims.mixer.stopAllAction();
		if(anim) {
			clearTimeout(this._animationTimeout);
			if(this._animationQueues.length) this._animationQueues.forEach(i => this.removeAnimQueue(i));
			const a = this.mesh.anims.mixer
			.clipAction(anim);
			a.reset();
			if(!loop) a.loop = THREE.LoopOnce;
			a.clampWhenFinished = true;

			a.play();

			this._animationTimeout = setTimeout(() => {
				if(typeof callback == "function") callback();
			}, a.getClip().duration * 1000);

			if(this._animationListeners.length) this._animationListeners.filter(
				i => i.name == action
			).forEach(i => i.fn());

			return a;
		}

		return null;
	}

	private _animationListeners: { name: string, fn: () => void, done: boolean }[] = [];
	private _animationQueues: any[] = []; 
	onAnimation(name: string, fn: () => void, done = false){
		this._animationListeners.push({name, fn, done});
		return this;
	};
	offAnimation(fn: () => void){
		const f = this._animationListeners.find(i => i.fn == fn);
		if(f) {
			const index = this._animationListeners.indexOf(f);
			this._animationListeners.splice(index, 1);
		}
	}
	animQueue(queue){
		this._animationQueues.push(queue);
		return this;
	}
	removeAnimQueue(queue){
		clearTimeout(queue);
		this._animationQueues.splice(this._animationQueues.indexOf(queue));
		return this;
	}
	playAnimation(name: string, speed = 1, loop = true, callback?: () => void){
		return this._playAnimation(name, speed, loop, callback);
	}

	run(direction: {x?:number,y?:number,z?:number}, speed = false){
		if('x' in direction) this.runDirection.x = direction.x!;
		if('y' in direction) this.runDirection.y = direction.y!;
		if('z' in direction) this.runDirection.z = direction.z!;
		if(this.isRunning && (this.fast == speed)) return this;
		console.log('running');
		this._playAnimation('Walk');
		this.isRunning = true;
		this.fast = speed;
		return this;
	}

	addPhysics(mesh){}

	addPos(x, y, z){
		this.physics.destroy(this.mesh.body);
		this.mesh.position.x += y;
		this.mesh.position.y += y;
		this.mesh.position.z += z;
		this.addPhysics(this.mesh);
	}

	rotate(degrees: number){
		this.physics.destroy(this.mesh.body);
		this.mesh.rotation.y += degrees;
		this.physics.add.existing(this.mesh);
	}

	lookAt(position: THREE.Vector3){
		this.physics.destroy(this.mesh.body);
		this.mesh.lookAt(position);
		this.physics.add.existing(this.mesh);
	}

	idle(){
		this.isRunning = false;
		this._playAnimation('Idle');
		console.log('idling')
		return this;
	}

	normal(){
		if(!this.isRunning) return this;
		this.isRunning = false;
		this._playAnimation('Normal');
		return this;
	}

	jump(){
		console.log('jumping');
		if(!this.canJump) return;
		this.isJumping = true;
		this.canJump = false;
		this.mesh.body.applyForceY(5);
		this.idle();
		this.isJumping = false;
	}

	sneak(act: string){
		if(act == 'start') {
			this.isSneaking = true;
			this._playAnimation('Sneak');
		} else {
			this.isSneaking = false;
			if(this.isRunning) this._playAnimation('Walk');
			else this.idle();
		}
	}


	attackTimeout: any;
	attack(){
		clearTimeout(this.attackTimeout);
		this._playAnimation('Attack', 1, false, () => {
			if(this.isRunning) this._playAnimation('Walk');
			else this.idle();
		});	
	}

	detectObstacles(position) {
    const obstacles = {
        hasSolidObject: false,
        hasHigherBlocks: false,
        hasEntity: false
    };

		const playerpos = this.mesh.position.clone();

		// Perform raycast to detect obstacles in front of the player
		const raycaster = new THREE.Raycaster(playerpos, position);
		const intersects = raycaster.intersectObjects(this.scene.loadedChunks.chunkObjects(), true);
		const intersectsEntity = raycaster.intersectObjects(this.scene.entities.map(i => i.mesh).filter(mesh => mesh.uuid !== this.mesh.uuid), true);

		// console.log(intersects);

		if (intersects.length > 0) {
			// intersects[0].object.material = new THREE.MeshBasicMaterial({ color: 0x09d0d0 });
			const chunkY = intersects[0].object.position.y; // Y position of the chunk below next step
			const playerY = this.mesh.position.y; // Y position of the player
			const heightDifference = chunkY - playerY;

			// console.log(heightDifference)

			// If the height difference is exactly 1, make the player jump
			if (heightDifference > -1) {
				obstacles.hasHigherBlocks = true;
			}

			if(intersects[0].object.children.some(i => i.name.startsWith('chunk.'))){
				obstacles.hasSolidObject = true;
			}
		}

		if(intersectsEntity.length > 0){
			obstacles.hasEntity = true;
		}


    return obstacles;
	}

	avoidObstacles(position, obstacles) {

		const avoidanceDirection = new THREE.Vector3();

    // Avoidance behavior based on detected obstacles
    if (obstacles.hasSolidObject) {
        // Move away from solid objects
        avoidanceDirection.subVectors(position, obstacles.closestSolidObject.position).normalize();
    } else if (obstacles.hasHigherBlocks) {
        // Move upwards to avoid higher blocks
        avoidanceDirection.set(0, 1, 0);
    } else {
        // No specific avoidance behavior, move in a random direction
        avoidanceDirection.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    }

    return avoidanceDirection;
	}

	rotateTowardsTarget() {
    if (this.targetLocation) {
			const rotationSpeed = this.rotationSpeed;
			const maxRotation = Math.PI / 6; // Maximum rotation angle per frame

			// Calculate the direction vector towards the target location
			const direction = new THREE.Vector3();
			direction.subVectors(this.targetLocation, this.mesh.position);
			// direction.x = 0; // Assuming movement is only along x and z axes
			direction.y = 0; // Assuming movement is only along x and z axes
			// direction.z = 0; // Assuming movement is only along x and z axes

			var quaternion = new THREE.Quaternion().setFromEuler(this.mesh.rotation);

			const currentDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
			let theta = Math.atan2(direction.x, direction.z) - Math.atan2(currentDirection.x, currentDirection.z);

			if (theta > Math.PI) {
				theta -= 2 * Math.PI;
			} else if (theta < -Math.PI) {
				theta += 2 * Math.PI;
			}

			const deltaTheta = THREE.MathUtils.clamp(theta, -maxRotation, maxRotation);

			// console.log(deltaTheta, Math.abs(deltaTheta), deltaTheta * rotationSpeed);

			// console.log(Math.abs(deltaTheta * rotationSpeed));

			if (Math.abs(deltaTheta * rotationSpeed) < 0.1) {
				this.mesh.body.setAngularVelocityY(0);
				return true;
			} else {
				this.run({
					x: 0,
					z: 0
				});
				this.mesh.body.setAngularVelocityY(deltaTheta * rotationSpeed);
			}
    }
		return false;
	}

	moveTowardsTarget() {
    if (this.targetLocation) {
			const direction = new THREE.Vector3();
			direction.subVectors(this.targetLocation, this.mesh.position);
			direction.y = 0; 

			direction.normalize();

			const speed = (this.speed + this.speedBoost) / (this.isSneaking ? 2 : 1); 

			const distanceToTarget = this.mesh.position.distanceTo(this.targetLocation);

			if (distanceToTarget < 1.5) {
					this.targetLocation = null;
					this.mesh.body.setAngularVelocityY(0);
					this.run({
						x: 0,
						z: 0
					});
					this.idle();
			} else {
				const nextStep = new THREE.Vector3().copy(direction).add(this.mesh.position).addScalar(4);
				nextStep.y += 1;
				const obstacles = this.detectObstacles(nextStep);

				const looking = this.rotateTowardsTarget();

				if(looking) {
					if (obstacles.hasHigherBlocks) {
						this.addPos(direction.x, 1, direction.z);
						this.run({ x: 0, z: 0});
					} else if (obstacles.hasSolidObject || obstacles.hasEntity) {
						const avoidanceDirection = this.avoidObstacles(nextStep, obstacles);
						this.run({
								x: avoidanceDirection.x * speed,
								z: avoidanceDirection.z * speed
						});
					} else {
						this.run({
							x: direction.x * speed,
							z: direction.z * speed
						});
					}
				}
			}
    }
	}

	inInventory(item: Item){
		return this.inventory.find(i => i.id == item.id);
	}

	ownItem(item: Item){}

	toInventory(item: Item){
		if(this.inInventory(item)) return true;
		else {
			this.ownItem(item);
			this.inventory.push(item);
			this.updateInventory(item, 'add');
			return true;
		}
	}

	fromInventory(item: Item){
		const ini = this.inInventory(item);
		if(!ini) return false;
		this.inventory.splice(this.inventory.indexOf(ini), 1);
		this.updateInventory(ini, 'remove');
		return true;
	}


	_inventoryListeners: ({
		f: (item: Item, type?: string) => any,
		type
	})[] = [];
	updateInventory(item:Item, type: string){
		this._inventoryListeners.filter(f => f.type == type || f.type == 'all').forEach(c => {
			c.f(item, type);
		});
	};

	onInventory(type, f: (item: Item, type?: string) => any){
		this._inventoryListeners.push({
			f,
			type
		});
		return true;
	}

	baseThinking(){
		if(this.targetLocation){
			this.moveTowardsTarget();
			this.mesh.body.setVelocity(this.runDirection.x, this.mesh.body.velocity.y, this.runDirection.z);
		} else {
			this.mesh.body.setVelocity(0, this.mesh.body.velocity.y, 0);
		}
	}

	think(){
		this.baseThinking();
	}


	static entityMeshLoader(scene: CustomScene, name: string) : any {
		return {};
	}

}