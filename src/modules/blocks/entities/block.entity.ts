import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** pg 는 bigint 를 문자열로 돌려주므로 블록 번호를 숫자로 바꿔서 쓴다 */
const bigintToNumber = {
  to: (value: number): number => value,
  from: (value: string): number => Number(value),
};

/** 저장한(확정된) 블록 한 개 = 한 행. (chain_id, number) 가 PK */
@Entity('blocks')
export class BlockEntity {
  @PrimaryColumn({ name: 'chain_id', type: 'integer' })
  chainId!: number;

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

  /**
   * 이 블록의 ERC20 Transfer 로그(토큰 입금)를 확인했는지.
   * polling-deposit 이 블록 여러 개를 eth_getLogs 한 번으로 확인하고 한꺼번에 true 로 바꾼다
   */
  @Column({ name: 'logs_scanned', type: 'boolean', default: false })
  logsScanned!: boolean;

  /** DB 에 저장된 시각 */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
