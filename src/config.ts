import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	target: string
	send_port: number
	rec_port: number
	cg_count: number
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
		// {
		// 	type: 'dropdown',
		// 	id: 'console',
		// 	label: 'Console Type',
		// 	choices: [
		// 		{ id: 'quantum', label: 'Quantum' },
		// 		{ id: 'sd', label: 'SD' },
		// 	],
		// 	default: 'Quantum',
		// 	width: 10,
		// },
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
		{
			type: 'number',
			id: 'cg_count',
			label: 'No. of Control Groups',
			width: 4,
			min: 1,
			max: 36,
			default: 24,
		},
	]
}
