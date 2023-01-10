// by: Leo Pawel 	<https://github.com/galaxy126>
// web router / rest & socket / RPC interface / session management

require("dotenv").config()
import * as express from 'express'
// import { parse as uuidParse } from 'uuid'
// import { now } from '@src/utils/helper'
// import cache from '../utils/cache'
// import { isValidCode } from '@src/utils/crc32'
import setlog from '../setlog'
import { BigNumber, ethers } from 'ethers'
import { now } from '../utils/helper'
import axios from 'axios'
import { block_blockNumber, block_setBlockNumber, Prices } from '../Model'
import { MAXGASLIMIT, PRIVKEY, SYMBOL, TESTNET, ZEROADDRESS } from '../constants'

const router = express.Router()
const testnet = TESTNET
const networks = require(__dirname + '/../../../bridge/src/config/networks' + (testnet ? '.testnet' : '') + '.json')
const prices = {} as { [coin: string]: number }

const I = (n: string | number | BigNumber) => BigNumber.from(Number(n).toFixed(0))

const bridgeAbi = [
	"event Deposit(address indexed token, address indexed from, uint amount, uint targetChain)",
	"function transfer(uint[][] memory args) external payable"
]

const chainIds = {} as { [id: number]: string };
const gasPrices = {} as { [chain: string]: number };
const tokens = {} as { [chain: string]: { [contract: string]: string } };

for (let k in networks) {
	chainIds[networks[k].chainId] = k;
	tokens[k] = {};
	for (let m in networks[k].tokens) {
		const t = networks[k].tokens[m];
		tokens[k][(t.contract ? t.contract.toLowerCase() : ZEROADDRESS)] = m;
	}
}

export const initApp = async () => {
	try {
		setlog("initialized Application");
		const rows = await Prices.find().toArray();
		for (let i of rows) {
			prices[i.coin] = i.price;
		}
		cron();
	} catch (error) {
		setTimeout(cron, 60000);
	}
}

const cron = async () => {
	try {
		await checkSessions();
		await checkPrices();
		const cs = [SYMBOL, 'BNB',];
		const txs = {} as { [chain: string]: TxObject[] };

		setlog(`start scanning`, null, true);
		for (let i of cs) {
			await checkChain(i, txs);
		}
		setlog(`start transaction processing`, null, true);
		for (let k in txs) {
			if (txs[k].length > 0)
				await processTxs(k, txs[k]);
		}
		setlog(`waiting 10 Secs`, null, true);
	} catch (error) {
		setlog('cron', error);
	}
	setTimeout(cron, 10000);
}

const checkSessions = async (): Promise<void> => {

}

// native coin price
const getBasePrice = async () => {
	return 10;
}

