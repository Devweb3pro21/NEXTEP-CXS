import React, {
    createContext,
    useContext,
    useReducer,
    useMemo,
    useCallback,
    useEffect,
} from "react";
import { ethers } from "ethers";

import { providerOptions } from "../const";

import { delay, handleAlert, toBigNum, fromBigNum } from "../utils";
import { NotificationManager } from "react-notifications";

const locales = {
    "usa": require('../locales/en-US.json'),
    "france": require('../locales/fr-FR.json'),
};

const BlockchainContext = createContext();

export function useBlockchainContext() {
    return useContext(BlockchainContext);
}

function reducer(state, { type, payload }) {
    return {
        ...state,
        [type]: payload,
    };
}


const INIT_STATE = {
    lang: "usa",
    L: locales["usa"],
    signer: "",
    amount: 0,
    web3Provider: null,
    address: '',
    chainId: '',
};

export default function Provider({ children }) {
    const [state, dispatch] = useReducer(reducer, INIT_STATE);

    return (
        <BlockchainContext.Provider
            value={useMemo(
                () => [
                    state,
                    {
                        dispatch
                    }
                ],
                [state]
            )}>
            {children}
        </BlockchainContext.Provider>
    );
}
