import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command, CommandRunner } from 'nest-commander';

import { errorMessage } from '../common/errors';
import { AlchemyService } from '../modules/alchemy/alchemy.service';
import { formatBlock } from '../modules/alchemy/format-block';
import { BlocksService } from '../modules/blocks/blocks.service';

/**
 * 사용법: npm run cli -- polling-block
 *
 * 확정된 블록을 하나씩 따라가며 blocks 테이블에 저장한다. Ctrl+C 로 종료한다.
 * 저장된 블록의 토큰 입금은 polling-deposit 이 모아서 확인한다 (blocks.logs_scanned).
 *
 * - 확정된 블록 = 최신 블록에서 DEPOSIT_CONFIRMATIONS 만큼 지난 블록. 그래서 최신보다 그만큼 뒤를 따라간다
 *   (최신 블록은 reorg 로 뒤집힐 수 있어서, 거기서 본 입금은 취소될 수 있다)
 * - 시작 위치: blocks 테이블이 비어 있으면 지금 확정 블록부터, 있으면 마지막 저장 블록 다음부터
 *   (그사이 밀린 블록을 빠짐없이 백필한다)
 */
@Command({
  name: 'polling-block',
  description:
    '확정 블록을 따라가며 blocks 에 저장한다. 마지막 저장 블록 다음부터 이어서 한다. Ctrl+C 로 종료.',
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
    const confirmations = this.config.get<number>('deposit.confirmations')!;

    // 다음에 저장할 블록 번호
    const lastSavedNumber = await this.blocks.findLatestNumber();
    let nextBlockNumber =
      lastSavedNumber === null
        ? Math.max(0, (await this.alchemy.getLatestBlockNumber()) - confirmations)
        : lastSavedNumber + 1;
    this.logger.log(
      `#${nextBlockNumber} 부터 시작 ` +
        `(마지막 저장 블록: ${lastSavedNumber === null ? '없음' : `#${lastSavedNumber}`}, ` +
        `확정 ${confirmations}블록, ${intervalMs}ms 마다 확인)`,
    );

    while (true) {
      try {
        const confirmedBlockNumber = (await this.alchemy.getLatestBlockNumber()) - confirmations;

        // 지난번 확인 이후 확정된 블록을 빠짐없이 순서대로 저장한다
        while (nextBlockNumber <= confirmedBlockNumber) {
          const block = await this.alchemy.getBlock(nextBlockNumber);

          // 노드에 아직 반영되지 않았다. 다음 확인 때 다시 시도한다
          if (!block) {
            break;
          }

          await this.blocks.saveBlock(block);
          this.logger.log(formatBlock(block));
          nextBlockNumber++;
        }
      } catch (err) {
        // 네트워크/DB 오류 등은 로그만 남기고, 다음 확인 때 같은 블록부터 다시 시도한다
        this.logger.error(`블록 처리 실패: ${errorMessage(err)}`);
      }

      await sleep(intervalMs);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
