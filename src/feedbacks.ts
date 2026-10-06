import { combineRgb } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		ChannelState: {
			name: 'Control Group is at Level',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 153, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'num',
					type: 'number',
					label: 'CG Number',
					default: 1,
					min: 0,
					max: 200,
				},
				{
					id: 'val',
					type: 'number',
					label: 'Level',
					default: 1,
					min: -90,
					max: 10,
				},
			],
			callback: (feedback) => {
				try {
					let cgValue: number

					if ((self.getVariableValue(`cg${feedback.options.num}`) as string) == 'Out') {
						cgValue = -90
					} else {
						cgValue = parseFloat(self.getVariableValue(`cg${feedback.options.num}`) as string)
					}

					if (cgValue == feedback.options.val) {
						return true
					} else {
						console.log('failout')
						return false
					}
				} catch (e) {
					console.log(e)
					return false
				}
			},
		},
	})
}
