export type item = {
	type: string,
	config?: Record<string, any>,
	resource: {
		type: "texture",
		sources: string[],
		src?: string
	} | {
		type: "shader",
		vertex: string,
		fragment: string,
		materialOptions?: Record<string, any>,
		sources?: string[],
		src?: string
	} | {
		type: string,
		src: string,
		sources?: string[]
	},
	mesh?: THREE.Object3D,
	id: string,
	[key: string]: any
}