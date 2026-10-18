import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Block } from 'ethers';
import { Repository } from 'typeorm';

import { BlockEntity } from './entities/block.entity';

/** blocks 테이블 읽기/쓰기 */
@Injectable()
export class BlocksService {
  constructor(
    @InjectRepository(BlockEntity)
    private readonly blocks: Repository<BlockEntity>,
  ) {}

  /** 블록을 저장한다. 이미 있는 번호면 최신 내용으로 덮어쓴다 */
  async save(block: Block): Promise<void> {
    await this.blocks.upsert(
      {
        number: block.number,
        hash: block.hash!,
        parentHash: block.parentHash,
        txCount: block.transactions.length,
        blockTime: new Date(block.timestamp * 1000),
      },
      ['number'],
    );
  }

  /** 이 번호의 블록이 이미 저장되어 있는지 */
  exists(blockNumber: number): Promise<boolean> {
    return this.blocks.existsBy({ number: blockNumber });
  }

  /** 저장된 블록 중 가장 큰 번호. 하나도 없으면 null */
  async findLatestNumber(): Promise<number | null> {
    const latest = await this.blocks.findOne({ where: {}, order: { number: 'DESC' } });
    return latest?.number ?? null;
  }
}