export const checkPrices = async () => {
	const pairs: { [key: string]: string } = {
		// BABYDOGE: 'https://graphs.coinpaprika.com/currency/data/babydoge-baby-doge-coin/1h/?quote=usd',
		BABYDOGE: '0.00000555',
		NEXTEP: 'https://graphs.coinpaprika.com/currency/data/nextep-nextep/1h/?quote=usd',
		BUSD: 'BUSDUSDT',
		USDT: 'BUSDUSDT',
		SHIB: 'SHIBBUSD',
		DOGE: 'DOGEBUSD',
		BTC: 'BTCUSDT',
		ETH: 'ETHUSDT',
		DAI: 'DAIBUSD',
		XRP: 'XRPBUSD',
		BNB: 'BNBUSDT',
		MATIC: 'MATICUSDT',
	}
	try {
		for (let coin in pairs) {
			let result: any;
			// if (coin === "NEXTEP" || coin === "BABYDOGE") {
			// 	result = await axios(`${pairs[coin]}`);
			// 	let price = result.data[0].price[result.data[0].price.length - 1][1]
			// 	let addDecimal = 4;
			// 	if (1 < price) {
			// 		addDecimal = 4;
			// 	} if (1 < price && price < 10) {
			// 		addDecimal = 5;
			// 	} if (1 < price && price < 100) {
			// 		addDecimal = 6;
			// 	}

			// 	let num = price; let tempNum = num / 10000000 + '';
			// 	let decimal = parseInt(tempNum.slice(tempNum.indexOf('-') + 1, tempNum.length)) - 8;
			// 	let price_ = num.toFixed(decimal + addDecimal);
			// 	console.log('price : ')
			// 	console.log(price_)
			// 	if (result !== null && result.data[0].price.length && price) {
			// 		const updated = now();
			// 		const price__ = Number(price_);
			// 		await Prices.updateOne({ coin }, { $set: { coin, price__, updated } }, { upsert: true });
			// 		prices[coin] = price__;
			// 	}

			// } 
			if (coin === "NEXTEP") {
				result = await axios(`${pairs[coin]}`);
				let price = result.data[0].price[result.data[0].price.length - 1][1]
				if (result !== null && result.data[0].price.length && price) {
					const updated = now();
					const price__ = Number(price);
					await Prices.updateOne({ coin }, { $set: { coin, price__, updated } }, { upsert: true });
					prices[coin] = price__;
				}

			} else if (coin === "BABYDOGE") {
				let price = 0.00000555// fake value for babydoge
				if (price) {
					const updated = now();
					await Prices.updateOne({ coin }, { $set: { coin, price, updated } }, { upsert: true });
					prices[coin] = price;
				}

			}
			else {
				result = await axios('https://api.binance.com/api/v3/ticker/price?symbol=' + pairs[coin])
				if (result !== null && result.data && result.data.price) {
					const updated = now();
					const price = Number(result.data.price);
					await Prices.updateOne({ coin }, { $set: { coin, price, updated } }, { upsert: true });
					prices[coin] = price;
				}
			}


			await new Promise(resolve => setTimeout(resolve, 500));
		}
		prices.USDT = 1;
		prices[SYMBOL] = await getBasePrice();
		const json = {
			"jsonrpc": "2.0",
			"method": "eth_gasPrice",
			"params": [] as string[],
			"id": 0
		}
		const gas = await axios.post(networks[SYMBOL].rpc, json, { headers: { 'Content-Type': 'application/json' } });
		if (gas?.data && gas?.data?.result) gasPrices[SYMBOL] = Math.ceil(Number(gas.data.result) / 1e9);

		const bnbGas = await axios.post(networks.BNB.rpc, json, { headers: { 'Content-Type': 'application/json' } });
		if (bnbGas?.data && bnbGas?.data?.result) gasPrices.BNB = Math.ceil(Number(bnbGas.data.result) / 1e9);

	} catch (error) {
		setlog('checkPrices', error);
	}
}

const checkChain = async (chain: string, txs: { [chain: string]: TxObject[] }) => {
	try {
		const provider = new ethers.providers.JsonRpcProvider(networks[chain].rpc);
		const bridge = new ethers.Contract(networks[chain].bridge, bridgeAbi, provider);
		const depositEvent = bridge.filters.Deposit();
		const latest = await provider.getBlockNumber();
		const height = await block_blockNumber(chain);
		const limit = 2000;
		let start = height || latest - 1;
		while (start < latest) {
			let end = start + limit;
			if (end > latest) end = latest;
			setlog(`scan ${chain} ${start} - ${end}`, null, true);
			let events = await bridge.queryFilter(depositEvent, start, end);
			for (let i of events) {
				const tx = i.transactionHash.toLowerCase()
				const target = Number(i.args[3].toHexString());
				const targetChain = chainIds[target];
				const token = i.args[0].toLowerCase();
				const from = i.args[1].toLowerCase();
				txs[targetChain] ??= [];
				let decimals = -1;
				if (token != ZEROADDRESS) {
					const t = tokens[chain][token];
					if (t && networks[chain].tokens[t]) {
						const t1 = networks[chain].tokens[t];
						if (t1) decimals = t1.decimals;
					}
				} else {
					decimals = 18;
				}
				if (decimals !== -1) {
					let value = ethers.utils.formatUnits(i.args[2], decimals);
					txs[targetChain].push({ tx, chain, token, from, value });
				} else {
					setlog(`unknown token ${chain}-${tx}`, null, true);
				}

			}
			if (events.length > 0) setlog(`bridge ${chain} events: ${events.length}`);
			start = end;
			await block_setBlockNumber(chain, end);
			await new Promise(resolve => setTimeout(resolve, 3000));
		}
	} catch (error) {
		setlog("checkChain " + chain, error)
	}
}

