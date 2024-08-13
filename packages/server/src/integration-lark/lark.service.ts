import * as lark from '@larksuiteoapi/node-sdk'
import { DEFAULT_TENANT } from '@metad/contracts'
import { environment } from '@metad/server-config'
import { Injectable } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import { Observable, switchMap } from 'rxjs'
import { TenantService } from '../tenant'
import { client } from './client'
import { LarkBotMenuCommand, LarkMessageCommand } from './commands'

@Injectable()
export class LarkService {
	eventDispatcher = new lark.EventDispatcher({
		verificationToken: environment.larkConfig.verificationToken,
		encryptKey: environment.larkConfig.encryptKey,
		loggerLevel: lark.LoggerLevel.debug
	}).register({
		'im.message.receive_v1': async (data) => {
			/**
			 * {
				schema: '2.0',
				event_id: 'b47ff4f15c86d5af497d75da76f90a84',
				token: '',
				create_time: '1723552741302',
				event_type: 'im.message.receive_v1',
				tenant_key: '',
				app_id: '',
				message: {
					chat_id: 'oc_3d8956dd83110e5e88f319613db55d94',
					chat_type: 'p2p' | 'group',
					content: '{"text":"HI"}',
					create_time: '1723552740951',
					message_id: 'om_d6c3ef63049d7a7d5963f02b72f5d5b8',
					message_type: 'text',
					update_time: '1723552740951'
				},
				sender: {
					sender_id: {
					open_id: '',
					union_id: '',
					user_id: '327b132g'
					},
					sender_type: 'user',
					tenant_key: ''
				},
				[Symbol(event-type)]: 'im.message.receive_v1'
			  }
			 */
			const tenant = await this.tenantService.findOne({ name: DEFAULT_TENANT })

			if (data.message.chat_type !== 'p2p') {
				return true
			}
			console.log(data)

			const result = await this.commandBus.execute<LarkMessageCommand, Observable<any>>(
				new LarkMessageCommand({
					tenant,
					message: data.message as any
				})
			)
			result
				.pipe(
					switchMap((message) => client.im.message.create(message))
				)
				.subscribe({
					next: (result) => {
						//
					},
					error: (err) => {
						console.error(err)
					}
				})

			return true
		},
		'application.bot.menu_v6': async (data) => {
			/**
			 * {
				schema: '2.0',
				event_id: '3632caaa3c0143c072b2149c5b58ae8f',
				token: '',
				create_time: '1723551863000',
				event_type: 'application.bot.menu_v6',
				tenant_key: '',
				app_id: 'cli_a6300438b435100b',
				event_key: 'select_cube_sales',
				operator: {
					operator_id: {
						open_id: '',
						union_id: '',
						user_id: '327b132g'
					}
				},
				timestamp: 1723551863,
				[Symbol(event-type)]: 'application.bot.menu_v6'
			  }
			 * 
			 */
			const {event_key} = data
			if (event_key.startsWith('select_cube:')) {
				const tenant = await this.tenantService.findOne({ name: DEFAULT_TENANT })
				console.log(data)
				const result = await this.commandBus.execute<LarkBotMenuCommand, Observable<any>>(
					new LarkBotMenuCommand({
						tenant,
						message: data as any
					})
				)

				result.subscribe((message) => {
					client.im.message.create(message)
				})
			}

			return true
		}
	})

	webhookEventDispatcher = lark.adaptExpress(this.eventDispatcher, { autoChallenge: true })

	constructor(
		private readonly tenantService: TenantService,
		private readonly commandBus: CommandBus
	) {}
}
