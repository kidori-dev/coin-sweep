import { Logger } from '@nestjs/common';
import { CommandFactory } from 'nest-commander';

import { CliModule } from './commands/cli.module';

/** CLI 진입점. 예) npm run cli -- polling-block */
async function bootstrap(): Promise<void> {
  await CommandFactory.run(CliModule, {
    logger: ['error', 'warn', 'log'],
    errorHandler: (err: Error & { exitCode?: number }) => {
      // --help 출력도 commander 가 에러(exitCode 0)로 던진다. 정상 종료라 무시한다.
      if (err.exitCode === 0) {
        return;
      }
      Logger.error(err.message, err.stack, 'CLI');
      process.exitCode = 1;
    },
    // 커맨드 run() 안에서 던진 에러. 메시지만 보여주고 실패 코드로 끝낸다.
    serviceErrorHandler: (err: Error) => {
      Logger.error(err.message, 'CLI');
      process.exitCode = 1;
    },
  });
}

void bootstrap();
