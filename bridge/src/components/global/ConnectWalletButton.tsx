import Web3Modal from "web3modal";
import { ethers } from "ethers";
import { providerOptions } from "../../const";
import { useEffect, useState } from "react";
import { toHex } from "../../utils";
// import Wallet from "../../Assets/images/Vector (8).svg";
import { useBlockchainContext } from '../../context';
const web3Modal = new Web3Modal({
    cacheProvider: true, // optional
    providerOptions, // required
});
const isTestnet = process.env.REACT_APP_TESTNET || 1;
const ConnectButton = ({ styleNames, img, styleP }: any) => {
    const [account, setAccount] = useState<any>('');
    const [library, setLibrary] = useState<any>('');
    const [chainId, setChainId] = useState<any>('');

    const [state, { dispatch }] = useBlockchainContext();
    var styledAddress = account
        ? account.slice(0, 4) + "..." + account.slice(-4)
        : "";

    const connectWallet = async () => {
        try {
            const provider = await web3Modal.connect();
            provider.on("accountsChanged", async (accounts: any) => {
                if (accounts.length == 0) {
                    await web3Modal.clearCachedProvider();
                    refreshState();
                }
            })
            const library = new ethers.providers.Web3Provider(provider);
            const accounts = await library.listAccounts();
            const network = await library.getNetwork();
            setLibrary(library);
            if (accounts) {
                dispatch({
                    type: "address",
                    payload: accounts[0]
                })
                dispatch({
                    type: "chainId",
                    payload: network.chainId
                })
                dispatch({
                    type: "web3Provider",
                    payload: library
                })
                dispatch({
                    type: "signer",
                    payload: library?.getSigner()
                })

                setAccount(accounts[0]);
            }
            setChainId(network.chainId);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        // First Binance network
        if (isTestnet) {
            if (chainId != "97") {
                switchNetwork("97");
            }
        } else {
            if (chainId != "56") {
                switchNetwork("56");
            }
        }
    }, [account])

    useEffect(() => {
        setAccount(state.address);
    }, [state.address])

    const switchNetwork = async (network: any) => {
        try {
            await library.provider.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: toHex(network) }],
            });
        } catch (switchError: any) {
            if (switchError.code === 4902) {
                try {
                    await library.provider.request({
                        method: "wallet_addEthereumChain",
                        params: [
                            {
                                chainId: toHex("137"),
                                chainName: "Polygon",
                                rpcUrls: ["https://polygon-rpc.com/"],
                                blockExplorerUrls: ["https://polygonscan.com/"],
                            },
                        ],
                    });
                } catch (addError) {
                    throw addError;
                }
            }
        }
    };

    useEffect(() => {
        if (web3Modal.cachedProvider) {
            connectWallet();
        }
    }, []);

    const refreshState = () => {
        setAccount("");
    };

    const disconnect = async () => {
        await web3Modal.clearCachedProvider();
        dispatch({
            type: "address",
            payload: ""
        })
        // refreshState();
    }

    return (
        <>
            {!account ? (
                <button
                    className={styleNames}
                    onClick={connectWallet}
                >
                    <p className={styleP} style={{ color: 'black' }}>
                        Connect Wallet
                        {/* {state.L['connect']} */}
                    </p>
                </button>
            ) : (
                <button
                    className={styleNames}
                    onClick={disconnect}
                >

                    <p className="" style={{ color: 'black' }}>
                        {styledAddress}
                    </p>
                </button>
            )}
        </>
    )
}

export default ConnectButton;