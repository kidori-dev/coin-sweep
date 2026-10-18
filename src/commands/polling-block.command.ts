import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command, CommandRunner } from 'nest-commander';

import { AlchemyService } from '../modules/alchemy/alchemy.service';
import { formatBlock } from '../modules/alchemy/format-block';
import { BlocksService } from '../modules/blocks/blocks.service';

/**
 * 사용법: npm run cli -- polling-block
 *
 * blocks 테이블의 마지막 블록 다음부터(비어 있으면 지금 최신 블록부터) 시작해서,
 * 일정 간격마다 새 블록이 생겼는지 확인하고 새 블록을 순서대로 하나씩 조회해 저장한다.
 * Ctrl+C 로 종료한다. 다시 실행하면 멈췄던 곳 다음 블록부터 이어서 한다.
 */
@Command({
  name: 'polling-block',
  description:
    '마지막 저장 블록 다음부터(없으면 지금 블록부터) 새 블록을 계속 조회해 저장한다. Ctrl+C 로 종료한다.',
})
export class PollingBlockCommand extends CommandRunner {
  private readonly logger = new Logger(PollingBlockCommand.name);

  constructor(
    private readonly alchemy: AlchemyService,
    private readonly blocks: BlocksService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async run(): Promise<void> {
    const intervalMs = this.config.get<number>('alchemy.pollIntervalMs')!;

    // 다음에 조회할 블록 번호.
    // - blocks 테이블이 비어 있으면: 지금 최신 블록부터
    // - 저장된 블록이 있으면: 마지막 저장 블록 다음부터 (그사이 밀린 블록을 백필하며 최신까지 따라간다)
    const lastSavedNumber = await this.blocks.findLatestNumber();
    let nextBlockNumber =
      lastSavedNumber === null ? await this.alchemy.getLatestBlockNumber() : lastSavedNumber + 1;
    this.logger.log(
      `#${nextBlockNumber} 부터 조회 시작 ` +
        `(마지막 저장 블록: ${lastSavedNumber === null ? '없음' : `#${lastSavedNumber}`}, ` +
        `${intervalMs}ms 마다 새 블록 확인)`,
    );

    while (true) {
      try {
        const latestBlockNumber = await this.alchemy.getLatestBlockNumber();

        // 지난번 확인 이후 생긴 블록을 빠짐없이 순서대로 조회한다.
        while (nextBlockNumber <= latestBlockNumber) {
          const block = await this.alchemy.getBlock(nextBlockNumber);

          // 노드에 아직 반영되지 않았다. 다음 확인 때 다시 시도한다.
          if (!block) {
            break;
          }

          // 저장에 성공해야 다음 블록으로 넘어간다. 실패하면 다음 확인 때 이 블록부터 다시 한다.
          await this.blocks.save(block);
          this.logger.log(formatBlock(block));
          nextBlockNumber++;
        }
      } catch (err) {
        // 네트워크/DB 오류 등은 로그만 남기고, 다음 확인 때 같은 블록부터 다시 시도한다.
        this.logger.error(`블록 처리 실패: ${(err as Error).message}`);
      }

      await sleep(intervalMs);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