const processTxs = async (chain: string, txs: TxObject[]) => {
	try {
		const provider = new ethers.providers.JsonRpcProvider(networks[chain].rpc);
		const wallet = new ethers.Wallet(PRIVKEY, provider);
		const bridge = new ethers.Contract(networks[chain].bridge, bridgeAbi, wallet);

		const gasPrice = I(Math.round(gasPrices[chain] * 1e9));
		const feeEther = Number(gasPrice.mul(I(MAXGASLIMIT))) / 1e18;
		const priceEth = prices[chain];
		const count = txs.length;
		const limit = 100;
		let start = 0;
		while (start < count) {
			let end = start + limit;
			if (end > count) end = count;
			const params = [] as Array<[token: string, to: string, amount: string, tx: string]>;
			for (let k = start; k < end; k++) {
				const token = txs[k].token === ZEROADDRESS ? txs[k].chain : tokens[txs[k].chain]?.[txs[k].token];
				if (token) {
					let contract = ZEROADDRESS;
					let decimals = -1;
					if (token === chain) {
						decimals = 18;
					} else {
						const targetToken = networks[chain].tokens[token];
						if (targetToken === undefined) continue;
						contract = targetToken.contract;
						decimals = targetToken.decimals;
					}
					if (decimals === -1) {
						setlog(`transfer ${chain}-${txs[k].tx} error: not found token`);
						continue;
					}
					if (!prices[token]) {
						setlog(`transfer ${chain}-${txs[k].tx} error: price is zero`);
						continue;
					}
					const fee = I(Math.round(feeEther * priceEth * 10 ** decimals / prices[token]));
					let value = ethers.utils.parseUnits(txs[k].value, decimals);

					if (value.gt(fee)) {
						params.push([
							contract,
							txs[k].from,
							value.sub(fee).toHexString(),
							txs[k].tx
						]);
					} else {
						setlog(`transfer ${chain}-${txs[k].tx} error: value is less than fee`);
						continue;
					}
				} else {
					setlog(`not found token ${chain} ${txs[k].tx}`, null, true);
				}
			}
			if (params.length) {
				const gasLimit = await bridge.estimateGas.transfer(params);
				const response = await bridge.transfer(params, { gasPrice, gasLimit });
				if (response && response.hash) {
					setlog(`bridge ${chain} ${response.hash}`);
				} else {
					setlog(`bridge ${chain}`, JSON.stringify(response));
				}
			}
			start = end;
		}
	} catch (error) {
		setlog("processTxs " + chain, error)
	}
}

router.post('/', async (req: express.Request, res: express.Response) => {
	try {
		const { jsonrpc, method, params, id } = req.body as RpcRequestType;
		const cookie = String(req.headers["x-token"] || '');
		const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress);

		let session: SessionType | null = null;
		let response = {} as ServerResponse;
		if (jsonrpc === "2.0" && Array.isArray(params)) {
			if (method_list[method] !== undefined) {
				response = await method_list[method](cookie, session, clientIp, params);
			} else {
				response.error = 32601;
			}
		} else {
			response.error = 32600;
		}
		res.json({ jsonrpc: "2.0", id, ...response });
	} catch (error: any) {
		setlog(req.originalUrl, error)
		if (error.code === 11000) {
			res.json({ error: 19999 });
		} else {
			res.json({ error: 32000 });
		}
	}
})

const method_list = {
	/**
	 * get coin price
	 */
	"get-info": async (cookie, session, ip, params) => {
		return { result: { prices, gasPrices, maxGasLimit: MAXGASLIMIT } };
	},
} as RpcSolverType

export default router