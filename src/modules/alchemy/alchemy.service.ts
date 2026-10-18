import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Block, FetchRequest, JsonRpcProvider, Network } from 'ethers';

/**
 * Alchemy 노드에 블록 정보를 물어보는 서비스.
 * 커맨드들은 RPC 를 직접 다루지 않고 이 서비스만 쓴다.
 *
 * 메인 키로 먼저 요청하고, 실패하면(키 오류, 사용량 초과 등) 서브 키로 한 번 더 요청한다.
 */
@Injectable()
export class AlchemyService {
  private readonly logger = new Logger(AlchemyService.name);
  private readonly mainRpc: JsonRpcProvider;
  private readonly subRpc: JsonRpcProvider | null;

  constructor(config: ConfigService) {
    const url = config.get<string>('alchemy.url')!;
    const apiKey = config.get<string>('alchemy.apiKey')!;
    const subApiKey = config.get<string>('alchemy.subApiKey');
    const chainId = config.get<number>('alchemy.chainId')!;

    this.mainRpc = createRpc(url, apiKey, chainId);
    // 서브 키가 비어 있으면 대체 없이 메인 키만 쓴다
    this.subRpc = subApiKey ? createRpc(url, subApiKey, chainId) : null;
  }

  /** 체인의 최신 블록 번호 */
  getLatestBlockNumber(): Promise<number> {
    return this.request((rpc) => rpc.getBlockNumber());
  }

  /** 블록 하나를 조회한다. 아직 없는 블록이면 null */
  getBlock(blockNumber: number): Promise<Block | null> {
    return this.request((rpc) => rpc.getBlock(blockNumber));
  }

  /** 메인 키로 요청하고, 실패하면 서브 키로 다시 요청한다 */
  private async request<T>(call: (rpc: JsonRpcProvider) => Promise<T>): Promise<T> {
    try {
      return await call(this.mainRpc);
    } catch (mainErr) {
      if (!this.subRpc) {
        throw new Error(`Alchemy 요청 실패: ${errorMessage(mainErr)}`);
      }
      this.logger.warn(`메인 키 요청 실패 → 서브 키로 재시도 (${errorMessage(mainErr)})`);

      try {
        return await call(this.subRpc);
      } catch (subErr) {
        throw new Error(`Alchemy 요청 실패 (메인·서브 키 모두): ${errorMessage(subErr)}`);
      }
    }
  }
}

/** url 과 키를 합쳐 RPC 클라이언트를 만든다. 예) https://eth-sepolia.g.alchemy.com/v2 + /<키> */
function createRpc(url: string, apiKey: string, chainId: number): JsonRpcProvider {
  const request = new FetchRequest(`${url.replace(/\/+$/, '')}/${apiKey}`);
  // ethers 는 사용량 초과(429) 시 자체적으로 여러 번 재시도한다. 바로 실패시켜 서브 키로 넘긴다.
  request.setThrottleParams({ maxAttempts: 1 });
  // 체인을 직접 알려준다. 안 알려주면 ethers 가 노드에 체인을 물어보는데,
  // 키가 막혀 있으면 이 확인을 에러 없이 무한 재시도해서 서브 키로 넘어가지 못한다.
  const network = Network.from(chainId);
  return new JsonRpcProvider(request, network, { staticNetwork: network });
}

/** ethers 에러의 전체 메시지에는 요청 URL(=키)이 들어갈 수 있어 짧은 메시지만 쓴다 */
function errorMessage(err: unknown): string {
  return (err as { shortMessage?: string }).shortMessage ?? (err as Error).message;
}
