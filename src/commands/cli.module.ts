import { Module } from '@nestjs/common';

import { AppConfigModule } from '../config/config.module';
import { DatabaseModule } from '../database/database.module';
import { AlchemyModule } from '../modules/alchemy/alchemy.module';
import { BlocksModule } from '../modules/blocks/blocks.module';
import { PollingBlockCommand } from './polling-block.command';
import { TargetBlockCommand } from './target-block.command';

/** CLI 진입 모듈. 새 커맨드를 만들면 providers 에 추가한다. */
@Module({
  imports: [AppConfigModule, DatabaseModule, AlchemyModule, BlocksModule],
  providers: [PollingBlockCommand, TargetBlockCommand],
})
export class CliModule {}
