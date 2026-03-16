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
import { Bundle, Client, Server } from 'node-osc'

type Snapshot = {
	name: any
	index: any
	number: any
}

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	private moduleStatus: InstanceStatus = InstanceStatus.Disconnected
	private oscServer?: Server
	private consoleClient?: Client
	private connectionLoop?: NodeJS.Timeout
	private lastMessage?: number
	private watchdog?: NodeJS.Timeout
	private cueListPoll?: NodeJS.Timeout
	cueList: Snapshot[] = []

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateStatus(InstanceStatus.Connecting)

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions

		this.setVariableValues({ connected: 'Disconnected' })

		this.createOSCServer()
		this.createClient()
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
		if (this.oscServer) void this.oscServer.close()
		if (this.consoleClient) void this.consoleClient.close()

		clearInterval(this.connectionLoop)
		clearInterval(this.cueListPoll)
		clearInterval(this.watchdog)
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

	sendOSCBundle(bundle: Bundle): void {
		this.log('debug', `sent: ${JSON.stringify(bundle.elements)}`)
		if (this.consoleClient) void this.consoleClient.send(bundle)
	}

	sendOSC(options: { address: string; value: string | number }): void {
		this.log('debug', `sent: ${options.address} ${options.value}`)
		if (this.consoleClient) void this.consoleClient.send(options.address, options.value)
	}

	//set up OSC server on local ips
	private createOSCServer() {
		try {
			this.oscServer = new Server(this.config.rec_port, '0.0.0.0')
			this.oscServer.on('error', (err) => {
				this.updateStatus(InstanceStatus.ConnectionFailure)
				this.log('error', `Error in OSC Server: ${err.message}`)
			})
			this.oscServer.on('message', (msg) => this.handleOSCMessage(msg))
			this.oscServer.on('listening', () => {
				this.log('info', `OSC Server listening on ${this.config.rec_port}`)
				this.connectionLoop = setInterval(() => {
					this.connectToConsole()
				}, 1000)

				this.cueListPoll = setInterval(() => {
					if (this.consoleClient) void this.consoleClient.send('/Snapshots/names/?')
				}, 120000)

				this.watchdog = setInterval(() => {
					this.checkStatus()
				}, 10000)
			})
		} catch {
			this.log('error', `Cannot create server on port ${this.config.rec_port}`)
		}
	}

	//create client at target console ip
	private createClient() {
		this.consoleClient = new Client(this.config.target, this.config.send_port)
	}

	//sends connection string and then collects the console name and CG Values
	private connectToConsole() {
		if (this.consoleClient) {
			void this.consoleClient.send('/Console/Name/?')
			if (this.moduleStatus !== InstanceStatus.Ok) {
				if (this.consoleClient) {
					void this.consoleClient.send('/Snapshots/names/?')
					for (let i = 1; i <= 36; i++) {
						void this.consoleClient.send(`/Control_Groups/${i}/fader/?`)
					}
					void this.consoleClient.send('/Snapshots/Current_Snapshot/?')
				}
			}
		}
	}

	//check last message was within the last 10 seconds
	private checkStatus() {
		if (!this.lastMessage) {
			this.setVariableValues({ connected: 'Disconnected' })
			this.moduleStatus = InstanceStatus.Connecting
			return this.updateStatus(InstanceStatus.Connecting)
		}

		const diff = Date.now() - this.lastMessage
		if (diff > 10000) {
			this.moduleStatus = InstanceStatus.Connecting
			this.updateStatus(InstanceStatus.Connecting)
			for (let i = 1; i <= 36; i++) {
				this.setVariableValues({ [`cg${i}`]: '' })
			}
			return this.setVariableValues({ connected: 'Disconnected' })
		}

		if (this.moduleStatus != InstanceStatus.Ok) {
			console.log(this.lastMessage, this.moduleStatus)
			this.updateStatus(InstanceStatus.Ok)
			this.moduleStatus = InstanceStatus.Ok
			this.setVariableValues({ connected: 'Connected' })
		}
	}

	private handleOSCMessage(msg: any): void {
		this.lastMessage = Date.now()
		try {
			const addressArray = msg[0].split('/')
			const stringValue = JSON.stringify(msg[1])

			this.log('debug', `Received: ${JSON.stringify(msg)}, ${stringValue}`)

			switch (addressArray[1]) {
				case 'Console':
					if (addressArray[2] === 'Name') {
						this.setVariableValues({ console_name: stringValue })
						if (this.moduleStatus !== InstanceStatus.Ok) {
							this.moduleStatus = InstanceStatus.Ok
							this.updateStatus(InstanceStatus.Ok)
						}
					}
					break
				case 'Control_Groups':
					if (addressArray[3] === 'fader') {
						const faderVal = parseFloat(stringValue)
						this.setVariableValues({ [`cg${addressArray[2]}`]: faderVal === -150 ? 'Out' : faderVal.toFixed(2) })
					}
					break
				case 'Snapshots':
					if (addressArray[2] === 'name') {
						const i = msg[1]
						const existingCue = this.cueList.find((c) => c.index == i)

						if (existingCue) {
							existingCue.name = msg[4]
							existingCue.number = msg[2]
						} else {
							this.cueList.push({
								name: msg[4],
								index: msg[1],
								number: msg[2],
							})
						}
					}

					if (addressArray[2] === 'Current_Snapshot') {
						this.setVariableValues({
							current_snapshot: JSON.stringify(this.cueList.find((x) => x.index === msg[1])?.name),
						})
					}
					break
				default:
					return
			}
		} catch {
			this.log('debug', 'cannot split this guy')
		}
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
