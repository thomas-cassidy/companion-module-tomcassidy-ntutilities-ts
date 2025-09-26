import {
	InstanceBase,
	runEntrypoint,
	InstanceStatus,
	SomeCompanionConfigField,
	// CompanionVariableValues,
} from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { Client, Server } from 'node-osc'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	// private pollInterval?: NodeJS.Timeout
	// private websocket?: WebSocket
	private oscServer?: Server
	private consoleClient?: Client

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateStatus(InstanceStatus.Connecting)

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions

		// this.connectToWebSocket()
		this.createOSCServer()
		this.createClient()
		this.connectToConsole()
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
		// this.websocket?.close()
		this.oscServer?.close()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	// private connectToWebSocket() {
	// 	try {
	// 		if (this.websocket?.OPEN) this.websocket.close()
	// 		this.websocket = new WebSocket(`ws://${this.config.target}:${this.config.send_port}/qlab`)
	// 		this.websocket.onopen = () => {
	// 			this.log('debug', 'websocket connected')
	// 		}
	// 		this.websocket.onmessage = (event) => {
	// 			this.log('debug', `got message: ${event.data}`)
	// 			const payload = JSON.parse(event.data)
	// 			this.log('debug', payload)

	// 			if (payload.cg) {
	// 				this.log('debug', payload.qlab)
	// 				this.setVariableValues({ [`cg${payload.cg}`]: payload.value })
	// 			}
	// 		}
	// 		this.websocket.onerror = (err) => {
	// 			this.log('error', `websocket error: ${err.error}`)
	// 		}
	// 		thigit s.websocket.onclose = () => {
	// 			this.log('debug', 'websocket closed')
	// 		}
	// 	} catch (e) {
	// 		this.log('error', `Cannot connect to websocket: ${e}`)
	// 	}
	// }

	private createOSCServer() {
		try {
			this.oscServer = new Server(this.config.rec_port, '0.0.0.0')
			this.oscServer.on('error', (err) => {
				this.log('error', `Error in OSC Server: ${err.message}`)
			})
			this.oscServer.on('message', (msg) => {
				this.log('debug', msg[0].toString())
			})
			this.oscServer.on('listening', () => {
				this.log('debug', `OSC Server listening on ${this.config.rec_port}`)
				this.updateStatus(InstanceStatus.Ok)
			})
		} catch {
			this.log('error', `Cannot create server on port ${this.config.rec_port}`)
		}
	}

	private createClient() {
		this.consoleClient = new Client(this.config.target, this.config.send_port)
	}

	private connectToConsole() {
		this.consoleClient?.send('/Console/Name/?')
		for (let i = 1; i <= 36; i++) {
			this.consoleClient?.send(`/Control_Groups/${i}/fader/?`)
		}
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
