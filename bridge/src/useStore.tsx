import React from 'react'
import { useSelector, useDispatch}	from 'react-redux';

import Networks 					from './config/networks.json'
import TestnetNetworks 				from './config/networks.testnet.json'

import Slice 						from './reducer'
/* import Web3 						from 'web3' */

export const DISCONNECTED= '';
export const CONNECTING = 'connecting';
export const CONNECTED 	= 'connected';
/* export const getWeb3 = ()=>window.Web3; */

const AppKey = process.env.REACT_APP_GTAG || ''
export const proxy = process.env.REACT_APP_ENDPOINT || ''
export const testnet = process.env.REACT_APP_TESTNET==="1"
export const networks = (testnet ? TestnetNetworks : Networks) as {[chain:string]:NetworkType}
export const ZERO = "0x0000000000000000000000000000000000000000"

export const SYMBOL = process.env.REACT_APP_SYMBOL || ''
export const NETWORK = process.env.REACT_APP_NETWORK || ''

const useStore = () => {
	const G = useSelector((state:StoreObject)=>state)
	// const L = G.L
	const dispatch = useDispatch()
	const update = (payload: Partial<StoreObject>) => dispatch(Slice.actions.update(payload))

	const addTx = (tx:TxType) => {
		const txs = [tx, ...G.txs]
		if (txs.length>10) txs.pop()
		window.localStorage.setItem(AppKey, JSON.stringify(txs))
		update({txs})
	}

	const addToken = (chain: string, token: string) => {
		const addedTokens = {...G.addedTokens, [`${chain}-${token}`]: true };
		window.localStorage.setItem(AppKey + '-addedtokens', JSON.stringify(addedTokens));
		update({addedTokens})
	}
	
	const checkBalance = async (chain:string, address: string, tokens: string[]):Promise<{[token: string]: number}|null> =>  {
		const { ethers } = window
		try {
			const net = networks[chain];
			const json = [] as RpcRequestType[];
			let k = 0;
			for (let token of tokens) {
				if (token===chain) {
					json.push({jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"], id: k++})
				} else {
					json.push({"jsonrpc":"2.0","method":"eth_call","params":[{"to": net.tokens[token].contract, "data":`0x70a08231000000000000000000000000${address.slice(2)}`}, "latest"],"id":k++});
				}
			}
			const response = await fetch(net.rpc, {
				body:JSON.stringify(json),
				headers: {Accept: "application/json","Content-Type": "application/json"},
				method: "POST"
			});
			const result = await response.json();
			if (result!==null && result.length===json.length) {
				const values = {} as {[token: string]: number}
				let k = 0;
				for (let token of tokens) {
					const v = result[k++].result;
					if (token===chain) {
						values[token] = Number(ethers.utils.formatEther(v));
					} else {
						values[token] = Number(ethers.utils.formatUnits(v, net.tokens[token].decimals));
					}
				}
				return values
			}
		} catch (error) {
			console.log(error)
		}
		return null
	}
	const check = async (network:string, txs:Array<string>):Promise<{[txId:string]:number}> =>  {
		
		const results:{[txId:string]:number} = {}
		// const net = networks[network]
		// const web3 = new window.Web3(net.rpc)
		// const height = await web3.eth.getBlockNumber()
		// const limit = 20
		// const count = txs.length
		// for(let i=0; i<count; i+=limit) {
		// 	const json:Array<{jsonrpc:string, method:string, params:Array<string>, id:number}> = []
		// 	let iEnd = i + limit
		// 	if (iEnd>count) iEnd = count
		// 	for (let k=i; k<iEnd; k++) {
		// 		json.push({jsonrpc: '2.0', method: 'eth_getTransactionReceipt', params: [txs[k]], id: k++})
		// 	}
		// 	const response = await fetch(net.rpc, {
		// 		body:JSON.stringify(json),
		// 		headers: {Accept: "application/json","Content-Type": "application/json"},
		// 		method: "POST"
		// 	})
		// 	const result = await response.json();
		// 	if (result!==null && Array.isArray(result)) {
		// 		for(let v of result) {
		// 			results[txs[v.id]] = v.result && v.result.status === '0x1' ? height - Number(v.result.blockNumber) + 1 : -1
		// 		}
		// 	}
		// }
		return results
	}

	return {...G, update, checkBalance, check, addTx, addToken};
}

export default useStore
