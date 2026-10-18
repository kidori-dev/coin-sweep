import { Logger } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';

import { AlchemyService } from '../modules/alchemy/alchemy.service';
import { formatBlock } from '../modules/alchemy/format-block';
import { BlocksService } from '../modules/blocks/blocks.service';

/**
 * 사용법: npm run cli -- target-block <블록 높이>
 *
 * 입력한 블록 하나만 조회해서 blocks 테이블에 저장하고 종료한다.
 * 이미 저장된 블록이면 조회 없이 건너뛴다.
 */
@Command({
  name: 'target-block',
  arguments: '<blockNumber>',
  description: '입력한 블록 높이의 블록 하나만 조회해 저장한다. 이미 저장돼 있으면 건너뛴다.',
})
export class TargetBlockCommand extends CommandRunner {
  private readonly logger = new Logger(TargetBlockCommand.name);

  constructor(
    private readonly alchemy: AlchemyService,
    private readonly blocks: BlocksService,
  ) {
    super();
  }

  async run([input]: string[]): Promise<void> {
    const blockNumber = Number(input);
    if (!Number.isInteger(blockNumber) || blockNumber < 0) {
      throw new Error(`블록 높이는 0 이상의 정수여야 합니다. (입력값: ${input})`);
    }

    // 이미 저장된 블록이면 Alchemy 를 호출하지 않고 끝낸다.
    if (await this.blocks.exists(blockNumber)) {
      this.logger.log(`#${blockNumber} 은 이미 저장되어 있어 건너뜁니다.`);
      return;
    }

    const block = await this.alchemy.getBlock(blockNumber);
    if (!block) {
      throw new Error(`#${blockNumber} 블록이 아직 없습니다.`);
    }

    await this.blocks.save(block);
    this.logger.log(`${formatBlock(block)} → 저장 완료`);
  }
}
