import { AstroError } from '../core/errors/errors.js';
import { ActionsWithoutServerOutputError } from '../core/errors/errors-data.js';
import { viteID } from '../core/util.js';
import type { AstroSettings } from '../types/astro.js';
import type { AstroIntegration } from '../types/public/integrations.js';
import { ACTION_RPC_ROUTE_PATTERN, ACTIONS_TYPES_FILE, VIRTUAL_MODULE_ID } from './consts.js';

/**
 * This integration is applied when the user is using Actions in their project.
 * It will inject the necessary routes and middlewares to handle actions.
 */
export default function astroIntegrationActionsRouteHandler({
	settings,
	filename,
}: {
	settings: AstroSettings;
	filename: string;
}): AstroIntegration {
	return {
		name: VIRTUAL_MODULE_ID,
		hooks: {
			async 'astro:config:setup'() {
				settings.injectedRoutes.push({
					pattern: ACTION_RPC_ROUTE_PATTERN,
					entrypoint: 'astro/actions/runtime/route.js',
					prerender: false,
					origin: 'internal',
				});
			},
			'astro:config:done': async (params) => {
				if (params.buildOutput === 'static') {
					const error = new AstroError(ActionsWithoutServerOutputError);
					error.stack = undefined;
					throw error;
				}

				const stringifiedActionsImport = JSON.stringify(
					viteID(new URL(`./${filename}`, params.config.srcDir)),
				);
				settings.injectedTypes.push({
					filename: ACTIONS_TYPES_FILE,
					content: `declare module "astro:actions" {
	type Actions = typeof import(${stringifiedActionsImport})["server"];

	export const actions: Actions;
}`,
				});
			},
		},
	};
}
