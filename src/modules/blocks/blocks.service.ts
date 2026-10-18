import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Block } from 'ethers';
import { Repository } from 'typeorm';

import { BlockEntity } from './entities/block.entity';

/** blocks 테이블 읽기/쓰기. 모두 .env 의 CHAIN_ID 체인 기준이다 */
@Injectable()
export class BlocksService {
  constructor(
    @InjectRepository(BlockEntity)
    private readonly blocks: Repository<BlockEntity>,
    private readonly config: ConfigService,
  ) {}

  /**
   * 블록을 저장한다 (logs_scanned = false 로 들어가서 polling-deposit 이 나중에 확인한다).
   * 저장된 바로 앞 블록과 이어지지 않으면(reorg) 저장하지 않고 에러를 낸다.
   */
  async saveBlock(block: Block): Promise<void> {
    const chainId = this.chainId();
    await this.blocks.manager.transaction(async (manager) => {
      const previous = await manager.findOneBy(BlockEntity, {
        chainId,
        number: block.number - 1,
      });
      if (previous && previous.hash !== block.parentHash) {
        throw new Error(
          `reorg 감지: #${block.number} 의 parentHash(${block.parentHash})가 ` +
            `저장된 #${block.number - 1} hash(${previous.hash})와 다릅니다. ` +
            'DEPOSIT_CONFIRMATIONS 를 늘리고 해당 구간의 blocks / transactions 를 확인하세요.',
        );
      }

      await manager.upsert(
        BlockEntity,
        {
          chainId,
          number: block.number,
          hash: block.hash!,
          parentHash: block.parentHash,
          txCount: block.transactions.length,
          blockTime: new Date(block.timestamp * 1000),
        },
        ['chainId', 'number'],
      );
    });
  }

  /** 이 번호의 블록이 이미 저장되어 있는지 */
  exists(blockNumber: number): Promise<boolean> {
    return this.blocks.existsBy({ chainId: this.chainId(), number: blockNumber });
  }

  /** 저장된 블록 중 가장 큰 번호. 하나도 없으면 null */
  async findLatestNumber(): Promise<number | null> {
    const latest = await this.blocks.findOne({
      where: { chainId: this.chainId() },
      order: { number: 'DESC' },
    });
    return latest?.number ?? null;
  }

  private chainId(): number {
    return this.config.get<number>('alchemy.chainId')!;
  }
}
