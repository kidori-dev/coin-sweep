import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** pg 는 bigint 를 문자열로 돌려주므로 블록 번호를 숫자로 바꿔서 쓴다 */
const bigintToNumber = {
  to: (value: number): number => value,
  from: (value: string): number => Number(value),
};

/** 조회한 블록 한 개 = 한 행 */
@Entity('blocks')
export class BlockEntity {
  @PrimaryColumn({ type: 'bigint', transformer: bigintToNumber })
  number!: number;

  @Column({ type: 'varchar', length: 66 })
  hash!: string;

  @Column({ name: 'parent_hash', type: 'varchar', length: 66 })
  parentHash!: string;

  @Column({ name: 'tx_count', type: 'integer' })
  txCount!: number;

  /** 블록이 만들어진 시각 */
  @Column({ name: 'block_time', type: 'timestamptz' })
  blockTime!: Date;

  /** DB 에 저장된 시각 */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
