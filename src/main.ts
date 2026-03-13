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
import { ArgumentType, Bundle, Client, Server } from 'node-osc'

type Snapshot = {
	name: ArgumentType
	index: ArgumentType
	number: ArgumentType
}

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	private oscServer?: Server
	private consoleClient?: Client
	private connectionLoop?: NodeJS.Timeout
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

		this.createOSCServer()
		this.createClient()
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
		this.oscServer?.close()
		this.consoleClient?.close()
		clearInterval(this.cueListPoll)
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
		this.consoleClient?.send(bundle)
	}

	sendOSC(options: { address: string; value: string | number }): void {
		this.log('debug', `sent: ${options.address} ${options.value}`)
		this.consoleClient?.send(options.address, options.value)
	}

	//set up OSC server on local ips
	private createOSCServer() {
		try {
			this.oscServer = new Server(this.config.rec_port, '0.0.0.0')
			this.oscServer.on('error', (err) => {
				this.updateStatus(InstanceStatus.ConnectionFailure)
				this.log('error', `Error in OSC Server: ${err.message}`)
			})
			this.oscServer.on('message', (msg) => {
				try {
					const addressArray = msg[0].split('/')
					const stringValue = JSON.stringify(msg[1])
					// this.log(
					// 	'debug',
					// 	`${msg[0].toString()} ${stringValue} ${JSON.stringify(msg[2])} ${JSON.stringify(msg[3])} ${JSON.stringify(msg[4])}`,
					// )
					switch (addressArray[1]) {
						case 'Console':
							if (addressArray[2] === 'Name') {
								this.setVariableValues({ console_name: stringValue })
								this.updateStatus(InstanceStatus.Ok)
								clearInterval(this.connectionLoop)
								this.cueListPoll = setInterval(() => this.consoleClient?.send('/Snapshots/names/?'), 1000)
							}
							// if (addressArray[2])
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
									this.cueList?.push({
										name: msg[4],
										index: msg[1],
										number: msg[2],
									})
								}
							}
							this.cueList.sort((x, y) => (x.index < y.index ? 1 : 0))
							if (addressArray[2] === 'Current_Snapshot') {
								this.setVariableValues({
									current_snapshot: JSON.stringify(this.cueList.find((x) => x.index === msg[1])?.name),
								})
							}
							// if (this.cueList) this.log('debug', JSON.stringify(this.cueList))
							break
						default:
							return
					}
				} catch {
					this.log('debug', 'cannot split this guy')
				}
			})
			this.oscServer.on('listening', () => {
				this.log('info', `OSC Server listening on ${this.config.rec_port}`)
				this.connectionLoop = setInterval(() => {
					this.connectToConsole()
				}, 1000)
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
		this.consoleClient?.send('/Console/Name/?')
		this.consoleClient?.send('/Snapshots/names/?')
		for (let i = 1; i <= 36; i++) {
			this.consoleClient?.send(`/Control_Groups/${i}/fader/?`)
		}
		this.consoleClient?.send('/Snapshots/Current_Snapshot/?')
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
