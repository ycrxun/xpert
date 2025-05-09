import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { ChatController } from './chat.controller'
import { ChatEventsGateway } from './chat.gateway'
import { CommandHandlers } from './commands/handlers'
import { CopilotModule } from '../copilot'
import { CopilotCheckpointModule } from '../copilot-checkpoint'
import { KnowledgebaseModule } from '../knowledgebase/'
import { XpertToolsetModule } from '../xpert-toolset/'
import { XpertProjectModule } from '../xpert-project/project.module'

@Module({
	imports: [CqrsModule, CopilotModule, CopilotCheckpointModule, KnowledgebaseModule, 
		XpertToolsetModule,
		XpertProjectModule
	],
	controllers: [ChatController],
	providers: [ChatEventsGateway, ...CommandHandlers],
	exports: []
})
export class ChatModule {}
