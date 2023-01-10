import React, { useEffect } from 'react';

import useStore, { CONNECTED, CONNECTING, ZERO, SYMBOL, networks, DISCONNECTED, proxy, NETWORK } from '../useStore';
import './index.scss';
import './home.scss';
import ImgBack from '../assets/bg.webp'
import InputCombo from '../components/InputCombo';
import Loading from '../components/Loading';
import DialogTokens from './DialogTokens';
import { ethers } from "ethers";
/* import { getApiUrl } from '../util'; */
import ConnectWalletButton from "../components/global/ConnectWalletButton";
import { useBlockchainContext } from '../context';

const ERR_INSTALL = '🦊 You must install Metamask into your browser: https://metamask.io/download.html'
const ERR_DISCONNECTED = '🦊 walllet disconnected'
const ERR_NOACCOUNTS = '🦊 No selected address.'
const ERR_UNKNOWN = '🦊 Unknown error'
const ERR_ASKCONNECT = '🦊 Connect to Metamask using the button on the top right.'
const ERR_CANCELLED = '🦊 You cancelled requested operation.'
const ERR_CHAINID = '🦊 Invalid chain id #:chainId'


interface HomeStatus {
    query: string
    loading: boolean
    submitLabel: string

    chain: string
    targetChain: string
    token: string
    value: string
    balance: number
    fee: number
    receiveValue: number
    showTokens: boolean
}
interface WalletStatus {
    status: string
    address: string
    balance: number
    err: string
}
interface BaseStatus {
    prices: { [chain: string]: number }
    gasPrices: { [chain: string]: number }
    maxGasLimit: number
}

