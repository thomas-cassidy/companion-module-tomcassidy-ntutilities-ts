import { Bundle } from 'node-osc'
import type { ModuleInstance } from './main.js'

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		fire_snapshot: {
			name: 'Fire Snapshot',
			options: [
				{
					id: 'num',
					type: 'number',
					label: 'Cue Number',
					default: 0,
					min: 0,
					max: 9999,
				},
			],
			callback: async (event) => {
				let cueNumber: number

				if (event.options.num === undefined) return

				try {
					cueNumber = parseFloat(event.options.num.toString()) * 100
				} catch {
					return
				}

				const snapshot = self.cueList.find((cue) => cue.number == cueNumber)
				self.log('debug', JSON.stringify(snapshot))
				if (!snapshot) return

				// const bundle = new Bundle({
				// 	address: `/Shapshots/Fire_Snapshot_number`,
				// 	args: [snapshot.index],
				// })
				// self.sendOSCBundle(bundle)
				self.sendOSC({
					address: `/Snapshots/Recall_Snapshot/${snapshot.index as number}`,
					value: '',
				})
			},
		},
		next_cue: {
			name: 'Fire Next',
			options: [],
			callback: async (_) => {
				self.sendOSC({ address: '/Snapshots/Fire_Next_Snapshot', value: '' })
				self.log('debug', 'fire next')
			},
		},
		prev_cue: {
			name: 'Fire Previous',
			options: [],
			callback: async (_) => {
				self.sendOSC({ address: '/Snapshots/Fire_Previous_Snapshot', value: '' })
				self.log('debug', 'fire prev')
			},
		},
		// THIS DOESN'T WORK AND I HAVE NO IDEA WHY. UNMUTE DOES WORK BUT MUTE DOES NOT.
		control_group_mute: {
			name: 'Control Group Mute',
			options: [
				{
					id: 'num',
					type: 'number',
					label: 'CG Number',
					default: 1,
					min: 1,
					max: 9999,
				},
				{
					id: 'val',
					type: 'dropdown',
					label: 'Mute State',
					default: 'Muted',
					choices: [
						{
							id: 'muted',
							label: 'Muted',
						},
						{
							id: 'unmuted',
							label: 'Unmuted',
						},
					],
				},
			],
			callback: async (e) => {
				self.sendOSC({
					address: `/Control_Groups/${e.options.num}/mute`,
					value: e.options.val === 'muted' ? 1.00000000000001 : 0,
				})
				self.log('debug', 'CG channel mute')
			},
		},
		control_group_fader: {
			name: 'Control Group Fader',
			options: [
				{
					id: 'num',
					type: 'number',
					label: 'CG Number',
					default: 1,
					min: 1,
					max: 9999,
				},
				{
					id: 'val',
					type: 'number',
					label: 'Level',
					default: 0,
					min: -150,
					max: 10,
				},
			],
			callback: async (e) => {
				if (e.options.val === undefined) return

				let value = parseFloat(e.options.val.toString())
				if (value < -89) value = -150
				value = value + 0.00000001

				const bundle = new Bundle({ address: `/Control_Groups/${e.options.num}/fader`, args: [value] })
				self.sendOSCBundle(bundle)

				self.log('debug', `Control group fader, ${e.options.num}, ${e.options.val}`)
			},
		},
		input_channel_mute: {
			name: 'Input Channel Mute',
			options: [
				{
					id: 'num',
					type: 'number',
					label: 'Channel Number',
					default: 1,
					min: 1,
					max: 9999,
				},
				{
					id: 'val',
					type: 'dropdown',
					label: 'Mute State',
					default: 'Muted',
					choices: [
						{
							id: 'muted',
							label: 'Muted',
						},
						{
							id: 'unmuted',
							label: 'Unmuted',
						},
					],
				},
			],
			callback: async (e) => {
				self.sendOSC({ address: `/Input_Channels/${e.options.num}/mute`, value: e.options.val === 'muted' ? 1.0 : 0 })
				self.log('debug', 'Input channel mute')
			},
		},
		input_channel_fader: {
			name: 'Input Channel Fader',
			options: [
				{
					id: 'num',
					type: 'number',
					label: 'Channel Number',
					default: 1,
					min: 1,
					max: 9999,
				},
				{
					id: 'val',
					type: 'number',
					label: 'Level',
					default: 0,
					min: -150,
					max: 10,
				},
			],
			callback: async (e) => {
				if (e.options.val === undefined) return

				let value = parseFloat(e.options.val.toString())
				if (value < -89) value = -150

				value = value + 0.00000001

				const bundle = new Bundle({ address: `/Input_Channels/${e.options.num}/fader`, args: [value] })
				self.sendOSCBundle(bundle)
				self.log('debug', `Input channel fader, ${e.options.num}, ${e.options.val}`)
			},
		},
	})
}
