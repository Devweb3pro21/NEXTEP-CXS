declare interface Window  {
	connector: IConnector;
	ethereum: any;
	ethers: any;
}

declare interface RpcRequestType {
	jsonrpc: 		"2.0"
	method: 		string
	params: 		Array<any>
	id: 			string|number
}

declare interface RpcResponseType {
	jsonrpc: 		"2.0"
	id: 			string|number
	result?: 		any
	error?: 		number
}
declare interface TokenObjectType {
	label:			string
	decimals: 		number
	contract?: 		string
	pegging?: 		boolean
	fake?: 			boolean
}

declare interface NetworkType {
	label: 			string
	bridge: 		string
	chainId: 		number
	confirmations: 	number 
	blocktime: 		number
	rpc: 			string
	explorer: 		string
	service: 		string
	erc20: 			string
	tokens: {[symbol:string]:TokenObjectType}
}

declare interface TxType {
	txId: string
	chain:string
	targetChain:string
	address:string
	token:string
	value:number
	created: number
	receivedAmount?:number|boolean // if failed, false
	updated:number
}
declare interface ListDataType {
	key:			string
	label:			string
	icon:			string
	overlayIcon?:	string
}

declare interface MetmaskTxType {
	to: string
	from: string
	value: string
	data: string
	chainId: string
}

declare interface StoreObject {
	lang: string
	L: {[lang:string]:any}

	loading: boolean
	txs: TxType[]
	addedTokens: {[token: string]: boolean}
}