const Home = () => {
    const [state, { dispatch }] = useBlockchainContext();
    const { web3Provider, address, chainId, signer } = state;
    const { addedTokens, addToken, L, txs, addTx } = useStore();
    const refAmount = React.useRef<HTMLInputElement>(null)

    const [chains, setChains] = React.useState<ListDataType[]>([])

    const [status, setStatus] = React.useState<HomeStatus>({
        loading: false,
        submitLabel: '',
        query: '',
        chain: 'BNB',
        targetChain: SYMBOL,
        token: '',
        value: '0.0',
        balance: 0,
        fee: 0,
        receiveValue: 0,
        showTokens: false
    })

    const [tokens, setTokens] = React.useState({
        show: false,
        loading: false,
        selected: '',
        data: [] as ListDataType[]
    })

    const [walletStatus, setWalletStatus] = React.useState<WalletStatus>({
        status: '',
        address: '',
        balance: 0, // checking | number
        err: '',
    })
    const [base, setBase] = React.useState<BaseStatus>({
        prices: {},
        gasPrices: {},
        maxGasLimit: 0,
    })
    const set = (attrs: Partial<HomeStatus>) => setStatus({ ...status, ...attrs })

    const [time, setTime] = React.useState(+new Date())

    const getInfo = async () => {
        try {
            const res = await fetch(proxy, {
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "get-info",
                    params: [],
                    id: 1
                }),
                headers: { Accept: "application/json", "Content-Type": "application/json" },
                method: "POST"
            })
            const json = await res.json()
            console.log(Math.round(+new Date() / 1000), json.result)
            setBase(json.result)

        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        if (state.address) {
            setWalletStatus({ ...walletStatus, address: state.address })
        }
    }, [state.address])
    const onChangeAccount = (accounts: any) => {
        _connect(status.chain, accounts);
    }
    const onChangeChainId = (newChainId: any) => {
        const num = Number(newChainId);
        for (let key in networks) {
            if (networks[key].chainId === num) {
                let targetChain = status.targetChain;
                if (key === 'CXS' && targetChain === 'CXS') {
                    targetChain = status.chain;
                } else if (key !== 'CXS' && targetChain !== 'CXS') {
                    targetChain = 'CXS';
                }
                setStatus({ ...status, chain: key, targetChain });
                _connect(key);
                return;
            }
        }
        _connect(status.chain);
    }

    React.useEffect(() => {
        // const { ethereum } = window;
        if (web3Provider) {
            web3Provider.provider.on('accountsChanged', onChangeAccount);
            web3Provider.provider.on('chainChanged', onChangeChainId);
        } else {
            console.log("not found metamask")
        }
    }, [status.chain]);

    React.useEffect(() => {
        const cs = [] as ListDataType[]
        for (let key in networks) {
            if (key !== SYMBOL) cs.push({ key, label: networks[key].label, icon: `/networks/${key}.svg` })
        }
        setChains(cs);
        switchNetwork(status.chain);
    }, []);


    React.useEffect(() => {
        if (walletStatus.status === CONNECTED) {
            getChainId().then(chainId => {
                if (chainId === networks[status.chain].chainId) {
                    setWalletStatus({ ...walletStatus, status: CONNECTED, err: '' })
                } else {
                    setWalletStatus({ ...walletStatus, status: DISCONNECTED, err: ERR_DISCONNECTED })
                }
            });
        }
    }, [status.chain]);

    React.useEffect(() => {
        getInfo()
        const timer = setTimeout(() => setTime(+new Date()), 10000)
        return () => clearTimeout(timer)
    }, [time]);

    const _connect = async (chain: string, accounts?: Array<string>) => {
        // const { ethereum } = window
        let err = '';
        try {
            setWalletStatus({ ...walletStatus, status: CONNECTING, err: '' })
            if (web3Provider) {

                if (accounts === undefined) {
                    // accounts = await web3Provider.provider.request({ method: 'eth_requestAccounts' })
                    accounts = state.address;
                }

                if (state.address && state.address.length > 0) {
                    const chainId = await getChainId();
                    if (chainId === networks[chain].chainId) {
                        setWalletStatus({ ...walletStatus, status: CONNECTED, address: state.address, err: '' })
                        return
                    } else {
                        err = ERR_CHAINID.replace(':chainId', String(chainId))
                    }
                } else {
                    err = ERR_NOACCOUNTS
                }
            } else {
                err = ERR_INSTALL
            }
        } catch (error: any) {
            err = '🦊 ' + error.message
        }
        setWalletStatus({ ...walletStatus, status: DISCONNECTED, address: '', err })
    }

    const addTokenToWallet = async (address: string, symbol: string, decimals: number) => {
        // const { ethereum } = window
        if (web3Provider) {
            try {
                if (addedTokens[`${status.chain}-${symbol}`]) return;
                // wasAdded is a boolean. Like any RPC method, an error may be thrown.

                let wasAdded: any;
                if (symbol == "NEXTEP") {
                    wasAdded = await web3Provider.provider.request({
                        method: 'wallet_watchAsset',
                        params: {
                            type: 'ERC20', // Initially only supports ERC20, but eventually more!
                            options: {
                                address,
                                symbol,
                                decimals,
                                image: `https://bridge.nxchainscan.com/coins/${symbol.toUpperCase()}.png` //  // symbol===SYMBOL ? '/logo.svg' : `/coins/${symbol}.svg`
                            },
                        },
                    });
                } else {
                    wasAdded = await web3Provider.provider.request({
                        method: 'wallet_watchAsset',
                        params: {
                            type: 'ERC20', // Initially only supports ERC20, but eventually more!
                            options: {
                                address,
                                symbol,
                                decimals,
                                image: `https://bridge.nxchainscan.com/coins/${symbol.toUpperCase()}.svg` //  // symbol===SYMBOL ? '/logo.svg' : `/coins/${symbol}.svg`
                            },
                        },
                    });
                }
                if (wasAdded) {
                    console.log(`token ${symbol} added!`);
                    addToken(status.chain, symbol);
                } else {
                    console.log(`token ${symbol} failed!`);
                }
            } catch (error) {
                console.log(error);
            }
        }
    }

    const getChainId = async () => {
        // const { ethereum } = window
        if (web3Provider) {
            return Number(await web3Provider.provider.request({ method: 'eth_chainId' }));
        }
        return 0
    }

    const connect = async (): Promise<void> => {
        _connect(status.chain);
    }

    const onChangeNetwork = async (chain: string) => {
        const _chain = status.targetChain === SYMBOL ? 'chain' : 'targetChain'
        const c1 = _chain === 'chain' ? chain : status.chain
        const c2 = _chain === 'targetChain' ? chain : status.targetChain
        const { receiveValue, fee } = getReceivedValue(c1, c2, status.token, Number(status.value))
        set({ [_chain]: chain, token: '', receiveValue, fee })
        if (_chain === 'chain') {
            await switchNetwork(chain)
            await _connect(chain);
        }
    }

    const swapChains = async () => {
        let receiveValue = 0, fee = 0;
        if (status.token) {
            const res = getReceivedValue(status.targetChain, status.chain, status.token, Number(status.value))
            receiveValue = res.receiveValue;
            fee = res.fee;
        }
        set({ chain: status.targetChain, targetChain: status.chain, token: '', receiveValue, fee }) // , /* token, */ chainId, rpc
        const changed = await switchNetwork(status.targetChain)
        if (changed) await _connect(status.targetChain);
    }

    const switchNetwork = async (chain: string) => {
        // const { ethereum } = window
        if (web3Provider) {
            try {
                await web3Provider.provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x' + networks[chain].chainId.toString(16) }],
                });
                return true;
            } catch (error: any) {
                return await addNetwork(chain)
            }
        }
        return false;
    }
    const addNetwork = async (chain: string) => {
        // const { ethereum } = window
        if (web3Provider) {
            try {
                const chainId = networks[chain].chainId;
                await web3Provider.provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x' + chainId.toString(16),
                        chainName: L['chain.' + chain.toLowerCase()],
                        nativeCurrency: {
                            name: networks[chain].label,
                            symbol: chain,
                            decimals: 18
                        },
                        rpcUrls: [networks[chain].rpc],
                        blockExplorerUrls: [networks[chain].explorer],
                        // iconUrls: [`https://resource.neonlink.io/networks/${chainId}.webp`]
                    }]
                });
                return true;
            } catch (error) {
                console.log(error)
            }
        }
        return false;
    }

    const showTokens = () => {
        if (walletStatus.status !== CONNECTED) {
            setWalletStatus({ ...walletStatus, err: 'First, connect wallet.' })
        } else {
            // const chainIcon = status.chain === SYMBOL ? 'https://bridge.nxchainscan.com/nxchain.png' : `https://bridge.nxchainscan.com/networks/${status.chain}.svg`
            const chainIcon = status.chain === SYMBOL ? '/nxchain.png' : `/networks/${status.chain}.svg`
            const ts = [
                { key: status.chain, label: networks[status.chain].label, icon: chainIcon }
            ] as ListDataType[]
            for (let key in networks[status.chain].tokens) {
                if (key === status.targetChain || networks[status.targetChain].tokens[key] !== undefined) {
                    ts.push({ key, label: networks[status.chain].tokens[key].label, icon: key === SYMBOL ? '/CXS.png' : `/coins/${key}.svg`, overlayIcon: chainIcon })
                }
            }
            setTokens({ ...tokens, data: ts, show: true });
        }
    }

    const onChangeToken = async (token: string, balance: number) => {
        if (status.chain !== token) {
            const t = networks[status.chain].tokens[token];
            await addTokenToWallet(t.contract || '', token, t.decimals);
        }
        console.log('onChangeToken : -> token, balance ')
        console.log(token, balance)

        const { receiveValue, fee } = getReceivedValue(status.chain, status.targetChain, token, Number(status.value));
        console.log('receiveValue, fee : ')
        console.log(receiveValue, fee)
        set({ token, balance, receiveValue, fee })
    }

    const checkTxs = async () => {
        // try {
        // 	if (!isPending) {
        // 		setPending(true)
        // 		const params1:{[chainId:string]:Array<string>} = {};
        // 		const params2:Array<string> = [];
        // 		for(let k in G.pending) {
        // 			const v = G.pending[k]
        // 			const confirmations = txs[k]?.confirmations || 0
        // 			if (networks[v.chain].confirmations > confirmations) {
        // 				if (params1[v.chain]===undefined) params1[v.chain] = []
        // 				params1[v.chain].push(k)
        // 			} else {
        // 				if (txs[k] && !txs[k].err && !txs[k].tx) params2.push(k)
        // 			}
        // 		}
        // 		if (Object.keys(params1).length) {
        // 			const res = await Promise.all(Object.keys(params1).map(k=>G.check(k, params1[k])))
        // 			const txs:TxTypes = {...txs}
        // 			const now = Math.round(new Date().getTime() / 1000)
        // 			for(let v of res) {
        // 				if (v) {
        // 					for(let k in v) {
        // 						if (v[k]===-1) {
        // 							if (now - G.pending[k].created > 600) txs[k] = {...txs[k], err:true}
        // 						} else {
        // 							txs[k] = {...txs[k], confirmations:v[k]}
        // 						}
        // 					}
        // 				}
        // 			}
        // 			G.setTxs(txs)
        // 		}
        // 		if (params2.length) {
        // 			// const rows = await request('/get-txs', params2)
        // 			// if (rows && Array.isArray(rows)) {
        // 			// 	const now = Math.round(new Date().getTime() / 1000)
        // 			// 	const txs:TxTypes = {...txs}
        // 			// 	for(let v of rows) {
        // 			// 		if (v.tx || (v.err && now - G.pending[v.key].created > 600)) {
        // 			// 			txs[v.key] = {...txs[v.key], tx:v.tx, err:v.err, fee:v.fee}
        // 			// 		}
        // 			// 	}
        // 			// 	G.setTxs(txs)
        // 			// }
        // 		}
        // 		setPending(false)
        // 	}
        // } catch (err) {
        // 	console.log(err)
        // }
    }

    const onChangeQuery = (query: string) => {
        set({ query })
    }

    const getReceivedValue = (chain: string, targetChain: string, token: string, amount: number) => {
        if (token !== '') {
            if (base.gasPrices[chain] !== undefined) {
                const feeEther = base.maxGasLimit * base.gasPrices[targetChain] / 1e9;
                const decimals = token === targetChain ? 18 : networks[targetChain].tokens[token].decimals;

                const fee = Number((feeEther * base.prices[targetChain] / base.prices[token]).toFixed(decimals < 8 ? decimals : 8));
                let tarFee = base.prices[targetChain];
                let priToken = base.prices[token];
                let result_ = feeEther * tarFee / priToken;

                console.log('fee, tarFee,  priToken : ', fee, tarFee, priToken);

                console.log('result_ : ');
                console.log(result_);

                if (amount > fee) {
                    const receiveValue = Number((amount - fee).toFixed(decimals < 8 ? decimals : 8));
                    return { receiveValue, fee };
                }
                return { receiveValue: 0, fee };
            }
        }
        return { receiveValue: 0, fee: 0 };
    }

    const onChangeValue = (value: string) => {
        const { receiveValue, fee } = getReceivedValue(status.chain, status.targetChain, status.token, Number(value))
        set({ value, receiveValue, fee })
    }

    const getBalance = async (chain: string, token: string, address: string): Promise<number> => {
        const net: any = networks[chain]
        const provider = new ethers.providers.JsonRpcProvider(net.rpc)
        let value: any = 0;
        if (chain === token) {
            value = await provider.getBalance(address)
        } else {
            const contract = new ethers.Contract(net.tokens[token].contract, ["function balanceOf(address account) public view returns (uint256)"], provider)
            value = await contract.balanceOf(address)
        }
        const decimals = chain === token ? 18 : net.tokens[token].decimals
        return Number(Number(ethers.utils.formatUnits(value, decimals)).toFixed(decimals > 6 ? 6 : decimals))
    }

    const waitTx = async (chain: string, txid: string) => {
        const net: any = networks[chain]
        const provider: any = new ethers.providers.JsonRpcProvider(net.rpc)
        let k = 0;
        while (++k < 100) {
            const tx = await provider.getTransactionReceipt(txid);
            if (tx && tx.blockNumber) return true;
            await new Promise(resolve => setTimeout(resolve, 5000))
        }
        return false
    }

    const submit = async () => {
        try {
            if (walletStatus.status !== CONNECTED) {
                connect();
                return;
            }
            if (status.token === '') {
                setWalletStatus({ ...walletStatus, err: "Please select a token." });
                return;
            }
            const net: any = networks[status.chain]
            const token: any = net.tokens[status.token]
            const targetNet: any = networks[status.targetChain]
            const amount: any = Number(status.value)

            if (amount === 0) {
                refAmount?.current?.focus();
                refAmount?.current?.select();
                setWalletStatus({ ...walletStatus, err: "Please input amount" });
                return
            }
            if (amount > status.balance) {
                refAmount?.current?.focus();
                refAmount?.current?.select();
                setWalletStatus({ ...walletStatus, err: "You haven't enough balance" });
                return
            }
            if (status.fee === 0) {
                refAmount?.current?.focus();
                refAmount?.current?.select();
                setWalletStatus({ ...walletStatus, err: "Incorrect transaction fee." });
                return
            }
            if (amount < status.fee) {
                refAmount?.current?.focus();
                refAmount?.current?.select();
                setWalletStatus({ ...walletStatus, err: "The network fee is higher than the swap amount." });
                return
            }

            if (status.token === status.targetChain || status.targetChain !== SYMBOL && !targetNet.tokens[status.token].pegging) {
                set({ loading: true, submitLabel: 'checking store balance...' })
                const storeBalance: any = await getBalance(status.targetChain, status.token, targetNet.bridge)
                if (amount > storeBalance) {
                    setWalletStatus({ ...walletStatus, err: "Sorry, there is not enough balance in the bridge store." })
                    set({ loading: false, submitLabel: 'SUBMIT' })
                    return
                }
            }
            const provider_: any = new ethers.providers.JsonRpcProvider(net.rpc)
            const provider: any = new ethers.providers.Web3Provider(web3Provider.provider);

            const contract: any = new ethers.Contract(net.bridge, [
                "function deposit(address target, address token, uint amount, uint targetChain) external payable"
            ], provider_)

            const value: any = ethers.utils.parseUnits(status.value, token ? token.decimals : 18)
            const created: any = Math.round(new Date().getTime() / 1000)
            const target: any = walletStatus.address;

            if (token !== undefined) { // if it is token, need to approve 
                const tokenContract: any = new ethers.Contract(token.contract, [
                    "function allowance(address account, address spender) public view returns (uint256)",
                    "function approve(address spender, uint256 amount) public returns (bool)"
                ], provider)
                set({ loading: true, submitLabel: 'checking allowance...' })
                const approval: any = await tokenContract.allowance(walletStatus.address, net.bridge)
                if (approval.lt(value)) {
                    set({ loading: true, submitLabel: 'approve bridge...' })
                    const unsignedTx: any = await tokenContract.populateTransaction.approve(net.bridge, value.toHexString());
                    const tx: any = {
                        ...unsignedTx,
                        from: walletStatus.address,
                        value: '0x00',
                        chainId: ethers.utils.hexlify(net.chainId), // Used to prevent transaction reuse across blockchains. Auto-filled by MetaMask.
                    };
                    const txHash: any = await web3Provider.provider.request({
                        method: 'eth_sendTransaction',
                        params: [tx],
                    });
                    await waitTx(status.chain, txHash)
                }
                set({ loading: true, submitLabel: 'depositing...' })
                const unsignedTx: any = await contract.populateTransaction.deposit(target, token.contract, value.toHexString(), targetNet.chainId);
                const tx: any = {
                    ...unsignedTx,
                    from: walletStatus.address,
                    value: '0x00',
                    chainId: ethers.utils.hexlify(net.chainId),
                };
                const txId: any = await web3Provider.provider.request({
                    method: 'eth_sendTransaction',
                    params: [tx],
                });
                addTx({ txId, chain: status.chain, targetChain: status.targetChain, address: walletStatus.address, token: status.token, value: Number(status.value), updated: 0, created })
                await waitTx(status.chain, txId)
            } else {  // if it is native token, no need to approve 
                set({ loading: true, submitLabel: 'depositing...' })
                const unsignedTx = await contract.populateTransaction.deposit(target, ZERO, value.toHexString(), targetNet.chainId);
                const tx = {
                    ...unsignedTx,
                    from: walletStatus.address,
                    value: value.toHexString(),
                    chainId: ethers.utils.hexlify(net.chainId),
                };
                const txId = await web3Provider.provider.request({
                    method: 'eth_sendTransaction',
                    params: [tx],
                });
                addTx({ txId, chain: status.chain, targetChain: status.targetChain, address: walletStatus.address, token: status.token, value: Number(status.value), updated: 0, created })
                await waitTx(status.chain, txId)
            }
            set({ loading: false })
        } catch (error: any) {
            if (error.code === 4001) {
                setWalletStatus({ ...walletStatus, err: ERR_CANCELLED })
            } else {
                setWalletStatus({ ...walletStatus, err: error.message })
            }
            set({ loading: false })
        }
    }

    const pendingTxs: Array<any> = [];
    const targetToken = networks[status.targetChain].tokens[status.token]
    const supported = targetToken !== undefined

    // const status.chain = status.chain
    const network = networks[status.chain]
    const erc20 = network.erc20;
    // const tokens = network.tokens
    const query = status.query.toLowerCase();


    // for(let k in G.pending) {
    // 	pendingTxs.push({key:k, ...G.pending[k]})
    // }
    // pendingTxs.sort((a,b)=>b.created - a.created)

    return (
        <div className='root dark-theme' style={{ background: `url(${ImgBack})`, backgroundColor: 'black', backgroundRepeat: 'no-repeat', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className='container md'>
                <header className='flex middle justify'>
                    <img src="/nextep.png" className='header-logo' alt="title" />
                    {/* {walletStatus.address ? <span style={{ color: '#35ff35' }}>{`${walletStatus.address.slice(0, 10)}......${walletStatus.address.slice(-4)}`}</span> : <button className='btn button' onClick={() => connect()}>CONNECT WALLET</button>} */}
                    <ConnectWalletButton img={"Wallet"} styleNames={"wallet-connect-btn"} styleP={""} />

                </header>
                <main>
                    {/* <div className='mt-2 mb-1 flex center'>
						<svg width="173" height="36" viewBox="0 0 173 36" fill="#8B66F5">
							<path d="M0.648438 0.24658H21.8484L26.6984 5.09658V14.8966L24.5484 17.0466L28.2484 20.7466V29.9966L22.9984 35.2466H0.648438V0.24658ZM18.9484 15.2966L20.9984 13.2466V7.14658L18.9984 5.14658H6.29844V15.2966H18.9484ZM20.1484 30.3466L22.5484 27.9466V22.3466L20.1484 19.9966H6.29844V30.3466H20.1484ZM60.3539 23.9466V35.2466H54.5539V25.3466L50.9539 21.3966H39.5539V35.2466H33.7539V0.24658H55.0539L60.1539 5.39658V16.1466L56.5039 19.7966L60.3539 23.9466ZM39.5539 16.5966H52.4539L54.4539 14.5966V7.14658L52.4539 5.14658H39.5539V16.5966ZM67.3535 0.24658H73.1535V35.2466H67.3535V0.24658ZM80.3848 0.24658H102.035L107.885 6.09658V29.3966L102.035 35.2466H80.3848V0.24658ZM99.2348 30.2466L102.085 27.4466V8.04658L99.2348 5.24658H86.1848V30.2466H99.2348ZM113.869 29.5966V5.89658L119.519 0.24658H136.219L141.769 5.79658V10.3966H135.969V7.84658L133.319 5.24658H122.519L119.669 8.04658V27.4466L122.519 30.2466H133.319L136.119 27.4966V21.1466H128.469V16.1466H141.769V29.5966L136.119 35.2466H119.519L113.869 29.5966ZM147.768 0.24658H172.168V5.19658H153.568V15.1966H170.718V20.0966H153.568V30.2966H172.168V35.2466H147.768V0.24658Z"/>
						</svg>
					</div> */}
                    <h1 className='mt-1'>BRIDGE</h1>
                    <h4>Bridge your tokens with no additional fees</h4>
                    <div className="swap form mt-3 p-3">
                        <div className="networks">
                            <div style={{ width: '40%' }}>
                                <div className='title'>
                                    FROM CHAIN
                                </div>
                                <div className='chainicon text-center mb-2'>
                                    {status.chain === SYMBOL ? <img src="/nxchain.png" width={80} height={80} alt={SYMBOL} /> : <img src={`/networks/${status.chain}.svg`} width={80} height={80} alt={status.chain} />}
                                </div>
                                <div>
                                    {status.chain === SYMBOL ? (
                                        <InputCombo value={status.chain} data={[{ key: SYMBOL, label: networks[SYMBOL].label, icon: '/nxchain.png' }]} />
                                    ) : (
                                        <InputCombo value={status.chain} data={chains} onChange={onChangeNetwork} />
                                    )}

                                </div>
                            </div>
                            <div className="flex center" style={{ paddingLeft: 20, paddingRight: 20 }}>
                                <button className="switch" onClick={() => swapChains()}>
                                    <svg viewBox="0 0 19 15" fill="#D873E1" width={19} height={15} style={{ transform: 'rotate(-45deg)' }}>
                                        <path d="M12.1182 0.357178L17.8707 6.10957C18.4921 6.73097 18.4921 7.73846 17.8707 8.35986L12.1907 14.0398L9.94046 11.7895L12.904 8.82591H0.963135V5.64352H12.904L9.86787 2.60747L12.1182 0.357178Z" />
                                    </svg>
                                </button>
                            </div>
                            <div style={{ width: '40%' }}>
                                <div className='title'>
                                    TO CHAIN
                                </div>
                                <div className='chainicon text-center mb-2'>
                                    {status.targetChain === SYMBOL ? <img src="/nxchain.png" width={80} height={80} alt={SYMBOL} /> : <img src={`/networks/${status.targetChain}.svg`} width={80} height={80} alt={status.chain} />}
                                </div>
                                <div>
                                    {status.targetChain === SYMBOL ? (
                                        <InputCombo value={status.targetChain} data={[{ key: SYMBOL, label: networks[SYMBOL].label, icon: '/nxchain.png' }]} />
                                    ) : (
                                        <InputCombo value={status.targetChain} data={chains} onChange={onChangeNetwork} />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className='tokens p-1 mt-2' style={{ backgroundColor: 'rgb(43, 47, 54)' }}>
                            <button className='btn full pl-1 pr-1 flex middle justify' style={{ width: '50%', backgroundColor: 'var(--bg-body)' }} onClick={() => showTokens()}>
                                {status.token === '' ? 'Select Token' : (
                                    <div className='flex middle gap'>
                                        <div style={{ width: 24, height: 24, position: 'relative' }}>
                                            <img src={status.token === SYMBOL ? '/nxchain.png' : (status.chain === status.token ? `/networks/${status.chain}.svg` : `/coins/${status.token}.svg`)} width={24} height={24} alt={status.token} />
                                            {status.chain !== status.token && <img src={status.chain === SYMBOL ? '/nxchain.png' : `/networks/${status.chain}.svg`} width={16} height={16} style={{ position: 'absolute', bottom: -5, left: -5 }} alt={status.chain} />}
                                        </div>

                                        {status.token} ({status.chain === status.token ? 'Native Coin' : networks[status.chain].erc20})
                                    </div>
                                )}
                                <svg fill="currentColor" viewBox="0 0 16 16" height="12" width="12">
                                    <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                                </svg>
                            </button>
                            <div style={{ width: '50%' }}>
                                <input ref={refAmount} onFocus={e => e.target.select()} className="amount" type="number" value={status.value} onChange={(e) => onChangeValue(e.target.value)} />
                            </div>
                        </div>
                        {status.value !== '' && status.fee && status.token ? (
                            <p className="gray">You will receive ≈ {status.receiveValue} {status.token} <small>({status.token === status.targetChain ? 'native token' : networks[status.targetChain].erc20})</small>, network fee ≈ {status.fee}</p>
                        ) : null}
                        <div style={{ paddingTop: 20 }}>
                            <button disabled={status.loading} className="btn button full" onClick={submit}>
                                {status.loading ? (
                                    <div className="flex center " style={{ color: 'black' }}>
                                        <div style={{ width: '1.5em' }}>
                                            <div className="loader">Loading...</div>
                                        </div>
                                        <div>{status.submitLabel}</div>
                                    </div>) : (walletStatus.status === CONNECTED ? 'SUBMIT' : 'CONNECT WALLET')
                                }
                            </button>
                            <div className='mt-1'>
                                {walletStatus.err && <p style={{ color: 'red', backgroundColor: '#2b2f36', padding: 10 }}>{walletStatus.err}</p>}
                            </div>
                        </div>
                        {txs.length ? (
                            <div style={{ paddingTop: 20 }}>
                                <p><b className="label">Recent transactions:</b></p>
                                <div className='scroll' style={{ maxHeight: 300 }}>
                                    {txs.map((v, k) => (
                                        <div className={"tx flex" + (v.receivedAmount === undefined ? ' pending' : '')} key={k}>
                                            <div className="c1">
                                                <img src={v.chain === SYMBOL ? '/nxchain.png' : `/networks/${v.chain}.svg`} style={{ width: 16, height: 16, marginRight: 5 }} alt={v.chain} />
                                                <span>To</span>
                                                <img src={v.targetChain === SYMBOL ? '/nxchain.png' : `/networks/${v.targetChain}.svg`} style={{ width: 16, height: 16, marginLeft: 5 }} alt={v.targetChain} />
                                            </div>
                                            <code className="c2"><a className="cmd" href={networks[v.chain].explorer + '/tx/' + v.txId} target="_blank" rel="noreferrer" >{v.txId.slice(0, 10) + '...' + v.txId.slice(-4)}</a></code>
                                            <code className="c3">
                                                <img src={`/coins/${v.token}.svg`} loading='lazy' style={{ width: 20, height: 20, marginRight: 5 }} alt={v.token} />
                                                <span>{v.value}</span>
                                            </code>
                                            {/* <div className="c4" style={{textAlign:"right"}}>
											{v.receivedAmount===undefined && <code style={{color:'#76808f'}}>Pending...</code>}
										</div> */}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <p className='mt-3 gray text-center'>Powered by Nxchain Link</p>
                    </div>
                    {tokens.show && walletStatus.address && <DialogTokens chain={status.chain} data={tokens.data} address={walletStatus.address} onChange={onChangeToken} onClose={() => setTokens({ ...tokens, show: false })} walletStatus={walletStatus} setWalletStatus={() => setWalletStatus} />}
                </main>
            </div>
        </div>
    )
};

export default Home;