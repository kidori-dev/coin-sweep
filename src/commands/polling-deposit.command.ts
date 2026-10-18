import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command, CommandRunner } from 'nest-commander';

import { errorMessage } from '../common/errors';
import { DepositScannerService } from '../modules/deposits/deposit-scanner.service';

/**
 * 사용법: npm run cli -- polling-deposit
 *
 * polling-block 이 저장한 블록 중 아직 로그를 확인하지 않은 블록(logs_scanned = false)이
 * DEPOSIT_SCAN_BATCH(기본 10)개 쌓이면, 그 구간을 eth_getLogs 한 번으로 확인해 토큰(ERC-20) 입금을 찾는다.
 * 찾은 입금은 transactions 에 저장하고 유저 포인트를 올린다 (토큰 개수 × currencies.point_ratio).
 * Ctrl+C 로 종료한다.
 *
 * - 블록마다 묻지 않고 모아서 한 번에 물어서 Alchemy 요청을 줄인다 (대신 입금 반영이 조금 늦다)
 * - 이미 transactions 에 있는 tx 는 건너뛴다. 같은 구간을 다시 확인해도 이중 입금이 되지 않는다
 * - 밀린 블록이 많으면 쉬지 않고 이어서 처리한다
 */
@Command({
  name: 'polling-deposit',
  description:
    '저장된 블록을 모아서 eth_getLogs 로 토큰 입금을 찾아 transactions 저장 + 포인트 적립. Ctrl+C 로 종료.',
})
export class PollingDepositCommand extends CommandRunner {
  private readonly logger = new Logger(PollingDepositCommand.name);

  constructor(
    private readonly scanner: DepositScannerService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async run(): Promise<void> {
    const intervalMs = this.config.get<number>('alchemy.pollIntervalMs')!;
    const batchSize = this.config.get<number>('deposit.scanBatch')!;
    this.logger.log(
      `토큰 입금 확인 시작 (확인 안 된 블록이 ${batchSize}개 쌓이면 eth_getLogs 1회, ${intervalMs}ms 마다 확인)`,
    );

    while (true) {
      try {
        // 쌓인 만큼 연달아 처리한다. 덜 쌓였으면 null 이 와서 멈춘다
        let result = await this.scanner.scanLogs(batchSize);
        while (result) {
          this.logger.log(
            `#${result.fromBlock}~#${result.toBlock} 로그 확인: ` +
              `입금 ${result.recorded.length}건, 이미 처리돼 건너뜀 ${result.skipped.length}건`,
          );
          for (const deposit of result.recorded) {
            this.logger.log(`  입금 ${this.scanner.describe(deposit, result.watch)}`);
          }
          for (const deposit of result.skipped) {
            this.logger.log(`  건너뜀 ${deposit.txHash} (log ${deposit.logIndex})`);
          }
          result = await this.scanner.scanLogs(batchSize);
        }
      } catch (err) {
        // 네트워크/DB 오류 등은 로그만 남기고, 다음 확인 때 같은 구간부터 다시 시도한다
        this.logger.error(`토큰 입금 확인 실패: ${errorMessage(err)}`);
      }

      await sleep(intervalMs);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
