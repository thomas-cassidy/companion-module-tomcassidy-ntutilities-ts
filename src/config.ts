import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	target: string
	send_port: number
	rec_port: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'target',
			label: 'Target IP',
			width: 8,
			regex: Regex.IP,
		},
		{
			type: 'number',
			id: 'send_port',
			label: 'Send Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 8000,
		},
		{
			type: 'number',
			id: 'rec_port',
			label: 'Receive Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 8000,
		},
	]
}
