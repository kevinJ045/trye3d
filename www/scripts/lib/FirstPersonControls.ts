/**
 * @description  This code has originally been copied from Sketchbook
 *
 * @author       swift502 <blaha.j502@gmail.com> (http://jblaha.art/)
 * @copyright    Copyright (c) 2018 swift502; Project Url: https://github.com/swift502/Sketchbook
 * @license      {@link https://github.com/swift502/Sketchbook/blob/master/LICENSE GPL-3.0}
 *
 * @author       Yannick Deubel (https://github.com/yandeu)
 * @copyright    Copyright (c) 2021 Yannick Deubel; Project Url: https://github.com/enable3d/enable3d
 * @license      {@link https://github.com/enable3d/enable3d/blob/master/LICENSE LGPL-3.0}
 */
import { Vector2, Vector3 } from 'three';
class FirstPersonControls {
	camera;
	target;
	config;
	offset;
	sensitivity;
	radius;
	targetRadius;
	interpolationFactor;
	theta;
	phi;
	constructor(camera, target, config) {
		this.camera = camera;
		this.target = target;
		this.config = config;
		const { offset = new Vector3(0, 0, 0), sensitivity = new Vector2(0.25, 0.25), radius = 8, targetRadius = 10, interpolationFactor = 0.05, pointerLock = true, autoUpdate = true } = config;
		this.offset = offset;
		this.sensitivity = sensitivity;
		this.radius = radius;
		this.targetRadius = targetRadius;
		this.interpolationFactor = interpolationFactor;
		this.theta = 0;
		this.phi = 0;
		// if (pointerLock) {
		//   scene.input.on('pointerdown', () => {
		//     scene.input.mouse.requestPointerLock()
		//   })
		//   scene.input.on('pointermove', (pointer: PointerEvent) => {
		//     if (scene.input.mouse.locked) {
		//       this.update(pointer.movementX, pointer.movementY)
		//     }
		//   })
		// }
		// if (autoUpdate) {
		//   scene.events.on('update', () => {
		//     this.update(0, 0)
		//   })
		// }
	}
	update(deltaX, deltaY) {
		const center = this.target.position.clone().add(this.offset);
		this.camera.position.copy(center);
		this.theta -= deltaX * (this.sensitivity.x / 2);
		this.theta %= 360;
		this.phi += deltaY * (-this.sensitivity.y / 2);
		this.phi = Math.min(85, Math.max(-85, this.phi));
		const lookAt = new Vector3();
		lookAt.x = center.x + this.radius * Math.sin(((this.theta + 180) * Math.PI) / 180) * Math.cos((this.phi * Math.PI) / 180);
		lookAt.y = center.y + this.radius * -Math.sin((this.phi * Math.PI) / 180);
		lookAt.z = center.z + this.radius * Math.cos(((this.theta + 180) * Math.PI) / 180) * Math.cos((this.phi * Math.PI) / 180);
		this.camera.updateMatrix();
		this.camera.lookAt(lookAt);
	}
}
export { FirstPersonControls };
//# sourceMappingURL=firstPersonControls.js.map