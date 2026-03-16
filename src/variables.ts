import type { ModuleInstance } from './main.js'

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const vars = [
		{ variableId: 'connected', name: 'Console Connected' },
		{ variableId: 'console_name', name: 'Console Name' },
		{ variableId: 'current_snapshot', name: 'Current Name' },
	]
	for (let i = 1; i <= 36; i++) {
		vars.push({ variableId: `cg${i}`, name: `Control Group ${i}` })
	}
	self.setVariableDefinitions(vars)
}
