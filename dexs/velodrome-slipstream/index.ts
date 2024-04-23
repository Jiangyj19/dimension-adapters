import { FetchOptions, FetchResultVolume, SimpleAdapter } from "../../adapters/types"
import { CHAIN } from "../../helpers/chains"

const gurar = '0xc734656F0112CA18cdcaD424ddd8949F3D4c1DdD';
const abis: any = {
  "forSwaps": "function forSwaps(uint256 _limit, uint256 _offset) view returns ((address lp, int24 type, address token0, address token1, address factory, uint256 pool_fee)[])"
}

interface IForSwap {
  lp: string;
  token0: string;
  token1: string;
}

interface ILog {
  address: string;
  data: string;
  transactionHash: string;
  topics: string[];
}
const event_swap = 'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)'

const fetch = async (timestamp: number, _: any, { api, getLogs, createBalances, }: FetchOptions): Promise<FetchResultVolume> => {
  const dailyVolume = createBalances()
  const forSwaps: IForSwap[] = (await api.call({
    target: gurar,
    params: [3000, 640], // Slipstream launched after ~650 v2 pools were already created
    abi: abis.forSwaps,
    chain: CHAIN.OPTIMISM,
  })).filter(t => Number(t.type) > 0).map((e: any) => {
    return {
      lp: e.lp,
      token0: e.token0,
      token1: e.token1,
    }
  })

  const targets = forSwaps.map((forSwap: IForSwap) => forSwap.lp)

  const logs: ILog[][] = await getLogs({
    targets,
    eventAbi: event_swap,
    flatten: false,
  })

  logs.forEach((logs: ILog[], idx: number) => {
    const { token0, token1 } = forSwaps[idx]
    logs.forEach((log: any) => {
      dailyVolume.add(token1, BigInt(Math.abs(Number(log.amount1))))
    })
  })

  return { dailyVolume, timestamp }
}
const adapters: SimpleAdapter = {
  adapter: {
    [CHAIN.OPTIMISM]: {
      fetch: fetch as any,
      start: 1709686921,
    }
  }
}
export default adapters;
